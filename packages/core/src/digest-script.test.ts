import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import { BODY_1, PASSAGES, T_CHILD_A, T_CHILD_B, seedCore } from "../test/fixture.ts";
import {
  SCRIPT_DOOR,
  SCRIPT_LABEL,
  SCRIPT_VERSION,
  ScriptError,
  digestScript,
  loadDigestScript,
  segmentText,
} from "./digest-script.ts";
import { digestView } from "./schema.ts";
import type { DigestPointView, DigestQuoteView, DigestView } from "./schema.ts";
import { textSha256 } from "./translation-revision.ts";

const ARABIC = /\p{Script_Extensions=Arabic}/u;

const loc = (juz: number, page: number) => ({
  juz,
  page_no: page,
  permalink: `/kitab/uji/${juz}/${page}`,
  label: `Kitab Uji, j. ${juz}, h. ${page}`,
});

const point = (ord: number, extra: Partial<DigestPointView> = {}): DigestPointView => ({
  ord,
  kind: "idea",
  stance: "author",
  title: `Judul gagasan ${ord}`,
  body: `Isi gagasan ${ord}.`,
  review_status: "ai_generated",
  anchors: [{ passage_id: 70000001, char_start: 0, char_end: 3, location: loc(1, 200) }],
  ...extra,
});

const quote = (ord: number, extra: Partial<DigestQuoteView> = {}): DigestQuoteView => ({
  ord,
  point_ord: 1,
  kind: "text",
  passage_id: 70000001,
  char_start: 0,
  char_end: 3,
  text_raw: "نص",
  location: loc(3, 204),
  translation: {
    label: "ai_translation",
    lang: "id",
    model: "model-uji",
    prompt_version: "intisari-bab@1",
    created_at: "2026-10-24",
    review_status: "ai_generated",
    human_review: null,
    text: `Terjemahan kutipan ${ord}.`,
  },
  takhrij: [],
  ...extra,
});

/** Intisari BUATAN (teks Arab hanya di `title_ar`/`text_raw`, yang tidak pernah dibacakan). */
function view(extra: Partial<DigestView> = {}): DigestView {
  return digestView.parse({
    label: "ai_digest",
    section: { id: 100074, title_ar: "كتاب", level: 2, permalink: "/kitab/uji/bab/100074" },
    source: {
      work: {
        slug: "uji",
        title_ar: "كتاب",
        title_id: "Ihya' 'Ulum ad-Din",
        author: { name_ar: "الغزالي", name_id: "al-Ghazali", death_hijri: 505 },
        attribution_status: "authentic",
      },
      edition: { id: 7, slug: "uji", is_default: true, publisher: null, city: null },
      license: "CC BY-NC-SA 4.0",
      attribution: "Uji",
    },
    tier: "book",
    basis: "children",
    lang: "id",
    model: "model-uji",
    prompt_version: "intisari@1",
    created_at: "2026-10-24",
    review_status: "ai_generated",
    opening: "Al-Ghazali (w. 505 H) membahas ilmu.",
    abstract: "Kitab ini memuat 3 pokok. Nabi saw. dijadikan teladan.",
    closing: "Ilmu menuntun amal.",
    points: [point(1), point(2, { kind: "advice", title: "Anjuran menjaga niat" })],
    quotes: [
      quote(1),
      quote(2, { point_ord: null, kind: "poetry" }),
      quote(3, { point_ord: null, translation: null }),
    ],
    questions: [],
    terms: [],
    reading_minutes: 1,
    audio: null,
    evidence: { ayat: [], hadith: [], quran: null },
    withheld_quotes: [],
    ...extra,
  });
}

