import { expect, test } from "vite-plus/test";

import type { LoadedQuestion } from "./dataset.ts";
import { renderReport } from "./report.ts";
import type { QuestionRun } from "./report.ts";

const q = (id: string, set: "publik" | "privat", disetujui: string | null): LoadedQuestion => ({
  id,
  set,
  pertanyaan: `Pertanyaan rahasia ${id}?`,
  kueri: `kueri-${id}`,
  lokasi_benar: [{ toc_node_id: 100196, label: "j4 h60" }],
  jenis: "lokasi",
  catatan: `catatan-${id}`,
  disetujui_oleh: disetujui,
});
const run = (question: LoadedQuestion, rank: number | null): QuestionRun => ({
  question,
  judgement: { rank, foundAt10: rank !== null && rank <= 10 ? 1 : 0 },
  unranked: false,
  goldCount: 1,
  paths: ["translation", "summary"],
  warning: null,
  totalPages: 7,
  top: [{ label: "j4 h61 بيان فضيلة الصبر" }],
  ms: 12,
});
const info = {
  date: "2026-10-17",
  source: "lokal",
  meta: { corpus_version: "ihya-v5", schema_version: "6" },
  gitSha: "abc1234",
  searchResultVersion: 1,
  privateIncluded: true,
};

test("soal privat hanya tampil sebagai ID, jenis, dan peringkat", () => {
  const md = renderReport(info, [
    run(q("r01", "publik", "Pemilik"), 1),
    run(q("p02", "privat", "Pemilik"), null),
  ]);
  expect(md).toContain("kueri-r01");
  expect(md).toContain("| p02 | lokasi | > 50 | ya |");
  for (const secret of ["kueri-p02", "rahasia p02", "catatan-p02"])
    expect(md).not.toContain(secret);
});

test("gerbang: hanya soal disetujui, minimal 20 soal, hit@10 ≥ 90%", () => {
  const draft = renderReport(info, [run(q("r01", "publik", null), 1)]);
  expect(draft).toContain("belum ada soal yang disetujui");
  const ten = renderReport(
    info,
    Array.from({ length: 10 }, (_, i) => run(q(`r${10 + i}`, "publik", "Pemilik"), 1)),
  );
  expect(ten).toContain("baru 10 soal disetujui (perlu ≥ 20) → **BELUM LOLOS**");
  const md = renderReport(info, [
    ...Array.from({ length: 18 }, (_, i) => run(q(`r${10 + i}`, "publik", "Pemilik"), 1)),
    run(q("p40", "privat", "Pemilik"), 3),
    run(q("r30", "publik", "Pemilik"), 11),
    run(q("r31", "publik", null), null),
  ]);
  expect(md).toContain("hit@10 = 95,0% atas 20 soal disetujui → **LOLOS**");
  expect(md).toContain("## Soal publik yang gagal");
  expect(md).toContain("**r31**");
});

test("baris bahasa kueri menurut huruf, termasuk campuran", () => {
  const ar = { ...q("r01", "publik", null), kueri: "الصبر" };
  const mix = { ...q("r02", "publik", null), kueri: "الصبر sabar" };
  const md = renderReport(info, [run(ar, 1), run(mix, 2), run(q("r03", "publik", null), 3)]);
  expect(md).toContain("| kueri arab | 1 |");
  expect(md).toContain("| kueri indonesia | 1 |");
  expect(md).toContain("| kueri campuran | 1 |");
});

test("hasil tanpa peringkat ditandai", () => {
  const md = renderReport(info, [{ ...run(q("r01", "publik", null), null), unranked: true }]);
  expect(md).toContain("| r01 | lokasi | kueri-r01 | tanpa peringkat |");
});
