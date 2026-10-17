// Format soal eval retrieval (S15, docs/06-evaluasi.md): satu soal per baris JSONL.
// - `pertanyaan`: pertanyaan wajar untuk manusia ("Di mana al-Ghazali membahas X?");
// - `kueri`: teks yang diketik pengguna di kotak Cari, dikirim apa adanya ke `searchText`;
// - `lokasi_benar`: satu atau lebih lokasi (bagian daftar isi beserta turunannya, atau rentang
//   halaman cetak); `label` (mis. "j1 h55" / "j2 h56–59") dicek runner terhadap DB;
// - `disetujui_oleh`: null = draf; hanya soal yang disetujui masuk set resmi (T-12).
// Soal publik di evals/retrieval/, soal privat di evals/private/ (git-ignored, salinan di R2).
import { SEARCH_QUERY_MAX } from "@surau/core";
import { z } from "zod";

const id = z.number().int().positive();

/** Label lokasi: jilid + halaman cetak, satu halaman atau rentang dalam satu jilid. */
const LABEL = /^j(\d+) h(\d+)(?:–(\d+))?$/u;

export const tocLocation = z.strictObject({
  toc_node_id: id.describe("Bagian daftar isi; turunannya ikut dihitung benar"),
  label: z.string().regex(LABEL).describe("Halaman awal bagian, mis. j1 h55"),
});

export const pageLocation = z
  .strictObject({
    page_id: id.describe("Halaman cetak (awal rentang)"),
    sampai_page_id: id.optional().describe("Akhir rentang (inklusif), urutan halaman edisi"),
    label: z.string().regex(LABEL).describe("Halaman atau rentang, mis. j2 h56–59"),
  })
  // Urutan rentang dicek di `resolveLocation` menurut jilid + halaman cetak, bukan urutan ID.
  .refine((l) => l.sampai_page_id !== l.page_id, {
    message: "rentang satu halaman: hapus sampai_page_id",
  });

export const location = z.union([tocLocation, pageLocation]);
export type Location = z.infer<typeof location>;

export const QUESTION_KINDS = ["lokasi", "topik tersebar", "istilah"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const question = z.strictObject({
  id: z.string().regex(/^[a-z][0-9]{2,3}$/u, "id seperti r01 (publik) atau p03 (privat)"),
  pertanyaan: z.string().min(1),
  kueri: z.string().min(1).max(SEARCH_QUERY_MAX),
  lokasi_benar: z.array(location).min(1),
  jenis: z.enum(QUESTION_KINDS),
  catatan: z.string(),
  disetujui_oleh: z.string().min(1).nullable(),
});
export type Question = z.infer<typeof question>;

/** Asal soal: publik (di git) atau privat (holdout, tidak pernah ditulis teksnya ke laporan). */
export type QuestionSet = "publik" | "privat";

export interface LoadedQuestion extends Question {
  set: QuestionSet;
}

export class DatasetError extends Error {
  override name = "DatasetError";
}

/**
 * Urai satu berkas JSONL; baris kosong dilewati, kesalahan menyebut berkas dan nomor baris. Untuk
 * soal privat pesan tidak memuat isi baris (log CI publik): hanya nama field yang salah.
 */
export function parseJsonl(text: string, file: string, set: QuestionSet): LoadedQuestion[] {
  const out: LoadedQuestion[] = [];
  for (const [i, line] of text.split("\n").entries()) {
    if (line.trim() === "") continue;
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch (e) {
      const why = set === "privat" ? "isi disembunyikan" : (e as Error).message;
      throw new DatasetError(`${file}:${i + 1}: JSON tidak sah (${why})`);
    }
    const parsed = question.safeParse(raw);
    if (!parsed.success) {
      const why =
        set === "privat"
          ? `field tidak sah: ${parsed.error.issues.map((x) => x.path.join(".") || "(baris)").join(", ")}`
          : z.prettifyError(parsed.error);
      throw new DatasetError(`${file}:${i + 1}: ${why}`);
    }
    out.push({ ...parsed.data, set });
  }
  return out;
}

/** Gabungkan set dan tolak ID ganda (ID dipakai di laporan dan riwayat angka). */
export function mergeSets(...sets: LoadedQuestion[][]): LoadedQuestion[] {
  const all = sets.flat();
  const seen = new Set<string>();
  for (const q of all) {
    if (seen.has(q.id)) throw new DatasetError(`ID soal ganda: ${q.id}`);
    seen.add(q.id);
  }
  return all;
}

/** Bagian label: jilid, halaman awal, halaman akhir (sama dengan awal bila satu halaman). */
export function parseLabel(label: string): { juz: number; from: number; to: number } {
  const m = LABEL.exec(label);
  if (m === null) throw new DatasetError(`label tidak sah: ${label}`);
  const from = Number(m[2]);
  return { juz: Number(m[1]), from, to: m[3] === undefined ? from : Number(m[3]) };
}
