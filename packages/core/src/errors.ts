// Error bertipe core tools (KONVENSI: lempar error bertipe di packages/*, petakan di apps/*).
// Pesannya kontrak publik (UI, MCP), jadi berbahasa Inggris, singkat, dan hanya menyebut alamat
// yang diminta: tanpa SQL, stack, nama tabel, atau isi DB. apps/* memetakan `code` ke status HTTP
// (not_found → 404, invalid_citation/invalid_query → 400, unavailable → 503) dan ke string UI
// berbahasa Indonesia.
// Error lain (ZodError baris DB salah bentuk, kegagalan D1) sengaja tidak dibungkus: itu masalah
// internal, dan apps/* menampilkannya sebagai galat umum tanpa detail.
import type { z } from "zod";

export type CoreErrorCode = "not_found" | "invalid_citation" | "invalid_query" | "unavailable";

export class CoreError extends Error {
  readonly code: CoreErrorCode;

  constructor(code: CoreErrorCode, message: string) {
    super(message);
    this.name = "CoreError";
    this.code = code;
  }
}

/** Alamat sah, tetapi tidak ada di korpus (karya, edisi, halaman, node, paragraf). */
export class NotFound extends CoreError {
  constructor(message: string) {
    super("not_found", message);
    this.name = "NotFound";
  }
}

/** Alamat salah bentuk: juz/halaman bukan bilangan bulat, cursor rusak, kedalaman di luar batas. */
export class InvalidCitation extends CoreError {
  constructor(message: string) {
    super("invalid_citation", message);
    this.name = "InvalidCitation";
  }
}

/** Kueri pencarian salah bentuk: kosong, terlalu panjang, opsi di luar batas (S11). */
export class InvalidQuery extends CoreError {
  constructor(message: string) {
    super("invalid_query", message);
    this.name = "InvalidQuery";
  }
}

/**
 * Fitur belum tersedia di korpus yang terpasang: mis. pencarian di korpus tanpa indeks FTS
 * (skema < 4, `ihya-v1`) atau indeks yang dibangun dengan `NORM_VERSION` lain (S11).
 */
export class Unavailable extends CoreError {
  constructor(message: string) {
    super("unavailable", message);
    this.name = "Unavailable";
  }
}

export function isCoreError(error: unknown): error is CoreError {
  return error instanceof CoreError;
}

/**
 * Validasi masukan dengan skema Zod; gagal → `InvalidCitation` (atau `Invalid`, mis. `InvalidQuery`)
 * dengan isu pertama saja (`juz: Too small: expected number to be >0`). Pesan Zod hanya menyebut
 * nilai masukan.
 */
export function parseInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
  Invalid: new (message: string) => CoreError = InvalidCitation,
): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const where = issue === undefined || issue.path.length === 0 ? "input" : issue.path.join(".");
  throw new Invalid(`Invalid ${where}: ${issue?.message ?? "invalid value"}`);
}
