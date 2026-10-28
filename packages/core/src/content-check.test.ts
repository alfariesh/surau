import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, onTestFinished, test } from "vite-plus/test";

import { pageId, tocNodeId } from "@surau/db";

import {
  AYAH_REF,
  BODY_2,
  ED,
  PASSAGES,
  T_LONG,
  T_LONG_CHILD,
  T_ROOT,
  longBody,
  longPassageId,
  seedCore,
} from "../test/fixture.ts";
import {
  checkContentDraft,
  contentDraftSha256,
  listFaedahCandidates,
  readinessIssues,
} from "./content-check.ts";
import {
  CONTENT_FORMAT,
  CONTENT_RULES,
  faedahCandidates,
  contentCheck,
  contentDraft,
} from "./content-schema.ts";
import type { ContentCheck } from "./content-schema.ts";

const db = env.CORPUS;
const NOW = () => new Date("2026-10-28T08:00:00.000Z");

// Teks Indonesia BUATAN (bukan isi kitab). Panjang disesuaikan standar docs/09.
const INTI =
  "Menurut penulis, keutamaan sesuatu diukur dari kesempurnaannya, dan karena itu ilmu menempati derajat yang paling tinggi.";
const RINGKASAN =
  "Penulis membuka bab dengan menimbang apa yang membuat sesuatu disebut utama. Ia membedakan kelebihan yang menyempurnakan sesuatu dari kelebihan yang hanya menambah ukuran. Dari sana ia menyimpulkan bahwa ilmu utama pada dirinya sendiri dan juga menjadi jalan menuju kebahagiaan akhirat. Bagian akhir menempatkan pengajaran ilmu sesudah kenabian.";
const ISI =
  "Penulis menjelaskan bahwa ilmu menjadi dasar amal dan menuntun hati menuju kedekatan kepada Allah Swt. serta menjauhkan murid dari sifat sombong yang merusak niat belajar.";

/** Paragraf bagian T_LONG (fixture buatan) untuk dasar dan kutipan. */
const B11 = longPassageId(1, 1);
const B12 = longPassageId(1, 2);
const B13 = longPassageId(1, 3);
const B21 = longPassageId(2, 1);
const SENT = "هذه جملة تجريبية لاختبار تقسيم الأقسام الطويلة ";
/** Kalimat terakhir paragraf 1-1 sampai sebelum penanda catatan kaki: batas kata utuh. */
const QUOTE_11 = (() => {
  const text = longBody(1, 1);
  return { start: SENT.length * 9, end: text.indexOf(" (١)") };
})();

const ASAL = {
  pembuat: "claude-desktop",
  model: "claude-opus-5-5",
  plugin: "surau-redaksi@0.1.0",
  skill: "intisari-bab@1",
  operator: "pemilik",
  dibuat: "2026-10-28T07:00:00+07:00",
} as const;

function gagasan(judul: string, dasar: number[], tanya: string) {
  return {
    judul,
    isi: ISI,
    sikap: "author",
    jenis: "idea",
    dasar,
    soal: { tanya, jawab: "Karena ilmu menyempurnakan manusia dan menuntun amalnya." },
  };
}

function babDraft(overrides: Record<string, unknown> = {}) {
  return {
    format: CONTENT_FORMAT,
    jenis: "intisari-bab",
    edition_id: ED,
    section_id: T_LONG,
    versi: 1,
    status: "draf",
    isi: {
      inti: INTI,
      ringkasan: RINGKASAN,
      gagasan: [
        gagasan(
          "Keutamaan diukur dari kesempurnaan, bukan ukuran, menurut penulis",
          [B11],
          "Apa ukuran keutamaan sesuatu menurut bab ini?",
        ),
        gagasan(
          "Menurut al-Ghazali, ilmu utama pada dirinya dan jalan akhirat",
          [B12, B13],
          "Mengapa ilmu dicari karena dirinya sendiri?",
        ),
        gagasan(
          "Al-Ghazali menempatkan pengajaran sesudah kenabian",
          [B21],
          "Menurut al-Ghazali, pekerjaan apa yang paling mulia sesudah kenabian?",
        ),
      ],
      kutipan: [
        {
          gagasan: 1,
          passage_id: B11,
          char_start: QUOTE_11.start,
          char_end: QUOTE_11.end,
          terjemahan: "Ini kalimat contoh untuk menguji pemotongan bagian yang panjang.",
        },
      ],
      istilah: [] as string[],
    },
    asal: ASAL,
    ...overrides,
  };
}

