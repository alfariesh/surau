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
      "Teks kitab di jilid tiga, halaman dua ratus empat, yang terjemahan bebasnya: Terjemahan kutipan satu.",
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

  test("sha stabil untuk masukan sama, berubah bila gagasan hilang; karakter = jumlah segmen", async () => {
    const a = await digestScript(view());
    const b = await digestScript(view());
    expect(a.sha256).toBe(b.sha256);
    expect(a.sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(a.chars).toBe(a.segments.reduce((n, s) => n + segmentText(s).length, 0));
    const fewer = await digestScript(view({ points: [point(1)] }));
    expect(fewer.sha256).not.toBe(a.sha256);
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
// buatan "لا أصل له" supaya tanda riwayat berat bisa diuji tanpa teks kitab.
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
           VALUES (?1, 'id', 1, 1, ?2, 0, 3), (?1, 'id', 2, 1, ?2, 4, 7)`,
        )
        .bind(T_CHILD_A, PASSAGES.body1),
      db
        .prepare(
          `INSERT INTO digest_quote (toc_node_id, lang, ord, point_ord, passage_id, char_start,
             char_end, raw_sha256, kind, translation_source, translation, model, prompt_version, created_at)
           VALUES (?, 'id', 1, 1, ?, ?, ?, ?, 'report', 'digest', 'Terjemahan riwayat uji.', ${AI})`,
        )
        .bind(T_CHILD_A, PASSAGES.body1, RIWAYAT.start, RIWAYAT.end, sha),
    ]);
  });

  test("riwayat yang takhrijnya memuat penilaian berat diberi tanda lisan", async () => {
    const loaded = await loadDigestScript(db, T_CHILD_A);
    expect(loaded).not.toBeNull();
    const p1 = segmentText(loaded!.script.segments[2]!);
    expect(p1).toContain("Sebuah riwayat di jilid satu, halaman satu, yang terjemahan bebasnya:");
    expect(p1).toContain(
      "Catatan takhrij untuk riwayat ini memuat penilaian tidak ada asalnya; penilaian ini dikenali otomatis dan belum ditinjau.",
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
