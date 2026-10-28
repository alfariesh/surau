import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import { ED, PASSAGES, T_CHILD_A, T_ROOT, longPassageId, seedCore } from "../test/fixture.ts";
import {
  checkTranslationDraft,
  listTranslationUnits,
  translationDraftSha256,
  translationReadinessIssues,
} from "./translation-draft.ts";
import { checkPassageTranslation } from "./translation-check.ts";
import {
  TRANSLATION_FORMAT,
  TRANSLATION_RULES,
  translationDraft,
  translationDraftCheck,
  translationUnits,
} from "./translation-schema.ts";

const db = env.CORPUS;
const NOW = () => new Date("2026-10-28T08:00:00.000Z");

// Terjemahan Inggris BUATAN untuk teks fixture buatan (bukan isi kitab).
const EN_BODY_1 = "This is a test text (١) on the first page (٢).";
const EN_BODY_2 = "The text of ⟦QS 1:2-3⟧.";

const ASAL = {
  pembuat: "claude-desktop",
  model: "claude-sonnet-5-5",
  plugin: "surau-redaksi@0.2.0",
  skill: "terjemah-inggris@1",
  operator: "pemilik",
  dibuat: "2026-10-28T07:00:00+07:00",
} as const;

function draft(
  butir: { passage_id: number; teks: string }[],
  overrides: Record<string, unknown> = {},
) {
  return {
    format: TRANSLATION_FORMAT,
    lang: "en",
    edition_id: ED,
    section_id: T_ROOT,
    status: "draf",
    butir,
    asal: ASAL,
    ...overrides,
  };
}

const codes = (issues: readonly { code: string }[]) => issues.map((i) => i.code);

beforeAll(async () => {
  await seedCore(db);
});

describe("listTranslationUnits", () => {
  test("paragraf badan subpohon, ayat jadi placeholder, penanda catatan kaki tercatat", async () => {
    const view = translationUnits.parse(await listTranslationUnits(db, { section_id: T_ROOT }));
    const byId = new Map(view.units.map((u) => [u.passage_id, u]));
    const b2 = byId.get(PASSAGES.body2);
    expect(b2?.placeholders).toEqual(["⟦QS 1:2-3⟧"]);
    expect(b2?.source).toContain("⟦QS 1:2-3⟧");
    expect(b2?.source).not.toContain("الثانية");
    expect(byId.get(PASSAGES.body1)?.markers).toEqual(["١", "٢"]);
    expect(view.units.every((u) => u.blocked === null && !u.translated_en)).toBe(true);
    expect(view.total).toBe(view.units.length);
  });

  test("paginasi offset/limit", async () => {
    const first = await listTranslationUnits(db, { section_id: T_ROOT, limit: 1 });
    expect(first.units).toHaveLength(1);
    expect(first.next_offset).toBe(1);
  });
});

describe("checkTranslationDraft", () => {
  test("draf baik lolos dan diberi cap", async () => {
    const d = draft([
      { passage_id: PASSAGES.body1, teks: EN_BODY_1 },
      { passage_id: PASSAGES.body2, teks: EN_BODY_2 },
    ]);
    const r = translationDraftCheck.parse(await checkTranslationDraft(db, d, NOW));
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.stamp?.aturan).toBe(TRANSLATION_RULES);
    expect(r.stamp?.draf_sha256).toBe(await translationDraftSha256(translationDraft.parse(d)));
  });

  test("placeholder hilang, huruf Arab, penanda angka Latin, Markdown ditolak", async () => {
    const r = await checkTranslationDraft(
      db,
      draft([
        { passage_id: PASSAGES.body1, teks: "This is a **test** text (1) on the first page (٢)." },
        { passage_id: PASSAGES.body2, teks: "The text of the second page الثانية." },
      ]),
      NOW,
    );
    expect(r.ok).toBe(false);
    expect(codes(r.errors)).toEqual(
      expect.arrayContaining(["markers_latin", "markdown", "placeholders", "arabic"]),
    );
    expect(r.stamp).toBeNull();
  });

  test("paragraf di luar bagian dan paragraf ganda ditolak", async () => {
    const r = await checkTranslationDraft(
      db,
      draft(
        [
          { passage_id: PASSAGES.body2, teks: EN_BODY_2 },
          { passage_id: PASSAGES.body2, teks: EN_BODY_2 },
          { passage_id: longPassageId(1, 1), teks: "A sentence." },
        ],
        { section_id: T_CHILD_A },
      ),
      NOW,
    );
    expect(codes(r.errors)).toEqual(["duplicate", "outside_section"]);
  });

  test("bahasa selain Inggris dan placeholder karangan ditolak", async () => {
    const id = await checkTranslationDraft(
      db,
      draft([{ passage_id: PASSAGES.body1, teks: EN_BODY_1 }], { lang: "id" }),
    );
    expect(codes(id.errors)).toEqual(["schema"]);
    const extra = await checkTranslationDraft(
      db,
      draft([{ passage_id: PASSAGES.body1, teks: `${EN_BODY_1} ⟦QS 2:255⟧` }]),
    );
    expect(codes(extra.errors)).toContain("placeholders");
  });

  test("bagian tidak ada, edisi lain, dan komentar penerjemah ditolak; rasio panjang hanya peringatan", async () => {
    const unknown = await checkTranslationDraft(
      db,
      draft([{ passage_id: PASSAGES.body1, teks: EN_BODY_1 }], { section_id: T_ROOT + 99 }),
    );
    expect(codes(unknown.errors)).toEqual(["unknown_section"]);
    const edition = await checkTranslationDraft(
      db,
      draft([{ passage_id: PASSAGES.body1, teks: EN_BODY_1 }], { edition_id: ED + 1 }),
    );
    expect(codes(edition.errors)).toContain("edition_mismatch");
    const notes = await checkTranslationDraft(
      db,
      draft([
        { passage_id: PASSAGES.body1, teks: `${EN_BODY_1} (Translator's note: literal.)` },
        { passage_id: PASSAGES.body2, teks: "The translation of ⟦QS 1:2-3⟧." },
      ]),
    );
    expect(notes.errors.map((e) => `${e.code}@${e.path}`)).toEqual([
      "meta@butir[0].teks",
      "meta@butir[1].teks",
    ]);
  });
});