const codes = (r: ContentCheck) => r.errors.map((e) => e.code);

beforeAll(async () => {
  await seedCore(db);
  const T = (text: string, id: number) =>
    db
      .prepare(
        `INSERT INTO translation (passage_id, lang, text, model, prompt_version, created_at)
         VALUES (?, 'id', ?, 'model-uji', 'translate-passage@2', '2026-10-17')`,
      )
      .bind(id, text);
  const LONG_T =
    "Penulis menjelaskan bahwa orang yang menuntut ilmu dengan niat yang lurus akan dimudahkan jalannya, sebab ilmu itu cahaya yang menerangi hati dan amal.";
  await db.batch([
    T(LONG_T, B12),
    T(LONG_T, B13),
    T("Terlalu pendek.", B21),
    db.prepare(
      `INSERT INTO glossary_term (term_key, lang, label, gloss, model, prompt_version, created_at)
         VALUES ('ilmu', 'id', 'ilmu', 'Pengetahuan yang benar.', 'model-uji', 'glossary-gloss@1', '2026-10-24')`,
    ),
    // Intisari lama T_LONG: gagasan 1 = pendapat yang dibantah, berjangkar ke B13 (Faedah ditolak).
    db
      .prepare(
        `INSERT INTO digest (toc_node_id, lang, tier, basis, abstract, source_sha256, model,
           prompt_version, created_at)
         VALUES (?1, 'id', 'section', 'text', 'Abstrak contoh yang cukup panjang untuk lolos.', ?2,
           'model-uji', 'digest-section@2', '2026-10-24')`,
      )
      .bind(T_LONG, "a".repeat(64)),
    db
      .prepare(
        `INSERT INTO digest_point (toc_node_id, lang, ord, kind, stance, title, body)
         VALUES (?1, 'id', 1, 'idea', 'refuted', 'Pendapat yang dibantah', 'Isi contoh.')`,
      )
      .bind(T_LONG),
    db
      .prepare(
        `INSERT INTO digest_anchor (toc_node_id, lang, point_ord, seq, passage_id, char_start, char_end)
         VALUES (?1, 'id', 1, 1, ?2, 0, 10)`,
      )
      .bind(T_LONG, B13),
  ]);
});

