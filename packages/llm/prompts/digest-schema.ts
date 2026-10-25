// Skema keluaran terstruktur Intisari (X15b), dipakai semua versi prompt `digest-section@N` dan
// `digest-merge@N`. Batas structured outputs (docs 2026-10-24): `additionalProperties: false`
// wajib, maksimal 24 field opsional dan 16 union, `minItems` hanya 0/1, tanpa `minLength`,
// `maxItems`, atau batas angka. Karena itu semua field wajib, tidak ada union, dan jumlah serta
// panjang dicek validator (`judgeDigest`). Tidak ada field "alasan"/"pikiran" (bisa memicu refusal
// `reasoning_extraction`). Keluaran hanya ID dan teks Indonesia, tanpa huruf Arab.
import { GLOSSARY_TERM_KEYS } from "./glossary-v2.ts";

const text = { type: "string" } as const;
const texts = { type: "array", items: text } as const;
const terms = { type: "array", items: { type: "string", enum: GLOSSARY_TERM_KEYS } } as const;

const point = {
  type: "object",
  properties: {
    judul: text,
    isi: text,
    sikap: { type: "string", enum: ["author", "reported", "refuted"] },
    jenis: { type: "string", enum: ["idea", "advice"] },
    dasar: texts,
    pertanyaan: texts,
  },
  required: ["judul", "isi", "sikap", "jenis", "dasar", "pertanyaan"],
  additionalProperties: false,
} as const;

/** Intisari dari blok teks: kutipan = rentang blok + penunjuk awal/akhir + terjemahannya. */
export const DIGEST_LEAF_SCHEMA = {
  type: "object",
  properties: {
    abstrak: text,
    gagasan: { type: "array", items: point },
    kutipan: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dari: text,
          sampai: text,
          // Penunjuk Arab pendek (digest-section@2): dicari kode di rentang blok, lalu dibuang.
          awal: text,
          akhir: text,
          gagasan: { type: "integer" },
          terjemahan: text,
        },
        required: ["dari", "sampai", "awal", "akhir", "gagasan", "terjemahan"],
        additionalProperties: false,
      },
    },
    istilah: terms,
  },
  required: ["abstrak", "gagasan", "kutipan", "istilah"],
  additionalProperties: false,
} as const;

const mergeQuotes = {
  type: "array",
  items: {
    type: "object",
    properties: { id: text, gagasan: { type: "integer" } },
    required: ["id", "gagasan"],
    additionalProperties: false,
  },
} as const;

/** Intisari Bab dari Intisari anak: kutipan = ID kutipan anak. */
export const DIGEST_MERGE_SCHEMA = {
  type: "object",
  properties: {
    abstrak: text,
    gagasan: { type: "array", items: point },
    kutipan: mergeQuotes,
    istilah: terms,
  },
  required: ["abstrak", "gagasan", "kutipan", "istilah"],
  additionalProperties: false,
} as const;

/** Intisari Kitab: seperti Intisari Bab, ditambah pembuka dan penutup (wajib, CHECK `digest`). */
export const DIGEST_BOOK_SCHEMA = {
  type: "object",
  properties: {
    pembuka: text,
    abstrak: text,
    gagasan: { type: "array", items: point },
    kutipan: mergeQuotes,
    istilah: terms,
    penutup: text,
  },
  required: ["pembuka", "abstrak", "gagasan", "kutipan", "istilah", "penutup"],
  additionalProperties: false,
} as const;