describe("digestScript (X17, aturan 11)", () => {
  test("urutan segmen, kalimat label lebih dulu, pintu ke kitab di akhir", async () => {
    const script = await digestScript(view());
    expect(script.script_version).toBe(SCRIPT_VERSION);
    expect(script.segments.map((s) => [s.kind, s.point_ord])).toEqual([
      ["label", null],
      ["intro", null],
      ["point", 1],
      ["point", 2],
      ["quotes", null],
      ["closing", null],
    ]);
    expect(script.segments[0]?.sentences).toEqual([
      SCRIPT_LABEL,
      "Dari kitab Ihya' 'Ulum ad-Din karya al-Ghazali.",
    ]);
    const closing = segmentText(script.segments.at(-1)!);
    expect(closing.startsWith("Penutup. Ilmu menuntun amal.")).toBe(true);
    expect(closing.endsWith(SCRIPT_DOOR)).toBe(true);
  });

  test("normalisasi lisan per kalimat; gagasan bernomor; anjuran + catatan ulama", async () => {
    const [, intro, p1, p2] = (await digestScript(view())).segments;
    expect(intro?.sentences).toEqual([
      "Al-Ghazali (wafat tahun lima ratus lima Hijriah) membahas ilmu.",
      "Kitab ini memuat tiga pokok.",
      "Nabi shallallahu 'alaihi wa sallam dijadikan teladan.",
    ]);
    expect(p1?.sentences.slice(0, 3)).toEqual([
      "Gagasan pertama.",
      "Judul gagasan satu.",
      "Isi gagasan satu.",
    ]);
    expect(p2?.sentences).toEqual([
      "Gagasan kedua.",
      "Anjuran yang ditulis al-Ghazali sendiri, di jilid satu, halaman dua ratus.",
      "Anjuran menjaga niat.",
      "Isi gagasan dua.",
      "Untuk kasus pribadi, tanyakan kepada ulama.",
    ]);
  });

  test("kutipan dibacakan lewat terjemahannya; tanpa terjemahan dilewati; Arab tidak pernah ikut", async () => {
    const script = await digestScript(view());
    const p1 = segmentText(script.segments[2]!);
    expect(p1).toContain(
      "Teks kitab di jilid tiga, halaman dua ratus empat, yang terjemahan AI-nya: Terjemahan kutipan satu.",
    );
    const general = script.segments[4]!;
    expect(general.sentences[0]).toBe("Kutipan pilihan.");
    expect(segmentText(general)).toContain("Sebait syair di jilid tiga");
    expect(segmentText(general)).not.toContain("kutipan tiga");
    for (const s of script.segments) expect(segmentText(s)).not.toMatch(ARABIC);
  });

  test("ayat dalam terjemahan hanya disebut; penanda catatan kaki dibuang", async () => {
    const script = await digestScript(
      view({
        quotes: [
          quote(1, {
            translation: { ...quote(1).translation!, text: "Ia membaca ⟦QS 2:255⟧ lalu diam (١)." },
          }),
        ],
      }),
    );
    expect(segmentText(script.segments[2]!)).toContain(
      "Ia membaca (ayat Al-Qur'an, surah kedua ayat dua ratus lima puluh lima) lalu diam.",
    );
    expect(JSON.stringify(script)).not.toMatch(/⟦|\(١\)/u);
  });

  test("gagasan yang bersandar pada riwayat sangat lemah/palsu/tanpa asal diberi tanda lisan; 'lemah' biasa tidak", async () => {
    const hadith = (point_ords: number[], kinds: { kind: string; gloss: string }[]) => ({
      point_ords,
      passage_id: 70000001,
      marker: "١",
      char_start: 0,
      char_end: 3,
      location: loc(1, 200),
      footnote: { id: 70000002, anchor: "p70000002", text_raw: "(١) حاشية", location: loc(1, 200) },
      status: {
        label: "rule_extracted" as const,
        kind: "terms" as const,
        text: "uji",
        weak: true,
        mixed: false,
        terms: kinds.map((k) => ({ ...k, char_start: 4, char_end: 8 })),
        version: 1,
      },
    });
    const script = await digestScript(
      view({
        evidence: {
          ayat: [],
          hadith: [
            hadith([1], [{ kind: "daif", gloss: "lemah" }]),
            hadith(
              [2],
              [
                { kind: "palsu", gloss: "palsu/batil" },
                { kind: "la_asl", gloss: "tidak ada asalnya" },
              ],
            ),
          ],
          quran: null,
        },
      }),
    );
    expect(segmentText(script.segments[2]!)).not.toContain("Gagasan ini bersandar");
    expect(script.segments[3]?.sentences).toContain(
      "Gagasan ini bersandar pada riwayat yang catatan takhrijnya memuat penilaian palsu atau batil dan tidak ada asalnya; penilaian ini dikenali otomatis dari teks takhrij dan belum ditinjau.",
    );
  });

  test("terjemahan yang ditinjau manusia tidak disebut AI; penanda dan placeholder di teks gagasan dirapikan", async () => {
    const reviewed = quote(1);
    const script = await digestScript(
      view({
        points: [point(1, { body: "Isi (١) gagasan, lihat ⟦QS 2:255⟧. Lalu (4) rakaat." })],
        quotes: [
          {
            ...reviewed,
            translation: {
              ...reviewed.translation!,
              human_review: {
                revised: false,
                reviewed_at: "2026-10-24T00:00:00.000Z",
                reviewer_role: "ustadz",
                reviewer_name: "Ust. Uji",
                reviewer_short: "Ust. Uji",
              },
            },
          },
        ],
      }),
    );
    const p1 = segmentText(script.segments[2]!);
    expect(p1).toContain(
      "Isi gagasan, lihat (ayat Al-Qur'an, surah kedua ayat dua ratus lima puluh lima).",
    );
    expect(p1).toContain("Lalu (empat) rakaat.");
    expect(p1).toContain("yang terjemahannya: Terjemahan kutipan satu.");
  });

  test("tanpa penulis atau judul Latin: tidak ada kalimat sumber, anjuran memakai 'penulis'", async () => {
    const v = view();
    const script = await digestScript({
      ...v,
      tier: "section",
      opening: null,
      closing: null,
      source: { ...v.source, work: { ...v.source.work, title_id: null, author: null } },
    });
    expect(script.segments[0]?.sentences).toEqual([SCRIPT_LABEL]);
    expect(segmentText(script.segments[3]!)).toContain("Anjuran yang ditulis penulis sendiri");
    expect(segmentText(script.segments.at(-1)!)).toBe(SCRIPT_DOOR);
  });

  test("peran kalimat: terjemahan kutipan = quote, syair = poetry, selebihnya narasi", async () => {
    const script = await digestScript(view());
    const p1 = script.segments[2]!;
    expect(p1.roles).toHaveLength(p1.sentences.length);
    const quoteAt = p1.sentences.indexOf("Terjemahan kutipan satu.");
    expect(p1.roles[quoteAt]).toBe("quote");
    expect(p1.roles[quoteAt - 1]).toBe("narration");
    const general = script.segments[4]!;
    expect(general.roles[general.sentences.indexOf("Terjemahan kutipan dua.")]).toBe("poetry");
    expect(script.segments[0]!.roles.every((r) => r === "narration")).toBe(true);
  });

  test("sha stabil untuk masukan sama, berubah bila gagasan hilang; karakter = jumlah segmen", async () => {
    const a = await digestScript(view());
    const b = await digestScript(view());
    expect(a.sha256).toBe(b.sha256);
    expect(a.sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(a.chars).toBe(a.segments.reduce((n, s) => n + segmentText(s).length, 0));
    const fewer = await digestScript(view({ points: [point(1)] }));
    expect(fewer.sha256).not.toBe(a.sha256);
  });

  test("sumber kalimat (X18): sejajar kalimat, rentang menunjuk teks tampil, kalimat buatan kode null", async () => {
    const v = view({
      abstract: "Kitab ini memuat 3 pokok.\n\nNabi saw. dijadikan teladan.",
      points: [
        point(1, {
          title: "  Judul tanpa titik ",
          body: "Isi pertama (١). Lalu ⟦QS 2:255⟧ dibaca.",
        }),
      ],
      quotes: [quote(1)],
    });
    const script = await digestScript(v);
    expect(script.sources.map((s) => s.length)).toEqual(
      script.segments.map((s) => s.sentences.length),
    );
    const text = (src: NonNullable<(typeof script.sources)[number][number]>) => {
      const p = v.points.find((x) => x.ord === src.ord);
      const field = {
        opening: v.opening,
        abstract: v.abstract,
        closing: v.closing,
        point_title: p?.title,
        point_body: p?.body,
        quote: v.quotes.find((q) => q.ord === src.ord)?.translation?.text,
      }[src.field]!;
      return field.slice(src.start, src.end);
    };
    const [label, intro, p1, ...rest] = script.sources;
    expect(label!.every((s) => s === null)).toBe(true);
    expect(intro!.map((s) => text(s!))).toEqual([
      "Al-Ghazali (w. 505 H) membahas ilmu.",
      "Kitab ini memuat 3 pokok.",
      "Nabi saw. dijadikan teladan.",
    ]);
    expect(p1![0]).toBeNull(); // "Gagasan pertama."
    // Titik tambahan judul tidak keluar dari teks tampil; penanda (١) dan placeholder ayat utuh.
    expect(p1!.slice(1, 4).map((s) => text(s!))).toEqual([
      "Judul tanpa titik",
      "Isi pertama (١).",
      "Lalu ⟦QS 2:255⟧ dibaca.",
    ]);
    expect(p1![4]).toBeNull(); // pengantar kutipan
    expect(text(p1![5]!)).toBe("Terjemahan kutipan 1.");
    expect(p1![5]).toMatchObject({ field: "quote", ord: 1 });
    const closing = rest.at(-1)!;
    expect(closing[0]).toBeNull(); // "Penutup."
    expect(text(closing[1]!)).toBe("Ilmu menuntun amal.");
    expect(closing.slice(2).every((s) => s === null)).toBe(true); // pintu ke kitab
  });

  test("sha skrip (X18) tetap atas segmen saja: sumber kalimat tidak ikut", async () => {
    const script = await digestScript(view());
    const { script_version, spoken_version, node_id, lang, segments } = script;
    expect(script.sha256).toBe(
      await textSha256(JSON.stringify({ script_version, spoken_version, node_id, lang, segments })),
    );
  });

  test("huruf Arab atau tag yang lolos ke teks ditolak (pertahanan berlapis)", async () => {
    const bad = view();
    await expect(
      digestScript({ ...bad, points: [{ ...point(1), body: "Isi ﷺ." }] }),
    ).rejects.toThrow(ScriptError);
    await expect(digestScript({ ...bad, abstract: "Isi ⟦QS 1:1" })).rejects.toThrow(
      /segmen 1 \(intro\)/u,
    );
  });
});

// Fixture D1 BUATAN (packages/db/test/fixture.ts). Catatan kaki kedua diubah menjadi frasa takhrij
// buatan "لا أصل له" supaya penahanan riwayat berat bisa diuji tanpa teks kitab.
const RIWAYAT = { start: BODY_1.indexOf("في"), end: BODY_1.indexOf(" (٢)") };
const AI = "'model-uji', 'intisari-bab@1', '2026-10-24'";

describe("loadDigestScript (D1)", () => {
  const db = env.CORPUS;

  beforeAll(async () => {
    await seedCore(db);
    const sha = await textSha256(BODY_1.slice(RIWAYAT.start, RIWAYAT.end));
    await db.batch([
      db.prepare("UPDATE passage SET text_raw = '(٢) لا أصل له' WHERE id = ?").bind(PASSAGES.foot2),
      db
        .prepare(
          `INSERT INTO digest (toc_node_id, lang, tier, basis, opening, abstract, closing,
             source_sha256, model, prompt_version, created_at)
           VALUES (?, 'id', 'section', 'text', NULL, 'Bagian ini membahas niat.', NULL, ?, ${AI})`,
        )
        .bind(T_CHILD_A, "a".repeat(64)),
      db
        .prepare(
          `INSERT INTO digest_point (toc_node_id, lang, ord, kind, stance, title, body, review_status)
           VALUES (?1, 'id', 1, 'idea', 'author', 'Al-Ghazali menimbang niat', 'Niat menentukan nilai amal.', 'ai_generated'),
                  (?1, 'id', 2, 'idea', 'reported', 'Pendapat yang dinukil', 'Isi kedua.', 'ai_generated')`,
        )
        .bind(T_CHILD_A),
      db
        .prepare(
          `INSERT INTO digest_anchor (toc_node_id, lang, point_ord, seq, passage_id, char_start, char_end)
           VALUES (?1, 'id', 1, 1, ?2, 0, 3), (?1, 'id', 2, 1, ?2, ?3, ?4)`,
        )
        .bind(T_CHILD_A, PASSAGES.body1, RIWAYAT.start, RIWAYAT.end),
      db
        .prepare(
          `INSERT INTO digest_quote (toc_node_id, lang, ord, point_ord, passage_id, char_start,
             char_end, raw_sha256, kind, translation_source, translation, model, prompt_version, created_at)
           VALUES (?, 'id', 1, 1, ?, ?, ?, ?, 'report', 'digest', 'Terjemahan riwayat uji.', ${AI})`,
        )
        .bind(T_CHILD_A, PASSAGES.body1, RIWAYAT.start, RIWAYAT.end, sha),
    ]);
  });

  test("riwayat berat: kutipannya ditahan readDigest, gagasan yang bersandar padanya diberi tanda lisan", async () => {
    const loaded = await loadDigestScript(db, T_CHILD_A);
    expect(loaded).not.toBeNull();
    expect(loaded!.view.withheld_quotes).toEqual([{ ord: 1, reason: "weak_report" }]);
    const text = loaded!.script.segments.map(segmentText).join(" ");
    expect(text).not.toContain("Terjemahan riwayat uji");
    expect(text).not.toContain("Sebuah riwayat");
    // Gagasan 2 berjangkar tepat sebelum penanda (٢) "لا أصل له": kutipannya ditahan, gagasannya ditandai.
    expect(segmentText(loaded!.script.segments[3]!)).toContain(
      "Gagasan ini bersandar pada riwayat yang catatan takhrijnya memuat penilaian tidak ada asalnya",
    );
    expect(JSON.stringify(loaded!.script)).not.toMatch(ARABIC);
  });

  test("gagasan yang ditolak sesudah audio dibuat mengubah sha skrip", async () => {
    const before = (await loadDigestScript(db, T_CHILD_A))!.script;
    await db
      .prepare(
        "UPDATE digest_point SET review_status = 'rejected' WHERE toc_node_id = ? AND ord = 2",
      )
      .bind(T_CHILD_A)
      .all();
    const after = (await loadDigestScript(db, T_CHILD_A))!.script;
    expect(after.segments.filter((s) => s.kind === "point")).toHaveLength(1);
    expect(after.sha256).not.toBe(before.sha256);
  });

  test("node tanpa Intisari → null", async () => {
    expect(await loadDigestScript(db, T_CHILD_B)).toBeNull();
  });
});
