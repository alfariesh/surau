import type { D1Db, D1Statement, D1Value } from "@surau/db";

// Pengukur D1 untuk header `Server-Timing` (S11 langkah 6): membungkus binding D1 dan menjumlahkan
// `meta.duration` (waktu SQL di server D1) dan `meta.rows_read` dari setiap hasil `all()`/`batch()`,
// plus jumlah bolak-balik ke D1. Tidak mengubah hasil; `first()` tidak membawa `meta` (tidak dihitung).

export interface D1Timing {
  /** Bolak-balik ke D1: satu per `all()`/`first()`/`batch()`. */
  calls: number;
  /** Jumlah `meta.duration` (ms). */
  duration: number;
  /** Jumlah `meta.rows_read`. */
  rowsRead: number;
}

const ORIGINAL = Symbol("d1-statement");

type Wrapped = D1Statement & { [ORIGINAL]: D1Statement };

interface D1Meta {
  meta?: { duration?: number; rows_read?: number };
}

export function timedD1(db: D1Db): { db: D1Db; timing: D1Timing } {
  const timing: D1Timing = { calls: 0, duration: 0, rowsRead: 0 };
  const record = (result: unknown): void => {
    const meta = (result as D1Meta | null)?.meta;
    timing.duration += meta?.duration ?? 0;
    timing.rowsRead += meta?.rows_read ?? 0;
  };
  const wrap = (stmt: D1Statement): Wrapped => ({
    [ORIGINAL]: stmt,
    bind: (...values: D1Value[]) => wrap(stmt.bind(...values)),
    all: async () => {
      timing.calls++;
      const result = await stmt.all();
      record(result);
      return result;
    },
    first: () => {
      timing.calls++;
      return stmt.first();
    },
  });
  return {
    timing,
    db: {
      prepare: (query) => wrap(db.prepare(query)),
      batch: async (statements) => {
        timing.calls++;
        const results = await db.batch(
          statements.map((s) => (s as Partial<Wrapped>)[ORIGINAL] ?? s),
        );
        for (const r of results) record(r);
        return results;
      },
    },
  };
}

/** Nilai header `Server-Timing`: waktu SQL D1 (+ bolak-balik, baris dibaca) dan total handler. */
export function serverTiming(timing: D1Timing, totalMs: number): string {
  return [
    `d1;dur=${timing.duration.toFixed(1)};desc="calls=${timing.calls} rows_read=${timing.rowsRead}"`,
    `total;dur=${totalMs.toFixed(1)}`,
  ].join(", ");
}