describe("checkContentDraft: Intisari Bab", () => {
  test("draf baik lolos, dicap, dan sidiknya stabil", async () => {
    const r = await checkContentDraft(db, babDraft(), NOW);
    expect(contentCheck.parse(r)).toEqual(r);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.kind).toBe("intisari-bab");
    expect(r.section?.id).toBe(T_LONG);
    expect(r.stamp).toEqual({
      aturan: CONTENT_RULES,
      lolos: true,
      sumber_sha256: r.facts?.source_sha256,
      draf_sha256: r.facts?.draft_sha256,
      waktu: "2026-10-28T08:00:00.000Z",
    });
    // Cakupan rendah (4 dari 48 paragraf) hanya peringatan.
    expect(r.warnings.map((w) => w.code)).toContain("low_coverage");
    expect(r.facts?.anchored_passages).toBe(4);
    // Sidik isi tidak bergantung status, asal, atau urutan kunci.
    const again = await checkContentDraft(db, { ...babDraft(), status: "siap" }, NOW);
    expect(again.facts?.draft_sha256).toBe(r.facts?.draft_sha256);
  });

  test("skema: jenis dan bentuk salah ditolak tanpa melempar", async () => {
    const r = await checkContentDraft(db, { format: "lain", jenis: "artikel" });
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain("schema");
    expect(r.facts).toBeNull();
  });

  test("teks: huruf Arab, fatwa, judul meta, dan judul monoton ditolak", async () => {
    const d = babDraft();
    const g = d.isi.gagasan;
    g[0] = { ...g[0]!, isi: `${ISI} Ia mengutip نص tanpa alamat.` };
    g[1] = { ...g[1]!, judul: "Al-Ghazali menjelaskan tujuan bab ini" };
    g[2] = { ...g[2]!, isi: `${ISI} Hukumnya adalah wajib bagi Anda.` };
    const r = await checkContentDraft(db, d);
    expect(r.ok).toBe(false);
    expect(codes(r)).toEqual(
      expect.arrayContaining(["arabic", "fatwa", "address", "meta_title", "monotone_titles"]),
    );
    expect(r.stamp).toBeNull();
  });

  test("inti dibuka pembuka topik datar ditolak", async () => {
    const d = babDraft();
    d.isi.inti =
      "Bagian ini membahas keutamaan ilmu, pengajaran, dan pembelajaran melalui bukti akal yang disusun penulis.";
    expect(codes(await checkContentDraft(db, d))).toContain("topic_opener");
  });

  test("dasar di luar bagian, kutipan memotong kata, dan istilah asing ditolak", async () => {
    const d = babDraft();
    d.isi.gagasan[0]!.dasar = [PASSAGES.body1];
    d.isi.kutipan[0]!.char_start = QUOTE_11.start + 2;
    d.isi.istilah = ["ilmu", "tidak-ada"];
    const r = await checkContentDraft(db, d);
    expect(codes(r)).toEqual(
      expect.arrayContaining(["outside_section", "quote_boundary", "unknown_term"]),
    );
    expect(r.errors.filter((e) => e.code === "unknown_term")).toHaveLength(1);
  });

  test("kutipan riwayat bertakhrij tanpa asal ditolak", async () => {
    const foot = longPassageId(1, 5);
    const old = await db.prepare("SELECT text_raw FROM passage WHERE id = ?").bind(foot).first();
    await db.prepare("UPDATE passage SET text_raw = '(١) لا أصل له' WHERE id = ?").bind(foot).run();
    onTestFinished(async () => {
      await db
        .prepare("UPDATE passage SET text_raw = ? WHERE id = ?")
        .bind(String(old?.text_raw), foot)
        .run();
    });
    expect(codes(await checkContentDraft(db, babDraft()))).toContain("quote_weak_report");
  });

  test("kutipan yang menyentuh ayat ditolak; Kitab bukan intisari-bab", async () => {
    const d = babDraft({ section_id: T_ROOT });
    d.isi.gagasan.forEach((g) => (g.dasar = [PASSAGES.body2]));
    d.isi.kutipan[0] = {
      gagasan: 1,
      passage_id: PASSAGES.body2,
      char_start: AYAH_REF.char_start,
      char_end: BODY_2.length,
      terjemahan: "Terjemahan contoh kutipan pendek.",
    };
    const r = await checkContentDraft(db, d);
    expect(codes(r)).toContain("quote_ayah");
    expect(codes(await checkContentDraft(db, babDraft({ section_id: T_LONG_CHILD })))).toContain(
      "wrong_tier",
    );
  });

  test("bagian tidak ada", async () => {
    const r = await checkContentDraft(db, babDraft({ section_id: tocNodeId(ED, 999) }));
    expect(codes(r)).toEqual(["unknown_section"]);
  });
});

