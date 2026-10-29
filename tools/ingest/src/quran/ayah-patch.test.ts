// Tes patch ayat dengan mushaf BUATAN (kalimat karangan, bukan teks Al-Qur'an).
import { describe, expect, test } from "vite-plus/test";

import { applyAyahPatch, ayahCandidates, ayahPatch, spanSha256 } from "./ayah-patch.ts";
import type { AyahPatchEntry } from "./ayah-patch.ts";
import { buildQuranIndex } from "./matcher.ts";
import { mergePatchedRefs } from "./rows.ts";
import type { AyahStats } from "./rows.ts";

const index = buildQuranIndex([
  { surah: 1, ayah: 1, text: "والصبر نور القلوب في الظلمات" },
  { surah: 1, ayah: 2, text: "والعلم ثمرة العمل الصالح" },
  { surah: 2, ayah: 1, text: "والصبر نور القلوب في الظلمات" },
  { surah: 3, ayah: 1, text: "ثم قال لهم انظروا الى الجبال الشاهقة والسهول وما حولها" },
]);

const RAW =
  "قال الشيخ والصبر نور القلوب في الظلمات ثم قال انظروا الى الجبال الشهقة والسهول وما حولها";
const passages = new Map([
  [1, { text_raw: RAW, kind: "body" }],
  [2, { text_raw: RAW, kind: "footnote" }],
]);
const span = (word: string, n: number): [number, number] => {
  const start = RAW.indexOf(word);
  let end = start;
  for (let i = 0; i < n; i++) {
    const next = RAW.indexOf(" ", end + 1);
    end = next === -1 ? RAW.length : next;
  }
  return [start, end];
};
const [s1, e1] = span("والصبر", 5);
const [s2, e2] = span("انظروا", 6);

const entry = (over: Partial<AyahPatchEntry> = {}): AyahPatchEntry => ({
  passage_id: 1,
  char_start: s1,
  char_end: e1,
  span_sha256: spanSha256(RAW, s1, e1),
  surah: 1,
  ayah_from: 1,
  ayah_to: 1,
  sumber: "uji",
  ...over,
});
const apply = (
  ayat: AyahPatchEntry[],
  existing: { passage_id: number; char_start: number; char_end: number }[] = [],
) => applyAyahPatch(index, passages, existing, { shamela_book: 1, ayat });

describe("patch ayat", () => {
  test("letak dihitung kode; patch hanya memilih di antara letak berlafaz sama", () => {
    expect(ayahCandidates(index, RAW, s1, e1).map((c) => `${c.surah}:${c.ayahFrom}`)).toEqual([
      "1:1",
      "2:1",
    ]);
    const { refs, problems } = apply([entry({ surah: 2 })]);
    expect(problems).toEqual([]);
    expect(refs).toEqual([
      {
        passage_id: 1,
        char_start: s1,
        char_end: e1,
        surah: 2,
        ayah_from: 1,
        ayah_to: 1,
        match: "exact",
        partial: 0,
        bracketed: 0,
        alt_count: 1,
      },
    ]);
  });

  test("beda ejaan kecil: mirip dan sebagian ayat", () => {
    const { refs, problems } = apply([
      entry({ char_start: s2, char_end: e2, span_sha256: spanSha256(RAW, s2, e2), surah: 3 }),
    ]);
    expect(problems).toEqual([]);
    expect(refs[0]).toMatchObject({ surah: 3, match: "similar", partial: 1 });
  });

  test("ayat yang tidak cocok ditolak dengan letak temuan kode", () => {
    expect(apply([entry({ surah: 1, ayah_from: 2, ayah_to: 2 })]).problems).toEqual([
      `1@${s1}: lafaz tidak cocok QS 1:2-2 (letak kode: 1:1-1, 2:1-1)`,
    ]);
  });

  test("teks berubah, memotong kata, menimpa rujukan, bukan badan: ditolak", () => {
    expect(apply([entry({ span_sha256: "0".repeat(64) })]).problems[0]).toMatch(/span_sha256/);
    const cut = entry({ char_start: s1 + 1, span_sha256: spanSha256(RAW, s1 + 1, e1) });
    expect(apply([cut]).problems[0]).toMatch(/memotong kata/);
    const tail = entry({ char_end: e1 + 1, span_sha256: spanSha256(RAW, s1, e1 + 1) });
    expect(apply([tail]).problems[0]).toMatch(/memotong kata/);
    const [s3, e3] = span("نور", 4);
    const part = entry({ char_start: s3, char_end: e3, span_sha256: spanSha256(RAW, s3, e3) });
    expect(apply([entry(), part]).problems).toEqual([`1@${s3}: menimpa rujukan ayat lain`]);
    expect(
      apply([entry()], [{ passage_id: 1, char_start: e1 - 3, char_end: e1 + 5 }]).problems[0],
    ).toMatch(/menimpa/);
    expect(apply([entry(), entry()]).problems).toHaveLength(1);
    expect(apply([entry({ passage_id: 2 })]).problems[0]).toMatch(/bukan paragraf badan/);
    expect(apply([entry({ passage_id: 9 })]).problems[0]).toMatch(/tidak ada/);
    expect(apply([entry({ char_end: RAW.length + 1 })]).problems[0]).toMatch(/di luar teks/);
  });

  test("skema: catatan tanpa huruf Arab", () => {
    expect(ayahPatch.safeParse({ shamela_book: 1, ayat: [entry({ catatan: "ok" })] }).success).toBe(
      true,
    );
    expect(
      ayahPatch.safeParse({ shamela_book: 1, ayat: [entry({ catatan: "قال" })] }).success,
    ).toBe(false);
  });

  test("gabung ke hasil pencocok: urut kunci utama dan statistik rujukan", () => {
    const { refs } = apply([entry({ surah: 2 })]);
    const matched = {
      refs: [{ ...refs[0]!, passage_id: 2, char_start: 0, partial: 1 as const }],
      stats: {
        patched: 0,
        partial: 1,
        multiAyah: 0,
        withAlternatives: 1,
        passages: 1,
      } as AyahStats,
    };
    mergePatchedRefs(matched, refs);
    expect(matched.refs.map((r) => r.passage_id)).toEqual([1, 2]);
    expect(matched.stats).toMatchObject({
      patched: 1,
      partial: 1,
      withAlternatives: 2,
      passages: 2,
    });
  });
});
