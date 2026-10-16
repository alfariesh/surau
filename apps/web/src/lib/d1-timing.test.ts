import type { D1Db, D1Statement } from "@surau/db";

import { describe, expect, it } from "vite-plus/test";

import { serverTiming, timedD1 } from "./d1-timing";

// D1 tiruan: setiap hasil membawa `meta` seperti binding Workers.
function fakeD1(): { db: D1Db; seen: unknown[] } {
  const seen: unknown[] = [];
  const stmt = (sql: string, args: unknown[] = []): D1Statement => ({
    bind: (...values) => stmt(sql, values),
    all: async () => ({ results: [{ sql, args }], meta: { duration: 1.5, rows_read: 10 } }),
    first: async () => ({ sql, args }),
  });
  return {
    seen,
    db: {
      prepare: (sql) => stmt(sql),
      batch: async (statements) => {
        seen.push(...statements);
        return Promise.all(statements.map((s) => s.all()));
      },
    },
  };
}

describe("timedD1", () => {
  it("menjumlahkan meta.duration dan rows_read; batch = satu bolak-balik", async () => {
    const fake = fakeD1();
    const { db, timing } = timedD1(fake.db);
    const one = await db.prepare("SELECT ?").bind(1).all();
    expect(one.results).toEqual([{ sql: "SELECT ?", args: [1] }]);
    await db.batch([db.prepare("A"), db.prepare("B").bind("x")]);
    expect(await db.prepare("C").first()).toEqual({ sql: "C", args: [] });
    expect(timing).toEqual({ calls: 3, duration: 4.5, rowsRead: 30 });
    // Statement asli (bukan pembungkus) yang sampai ke binding batch.
    expect(fake.seen.every((s) => !Object.getOwnPropertySymbols(s).length)).toBe(true);
  });

  it("hasil tanpa meta (dev lokal) tidak menambah angka", async () => {
    const plain: D1Db = {
      prepare: () => ({
        bind: () => plain.prepare(""),
        all: async () => ({ results: [] }),
        first: async () => null,
      }),
      batch: async () => [{ results: [] }],
    };
    const { db, timing } = timedD1(plain);
    await db.prepare("x").all();
    await db.batch([db.prepare("y")]);
    expect(timing).toEqual({ calls: 2, duration: 0, rowsRead: 0 });
  });

  it("format Server-Timing", () => {
    expect(serverTiming({ calls: 2, duration: 3.14, rowsRead: 2929 }, 12.345)).toBe(
      'd1;dur=3.1;desc="calls=2 rows_read=2929", total;dur=12.3',
    );
  });
});