describe("checkContentDraft: Faedah dan Jalur", () => {
  const faedah = (butir: { passage_id: number }[]) => ({
    format: CONTENT_FORMAT,
    jenis: "faedah",
    edition_id: ED,
    section_id: T_LONG,
    status: "draf",
    isi: {
      butir: butir.map((b) => ({
        ...b,
        judul: "Niat yang lurus memudahkan jalan ilmu",
        konteks: "Penulis menulis ini ketika menjelaskan hubungan niat dengan keberkahan belajar.",
        tema: ["ilmu", "niat"],
      })),
    },
    asal: { ...ASAL, skill: "faedah@1" },
  });

  test("paragraf layak lolos; dibantah, tanpa terjemahan, dan bercatatan kaki ditolak", async () => {
    expect((await checkContentDraft(db, faedah([{ passage_id: B12 }]))).ok).toBe(true);
    const r = await checkContentDraft(
      db,
      faedah([{ passage_id: B13 }, { passage_id: B21 }, { passage_id: B11 }]),
    );
    expect(codes(r)).toEqual(
      expect.arrayContaining([
        "faedah_not_author",
        "faedah_translation_length",
        "faedah_footnote",
        "faedah_no_translation",
      ]),
    );
  });

  test("judul berjanji ditolak", async () => {
    const d = faedah([{ passage_id: B12 }]);
    d.isi.butir[0]!.judul = "Rahasia agar hati tenang";
    expect(codes(await checkContentDraft(db, d))).toContain("promise");
  });

  test("Jalur: tujuh hari ke bagian Kitab yang punya Intisari", async () => {
    const kids = Array.from({ length: 7 }, (_, i) => tocNodeId(ED, 40 + i));
    await db.batch([
      ...kids.map((id, i) =>
        db
          .prepare(
            `INSERT INTO toc_node (id, edition_id, parent_id, ord, level, title_ar, start_page_id)
             VALUES (?, ?, ?, ?, 3, 'باب تجريبي', ?)`,
          )
          .bind(id, ED, T_LONG_CHILD, i + 1, pageId(ED, 10)),
      ),
      ...kids.slice(0, 6).flatMap((id) => [
        db
          .prepare(
            `INSERT INTO digest (toc_node_id, lang, tier, basis, abstract, source_sha256, model,
               prompt_version, created_at)
             VALUES (?1, 'id', 'section', 'text', 'Abstrak contoh.', ?2, 'm', 'p', '2026-10-24')`,
          )
          .bind(id, "b".repeat(64)),
        db
          .prepare(
            `INSERT INTO digest_point (toc_node_id, lang, ord, kind, stance, title, body)
             VALUES (?1, 'id', 1, 'idea', 'author', 'Judul', 'Isi.')`,
          )
          .bind(id),
        db
          .prepare(
            `INSERT INTO digest_anchor (toc_node_id, lang, point_ord, seq, passage_id, char_start, char_end)
             VALUES (?1, 'id', 1, 1, ?2, 0, 5)`,
          )
          .bind(id, longPassageId(8, 2)),
      ]),
    ]);
    const jalur = {
      format: CONTENT_FORMAT,
      jenis: "jalur",
      edition_id: ED,
      section_id: T_LONG_CHILD,
      status: "draf",
      isi: {
        slug: "tujuh-hari-uji",
        judul: "Tujuh hari bersama Kitab Uji",
        deskripsi:
          "Tujuh bab Kitab Uji dibaca satu per hari, masing-masing lewat Intisari dan tautan ke teks lengkapnya, dengan pengantar singkat tentang isi bab.",
        hari: kids.map((section_id, i) => ({
          hari: i + 1,
          section_id,
          pengantar:
            "Hari ini membaca bab yang menjelaskan hubungan ilmu dengan amal menurut penulis.",
        })),
      },
      asal: { ...ASAL, skill: "jalur@1" },
    };
    const r = await checkContentDraft(db, jalur);
    expect(r.errors.map((e) => [e.code, e.path])).toEqual([
      ["day_without_digest", "isi.hari[6].section_id"],
    ]);
    const wrong = await checkContentDraft(db, { ...jalur, section_id: T_ROOT });
    expect(codes(wrong)).toEqual(expect.arrayContaining(["wrong_tier", "outside_kitab"]));
  });
});

