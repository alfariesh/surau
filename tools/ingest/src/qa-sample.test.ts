import { describe, expect, test } from "vite-plus/test";

import type { FootnoteRefRow, PageRow, PassageNeedsReviewRow, PassageRow } from "@surau/db";

import {
  bundlePages,
  comparePage,
  mulberry32,
  pickForHuman,
  samplePages,
  scanUrl,
  summarize,
} from "./qa-sample.ts";
import { IHYA } from "./works/ihya.ts";

// Kalimat karangan (bukan teks kitab), dengan harakat supaya perbandingan byte ikut teruji.
const TEXT = "هَذَا نَصٌّ تَجْرِيبِيٌّ";

function page(id: number, juz: number, pageNo: number): PageRow {
  return { id, edition_id: 1, seq: id - 100_000, juz, page_no: pageNo, source_page_id: id + 7 };
}

function passage(
  id: number,
  pageId: number,
  kind: "body" | "foot",
  ord: number,
  text = TEXT,
): PassageRow {
  return { id, edition_id: 1, page_id: pageId, toc_node_id: 100_001, kind, ord, text_raw: text };
}

interface Rows {
  page: PageRow[];
  passage: PassageRow[];
  footnote_ref: FootnoteRefRow[];
  passage_needs_review: PassageNeedsReviewRow[];
}

function rows(): Rows {
  return {
    page: [page(100_001, 1, 1), page(100_002, 1, 2)],
    passage: [
      passage(10_000_003, 100_001, "foot", 1),
      passage(10_000_001, 100_001, "body", 1),
      passage(10_000_002, 100_001, "body", 2),
      passage(10_000_004, 100_002, "body", 1),
    ],
    footnote_ref: [
      {
        passage_id: 10_000_001,
        char_start: 3,
        char_end: 6,
        marker: "(١)",
        footnote_passage_id: 10_000_003,
      },
    ],
    passage_needs_review: [{ passage_id: 10_000_003, reason: "takhrij_unmatched" }],
  };
}

describe("sampel acak", () => {
  test("mulberry32 deterministik per seed", () => {
    const a = mulberry32(9472);
    const b = mulberry32(9472);
    const xs = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(mulberry32(1)()).not.toBe(xs[0]);
  });

  test("samplePages: n ID berbeda, terurut, sama untuk seed sama, tidak bergantung urutan masukan", () => {
    const ids = Array.from({ length: 1706 }, (_, i) => 100_001 + i);
    const s = samplePages(ids, 30, 9472);
    expect(s).toHaveLength(30);
    expect(new Set(s).size).toBe(30);
    expect(s).toEqual([...s].sort((x, y) => x - y));
    expect(samplePages([...ids].reverse(), 30, 9472)).toEqual(s);
    expect(samplePages(ids, 30, 9473)).not.toEqual(s);
    expect(() => samplePages(ids.slice(0, 3), 4, 1)).toThrow(/sampel/);
  });
});

describe("comparePage", () => {
  test("baris identik → tanpa perbedaan; urutan masukan tidak berpengaruh", () => {
    const e = bundlePages(rows(), [100_001]);
    const shuffled = rows();
    shuffled.passage.reverse();
    const a = bundlePages(shuffled, [100_001]);
    expect(comparePage(e.get(100_001)!, a.get(100_001))).toEqual([]);
    expect(e.get(100_001)!.passages.map((p) => p.id)).toEqual([10_000_001, 10_000_002, 10_000_003]);
  });

  test("satu harakat berbeda → perbedaan byte dilaporkan tanpa menyalin teks", () => {
    const e = bundlePages(rows(), [100_001]).get(100_001)!;
    const changed = rows();
    // Hapus satu fathah (U+064E, 2 byte): tampak sama bila harakat diabaikan, beda secara byte.
    changed.passage[1] = passage(10_000_001, 100_001, "body", 1, TEXT.replace("َ", ""));
    const diffs = comparePage(e, bundlePages(changed, [100_001]).get(100_001));
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toMatch(
      /paragraf 10000001: text_raw beda mulai byte 2 \(harapan \d+ byte, D1 \d+\)/,
    );
    expect(diffs[0]).not.toContain("ه");
  });

  test("penanda, tanda tinjau, jumlah paragraf, dan halaman hilang ikut terdeteksi", () => {
    const e = bundlePages(rows(), [100_001]).get(100_001)!;
    const r = rows();
    r.footnote_ref[0] = { ...r.footnote_ref[0]!, char_end: 7 };
    r.passage_needs_review = [];
    r.passage = r.passage.filter((p) => p.id !== 10_000_002);
    const diffs = comparePage(e, bundlePages(r, [100_001]).get(100_001));
    expect(diffs.join("\n")).toMatch(/jumlah paragraf 2, harapan 3/);
    expect(diffs.join("\n")).toMatch(/tautan penanda berbeda/);
    expect(diffs.join("\n")).toMatch(/tanda perlu ditinjau berbeda/);
    expect(comparePage(e, undefined)).toEqual(["halaman tidak ada di D1"]);
  });
});

describe("ringkasan dan daftar QA manusia", () => {
  test("summarize menghitung jenis paragraf, penanda, dan sha256 isi", () => {
    const b = bundlePages(rows(), [100_001]).get(100_001)!;
    const s = summarize(b);
    expect(s).toMatchObject({
      body: 2,
      foot: 1,
      refs: 1,
      review: 1,
      bytes: Buffer.byteLength(TEXT) * 3,
    });
    expect(s.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  test("pickForHuman: hanya halaman bercatatan kaki, bergiliran per juz", () => {
    const pages = [1, 1, 1, 2, 2, 3, 4, 4].map((juz, i) => ({
      page: page(100_001 + i, juz, i + 1),
      summary: { body: 1, foot: i === 1 ? 0 : 1, refs: 0, review: 0, bytes: 1, sha256: "" },
    }));
    const picked = pickForHuman(pages, 4);
    expect(picked.map((p) => p.juz)).toEqual([1, 2, 3, 4]);
    expect(pickForHuman(pages, 20)).toHaveLength(7);
  });

  test("scanUrl memakai selisih indeks per jilid", () => {
    expect(scanUrl(IHYA, 1, 191)).toBe(
      "https://archive.org/details/ihya-ghazali/iud-dm-001/page/n200/mode/1up",
    );
    expect(scanUrl(IHYA, 4, 497)).toBe(
      "https://archive.org/details/ihya-ghazali/iud-dm-004/page/n500/mode/1up",
    );
    expect(scanUrl(IHYA, 5, 1)).toBeNull();
    expect(scanUrl({ ...IHYA, scan: undefined }, 1, 1)).toBeNull();
  });
});
