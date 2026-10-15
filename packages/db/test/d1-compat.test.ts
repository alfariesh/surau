// Penjaga tipe: binding D1 asli Worker harus bisa dipakai di mana repository meminta D1Db.
// Bila tipe struktural di src/d1.ts menyimpang dari D1Database, file ini gagal typecheck.
import { env } from "cloudflare:workers";
import { expect, test } from "vite-plus/test";

import type { D1Db } from "../src/d1.ts";

test("D1Database memenuhi D1Db", async () => {
  const db: D1Db = env.CORPUS;
  const r = await db.prepare("SELECT 1 AS one").first();
  expect(r).toEqual({ one: 1 });
});