describe("contentDraftSha256 dan listFaedahCandidates", () => {
  test("sidik isi berubah bila isi berubah", async () => {
    const a = await checkContentDraft(db, babDraft());
    const d = babDraft();
    d.isi.inti = `${INTI.slice(0, -1)} dan amal.`;
    const b = await checkContentDraft(db, d);
    expect(a.facts?.draft_sha256).not.toBe(b.facts?.draft_sha256);
    expect(await contentDraftSha256(contentDraft.parse(babDraft()))).toBe(a.facts?.draft_sha256);
  });

  test("hanya calon layak, dengan terjemahan berlabel dan alasan bila diminta", async () => {
    const eligible = await listFaedahCandidates(db, { section_id: T_LONG });
    expect(faedahCandidates.parse(eligible)).toEqual(eligible);
    expect(eligible.candidates.map((c) => c.passage_id)).toEqual([B12]);
    expect(eligible.candidates[0]?.translation?.label).toBe("ai_translation");
    const all = await listFaedahCandidates(db, {
      section_id: T_LONG,
      include_ineligible: true,
      limit: 5,
    });
    expect(all.total).toBeGreaterThan(5);
    expect(all.next_offset).toBe(5);
    expect(all.candidates.find((c) => c.passage_id === B13)?.reasons).toContain(
      "faedah_not_author",
    );
  });
});

