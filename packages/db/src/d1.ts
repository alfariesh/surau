// Bentuk minimal D1 yang dipakai repository. Sengaja struktural (bukan tipe global
// `D1Database` dari `wrangler types`/workers-types), supaya @surau/db bisa di-typecheck dari
// mana saja (Worker, Next, tools/ingest di Node) tanpa tipe ambien Cloudflare. `env.DB` milik
// Worker memenuhi tipe ini; tes D1 memeriksanya saat typecheck (test/d1-compat.test.ts).

/** Nilai yang bisa diikat ke parameter `?` D1. */
export type D1Value = string | number | null | ArrayBuffer;

export interface D1Statement {
  bind(...values: D1Value[]): D1Statement;
  all(): Promise<{ results: unknown[] }>;
  first(): Promise<unknown>;
}

export interface D1Db {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<{ results: unknown[] }[]>;
}

/** Batas D1: maksimal 100 parameter terikat per query (ARSITEKTUR-TEKNIS §8). */
export const D1_MAX_PARAMS = 100;

/** Pecah daftar menjadi potongan berukuran `size` (untuk query `IN (?, …)` ≤100 parameter). */
export function chunk<T>(items: readonly T[], size: number = D1_MAX_PARAMS): T[][] {
  if (!Number.isInteger(size) || size < 1)
    throw new RangeError(`ukuran potongan tidak sah: ${size}`);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** `?, ?, ?` sebanyak `n` (n ≥ 1). */
export function placeholders(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > D1_MAX_PARAMS) {
    throw new RangeError(`jumlah parameter harus 1..${D1_MAX_PARAMS}: ${n}`);
  }
  return Array.from({ length: n }, () => "?").join(", ");
}
