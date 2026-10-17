import { describe, expect, test } from "vite-plus/test";

import { buildCorpusIndex, resolveLocation, subtree } from "./corpus.ts";
import { DatasetError } from "./dataset.ts";

// Korpus buatan: edisi 1, jilid 1 halaman 1–4 (ID sengaja tidak urut halaman) dan jilid 2 halaman 1.
const index = buildCorpusIndex(
  [{ key: "corpus_version", value: "uji-v1" }],
  [
    { id: 100001, edition_id: 1, juz: 1, page_no: 1 },
    { id: 100002, edition_id: 1, juz: 1, page_no: 2 },
    { id: 100009, edition_id: 1, juz: 1, page_no: 3 },
    { id: 100004, edition_id: 1, juz: 1, page_no: 4 },
    { id: 100005, edition_id: 1, juz: 2, page_no: 1 },
  ],
  [
    { id: 10, parent_id: null, start_page_id: 100001 },
    { id: 11, parent_id: 10, start_page_id: 100002 },
    { id: 12, parent_id: 11, start_page_id: 100009 },
    { id: 13, parent_id: null, start_page_id: 100005 },
  ],
);

const pub = { id: "r01", set: "publik" } as const;

test("subtree memuat node dan seluruh turunannya", () => {
  expect([...subtree(index, 10)].toSorted((a, b) => a - b)).toEqual([10, 11, 12]);
  expect([...subtree(index, 12)]).toEqual([12]);
});

describe("resolveLocation", () => {
  test("bagian daftar isi → node + turunan; label = halaman awal node", () => {
    const g = resolveLocation(index, { toc_node_id: 11, label: "j1 h2" }, pub);
    expect([...g.tocNodeIds].toSorted((a, b) => a - b)).toEqual([11, 12]);
    expect(g.pageIds.size).toBe(0);
  });

  test("rentang halaman menurut jilid + halaman cetak, bukan urutan ID", () => {
    const g = resolveLocation(
      index,
      { page_id: 100002, sampai_page_id: 100004, label: "j1 h2–4" },
      pub,
    );
    expect([...g.pageIds].toSorted((a, b) => a - b)).toEqual([100002, 100004, 100009]);
    const one = resolveLocation(index, { page_id: 100005, label: "j2 h1" }, pub);
    expect([...one.pageIds]).toEqual([100005]);
  });

  test("label tidak sama dengan DB atau ID tidak ada → gagal keras", () => {
    for (const loc of [
      { toc_node_id: 11, label: "j1 h3" },
      { toc_node_id: 99, label: "j1 h1" },
      { page_id: 100002, sampai_page_id: 100004, label: "j1 h2–5" },
      { page_id: 100004, sampai_page_id: 100005, label: "j1 h4–1" },
      { page_id: 123, label: "j1 h1" },
    ]) {
      expect(() => resolveLocation(index, loc, pub)).toThrow(DatasetError);
    }
  });

  test("soal privat: pesan galat tanpa label atau letak (log CI publik)", () => {
    const loc = { page_id: 100002, sampai_page_id: 100004, label: "j1 h2–5" };
    expect(() => resolveLocation(index, loc, pub)).toThrow(/j1 h2–5/);
    expect(() => resolveLocation(index, loc, { id: "p07", set: "privat" }, 2)).toThrow(
      /^p07: lokasi ke-2 tidak cocok dengan DB \(rincian disembunyikan, soal privat\)$/,
    );
  });
});