describe("checkPassageTranslation en", () => {
  const masked = {
    text: "قال هذا كلام طويل جدا عن العلم والعمل والنية في طلب العلم الشريف",
    slots: [],
  };
  test("terjemahan wajar lolos; terlalu pendek = length_ratio; catatan penerjemah = meta", () => {
    const fine = checkPassageTranslation(
      "He said: this is a long speech about knowledge, action, and intention in seeking noble knowledge.",
      { masked, markers: [] },
      "en",
    );
    expect(fine.problems).toEqual([]);
    expect(checkPassageTranslation("He spoke.", { masked, markers: [] }, "en").problems).toEqual([
      "length_ratio",
    ]);
    expect(
      checkPassageTranslation(
        "He said: this is a long speech about knowledge and action. Note: the text is unclear here.",
        { masked, markers: [] },
        "en",
      ).problems,
    ).toContain("meta");
  });

  test("bahasa Indonesia tidak berubah: kata Inggris dan 'terjemah' tetap meta", () => {
    const id = (t: string) => checkPassageTranslation(t, { masked, markers: [] }, "id").problems;
    expect(
      id("Ia berkata: ini pembicaraan panjang tentang ilmu, amal, dan niat dalam menuntut ilmu."),
    ).toEqual([]);
    expect(
      id("Berikut terjemahan: ia berkata tentang ilmu, amal, dan niat dalam menuntut ilmu."),
    ).toContain("meta");
  });
});

describe("translationReadinessIssues", () => {
  test("siap butuh cap cocok dan periksa independen tanpa Salah; isi berubah = basi", async () => {
    const d = translationDraft.parse(draft([{ passage_id: PASSAGES.body1, teks: EN_BODY_1 }]));
    const stamp = (await checkTranslationDraft(db, d, NOW)).stamp;
    expect(stamp).not.toBeNull();
    const sha = await translationDraftSha256(d);
    const siap = translationDraft.parse({
      ...d,
      status: "siap",
      periksa: {
        mandiri: [{ ke: 1, nilai: "benar", catatan: "" }],
        independen: {
          penilai: "agen uji",
          tanggal: "2026-10-28",
          draf_sha256: sha,
          nilai: [{ ke: 1, nilai: "benar", catatan: "" }],
          laporan: null,
        },
        kode: stamp,
      },
    });
    expect(await translationReadinessIssues(siap)).toEqual([]);
    expect(
      codes(
        await translationReadinessIssues({
          ...siap,
          periksa: { ...siap.periksa, independen: null },
        }),
      ),
    ).toEqual(["no_independent_review"]);
    const edited = {
      ...siap,
      butir: [{ passage_id: PASSAGES.body1, teks: `${EN_BODY_1} Again.` }],
    };
    expect(codes(await translationReadinessIssues(edited))).toEqual([
      "stamp_mismatch",
      "review_stale",
    ]);
  });
});
