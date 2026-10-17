import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, test } from "vite-plus/test";

import { DatasetError, mergeSets, parseJsonl, parseLabel } from "./dataset.ts";

const ok = {
  id: "r01",
  pertanyaan: "Di mana al-Ghazali membahas sabar?",
  kueri: "sabar",
  lokasi_benar: [{ toc_node_id: 100196, label: "j4 h60" }],
  jenis: "lokasi",
  catatan: "contoh",
  disetujui_oleh: null,
};
const line = (o: object) => JSON.stringify(o);

describe("parseJsonl", () => {
  test("baris kosong dilewati, set dicatat", () => {
    const qs = parseJsonl(`${line(ok)}\n\n${line({ ...ok, id: "r02" })}\n`, "a.jsonl", "publik");
    expect(qs.map((q) => [q.id, q.set])).toEqual([
      ["r01", "publik"],
      ["r02", "publik"],
    ]);
  });

  test("rentang halaman dan persetujuan", () => {
    const [q] = parseJsonl(
      line({
        ...ok,
        lokasi_benar: [{ page_id: 100900, sampai_page_id: 100905, label: "j3 h143–148" }],
        disetujui_oleh: "Pemilik (2026-10-17)",
      }),
      "a.jsonl",
      "privat",
    );
    expect(q?.lokasi_benar[0]).toMatchObject({ sampai_page_id: 100905 });
    expect(q?.disetujui_oleh).toBe("Pemilik (2026-10-17)");
  });

  test("kesalahan menyebut berkas dan nomor baris", () => {
    expect(() => parseJsonl(`${line(ok)}\n{rusak`, "a.jsonl", "publik")).toThrow(/a\.jsonl:2/);
    for (const bad of [
      { ...ok, jenis: "lain" },
      { ...ok, lokasi_benar: [] },
      { ...ok, lokasi_benar: [{ toc_node_id: 1, label: "jilid 1" }] },
      { ...ok, lokasi_benar: [{ page_id: 5, sampai_page_id: 5, label: "j1 h5" }] },
      { ...ok, id: "R1" },
      { ...ok, tambahan: 1 },
      { ...ok, disetujui_oleh: "" },
    ]) {
      expect(() => parseJsonl(line(bad), "b.jsonl", "publik")).toThrow(DatasetError);
    }
  });
});

test("mergeSets menolak ID ganda antar set", () => {
  const a = parseJsonl(line(ok), "a", "publik");
  const b = parseJsonl(line(ok), "b", "privat");
  expect(() => mergeSets(a, b)).toThrow(/r01/);
});

test("parseLabel", () => {
  expect(parseLabel("j1 h55")).toEqual({ juz: 1, from: 55, to: 55 });
  expect(parseLabel("j2 h56–59")).toEqual({ juz: 2, from: 56, to: 59 });
  expect(() => parseLabel("j2 h56-59")).toThrow(DatasetError);
});

test("dataset publik di repo sah (format, ID unik, prefiks r)", () => {
  const dir = resolve(import.meta.dirname, "../../../evals/retrieval");
  const qs = mergeSets(
    ...readdirSync(dir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => parseJsonl(readFileSync(join(dir, f), "utf8"), f, "publik")),
  );
  expect(qs.length).toBeGreaterThanOrEqual(20);
  expect(qs.every((q) => q.id.startsWith("r"))).toBe(true);
});