describe("checkContentDraft: Intisari Kitab dan aturan tambahan (peninjau X22)", () => {
  const LONG_ISI = `${ISI} ${ISI} Penulis menutup uraian ini dengan menegaskan bahwa ilmu menjadi jalan menuju kedekatan kepada Allah Swt.`;
  const kids = [tocNodeId(ED, 60), tocNodeId(ED, 61)];
  const kitab = (bab: (i: number) => number[]) => ({
    format: CONTENT_FORMAT,
    jenis: "intisari-kitab",
    edition_id: ED,
    section_id: T_LONG_CHILD,
    status: "draf",
    isi: {
      inti: INTI,
      pembuka: RINGKASAN,
      ringkasan: RINGKASAN,
      gagasan: [1, 2, 3, 4, 5].map((n, i) => ({
        judul: `Gagasan besar ke-${n} tentang ilmu dan amal, menurut penulis`,
        isi: LONG_ISI,
        sikap: "author",
        jenis: "idea",
        bab: bab(i),
        dasar: [longPassageId(7 + i, 2)],
        soal: {
          tanya: `Apa isi gagasan besar ke-${n} dalam kitab ini?`,
          jawab: "Ilmu menuntun amal dan hati.",
        },
      })),
      kutipan: [] as never[],
      istilah: [] as string[],
      penutup:
        "Penulis mengajak pembaca kembali membaca bab-bab kitab ini secara utuh dan perlahan bersama guru yang dipercaya.",
    },
    asal: { ...ASAL, skill: "intisari-kitab@1" },
  });

  beforeAll(async () => {
    await db.batch(
      kids.map((id, i) =>
        db
          .prepare(
            `INSERT INTO toc_node (id, edition_id, parent_id, ord, level, title_ar, start_page_id)
             VALUES (?, ?, ?, ?, 3, 'باب تجريبي', ?)`,
          )
          .bind(id, ED, T_LONG_CHILD, 10 + i, pageId(ED, 10)),
      ),
    );
  });

  test("Kitab baik lolos; Bab anak tak dirujuk dan bab di luar Kitab ditolak", async () => {
    // Semua anak langsung Kitab (termasuk bab dari tes Jalur di berkas ini) dirujuk gagasan 1.
    const { results } = await db
      .prepare("SELECT id FROM toc_node WHERE parent_id = ? ORDER BY id")
      .bind(T_LONG_CHILD)
      .all();
    const all = results.map((r) => Number(r.id));
    const good = await checkContentDraft(
      db,
      kitab((i) => (i === 0 ? all.slice(0, 10) : [kids[i % 2]!])),
    );
    expect(good.errors).toEqual([]);
    expect(good.facts?.reading_minutes).toBeGreaterThan(0);
    const bad = await checkContentDraft(
      db,
      kitab((i) => (i === 0 ? [T_ROOT] : [kids[0]!])),
    );
    expect(codes(bad)).toEqual(expect.arrayContaining(["outside_kitab", "uncovered_chapter"]));
    const few = kitab(() => [kids[0]!, kids[1]!]);
    few.isi.gagasan = few.isi.gagasan.slice(0, 3);
    few.isi.pembuka =
      "Kitab ini dijamin mengubah hidup pembaca dalam waktu singkat dan penuh berkah bagi semua yang membacanya dengan sungguh-sungguh setiap hari tanpa henti sampai akhir hayat mereka nanti di dunia ini.";
    expect(codes(await checkContentDraft(db, few))).toEqual(
      expect.arrayContaining(["point_count", "promise"]),
    );
  });

  test("inti dengan singkatan saw. tetap satu kalimat; dua kalimat ditolak; jumlah gagasan Bab", async () => {
    const d = babDraft();
    d.isi.inti =
      "Menurut al-Ghazali, sabda Nabi saw. menempatkan pengajaran ilmu sebagai pekerjaan yang paling mulia sesudah kenabian.";
    expect(codes(await checkContentDraft(db, d))).not.toContain("not_one_sentence");
    d.isi.inti = `${INTI} Ini kalimat kedua yang menambah keterangan lain.`;
    expect(codes(await checkContentDraft(db, d))).toContain("not_one_sentence");
    const one = babDraft();
    one.isi.gagasan = one.isi.gagasan.slice(0, 1);
    one.isi.kutipan = [];
    expect(codes(await checkContentDraft(db, one))).toContain("point_count");
  });

  test("Faedah: tema bukan huruf kecil Latin ditolak; paragraf tak dijangkar = sikap belum dicek", async () => {
    const d = {
      format: CONTENT_FORMAT,
      jenis: "faedah",
      edition_id: ED,
      section_id: T_LONG,
      status: "draf",
      isi: {
        butir: [
          {
            passage_id: B12,
            judul: "Niat yang lurus memudahkan jalan ilmu",
            konteks:
              "Penulis menulis ini ketika menjelaskan hubungan niat dengan keberkahan belajar.",
            tema: ["Ilmu!"],
          },
        ],
      },
      asal: { ...ASAL, skill: "faedah@1" },
    };
    expect(codes(await checkContentDraft(db, d))).toContain("schema");
    d.isi.butir[0]!.tema = ["ilmu"];
    const r = await checkContentDraft(db, d);
    expect(r.ok).toBe(true);
    // B12 tidak dijangkar Intisari T_LONG (hanya B13), jadi sikapnya belum dicek.
    expect(r.warnings.map((w) => w.code)).toContain("stance_unchecked");
  });
});

describe("readinessIssues: periksa independen terikat sidik draf", () => {
  test("isi berubah sesudah periksa independen → review_stale", async () => {
    const d = contentDraft.parse(babDraft());
    const sha = await contentDraftSha256(d);
    const indep = {
      penilai: "Agen uji",
      tanggal: "2026-10-28",
      draf_sha256: sha,
      nilai: [],
      laporan: null,
    };
    expect(await readinessIssues({ ...d, periksa: { ...d.periksa, independen: indep } })).toEqual(
      [],
    );
    const base = babDraft();
    const edited = contentDraft.parse({
      ...base,
      isi: { ...base.isi, inti: `${INTI.slice(0, -1)} dan amal.` },
      periksa: { independen: indep },
    });
    const out = await readinessIssues(edited);
    expect(out.map((i) => i.code)).toContain("review_stale");
  });
});
