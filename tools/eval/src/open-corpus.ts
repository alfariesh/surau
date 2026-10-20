import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { D1Db, D1Statement } from "@surau/db";

/**
 * Batasi kueri D1 yang berjalan bersamaan. Proxy remote (`getPlatformProxy`, sesi edge-preview)
 * memutus koneksi ("Network connection lost") saat pipeline Jawab menjalankan ±20 pencarian
 * paralel (S19); di Worker sungguhan tidak perlu.
 */
export function limitD1(db: D1Db, max: number): D1Db {
  let active = 0;
  const waiting: (() => void)[] = [];
  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    while (active >= max) await new Promise<void>((r) => waiting.push(r));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
  // Statement asli disimpan di WeakMap (bukan properti `raw`, yang bentrok dengan
  // D1PreparedStatement.raw()) supaya `batch` menerima statement milik binding aslinya.
  const original = new WeakMap<D1Statement, D1Statement>();
  const wrap = (stmt: D1Statement): D1Statement => {
    const wrapped: D1Statement = {
      bind: (...values) => wrap(stmt.bind(...values)),
      all: () => run(() => stmt.all()),
      first: () => run(() => stmt.first()),
    };
    original.set(wrapped, stmt);
    return wrapped;
  };
  return {
    prepare: (q) => wrap(db.prepare(q)),
    batch: (stmts) => run(() => db.batch(stmts.map((s) => original.get(s) ?? s))),
  };
}

/** Eval membaca salinan state lokal atau staging; tidak pernah menulis korpus produksi. */
export async function openCorpus(repo: string, remote: boolean) {
  const { getPlatformProxy } = await import("wrangler");
  const configPath = join(repo, "tools/eval/wrangler.jsonc");
  if (remote) {
    const proxy = await getPlatformProxy<{ CORPUS: D1Db }>({ configPath, remoteBindings: true });
    return { db: limitD1(proxy.env.CORPUS, 2), source: "staging (remote)", dispose: proxy.dispose };
  }
  // SURAU_EVAL_STATE = folder `--persist-to` lain (mis. korpus build baru yang dimuat terpisah,
  // tanpa menimpa D1 lokal bersama yang mungkin sedang dipakai dev server).
  const state = join(process.env.SURAU_EVAL_STATE ?? join(repo, ".wrangler/state"), "v3/d1");
  if (!existsSync(state))
    throw new Error("D1 lokal belum ada; jalankan db:migrate:local dan corpus:load:local.");
  const tmp = mkdtempSync(join(tmpdir(), "surau-eval-"));
  try {
    cpSync(state, join(tmp, "v3/d1"), { recursive: true });
    const proxy = await getPlatformProxy<{ CORPUS: D1Db }>({
      configPath,
      remoteBindings: false,
      persist: { path: join(tmp, "v3") },
    });
    return {
      db: proxy.env.CORPUS,
      source: "lokal",
      dispose: async () => {
        await proxy.dispose();
        rmSync(tmp, { recursive: true, force: true });
      },
    };
  } catch (error) {
    rmSync(tmp, { recursive: true, force: true });
    throw error;
  }
}
