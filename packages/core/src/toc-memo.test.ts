import { env } from "cloudflare:workers";
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";

import { ED, T_ROOT, seedCore } from "../test/fixture.ts";
import { getToc } from "./toc.ts";

const db = env.CORPUS;
const KEYS = ["corpus_version", "built_at", "source_hash"];

async function setMeta(builtAt: string): Promise<void> {
  await db.batch(
    [
      ["corpus_version", "memo-v1"],
      ["built_at", builtAt],
      ["source_hash", "sha256:memo"],
    ].map(([k, v]) =>
      db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").bind(k, v),
    ),
  );
}

const rename = (title: string) =>
  db.prepare("UPDATE toc_node SET title_ar = ? WHERE id = ?").bind(title, T_ROOT).run();

const rootTitle = async () => (await getToc(db, ED, { depth: 1 })).nodes[0]?.title_ar;

beforeAll(async () => {
  await seedCore(db);
});

afterAll(async () => {
  await db.batch(KEYS.map((k) => db.prepare("DELETE FROM meta WHERE key = ?").bind(k)));
  await seedCore(db);
});

describe("memo daftar isi per versi korpus (#66)", () => {
  test("meta sama → pohon tidak dibaca ulang; meta berubah (build lain) → dibaca ulang", async () => {
    await setMeta("2026-10-20T00:00:00.000Z");
    await rename("عنوان أول");
    expect(await rootTitle()).toBe("عنوان أول");
    // Isi berubah tanpa build baru (tidak terjadi di produksi): memo tetap dipakai.
    await rename("عنوان ثان");
    expect(await rootTitle()).toBe("عنوان أول");
    // Korpus/build lain = meta lain = kunci lain.
    await setMeta("2026-10-21T00:00:00.000Z");
    expect(await rootTitle()).toBe("عنوان ثان");
  });

  test("node baru yang belum ada di memo (korpus dimuat ulang, commit sama) → dibaca ulang, bukan NotFound", async () => {
    await setMeta("2026-10-22T00:00:00.000Z");
    await rootTitle();
    await db
      .prepare(
        `INSERT INTO toc_node (id, edition_id, parent_id, ord, level, title_ar, start_page_id, source_title_id, patched)
         SELECT edition_id * 100000 + 999, edition_id, id, 99, level + 1, title_ar, start_page_id, NULL, 1
         FROM toc_node WHERE id = ?`,
      )
      .bind(T_ROOT)
      .run();
    const fresh = await getToc(db, ED, { nodeId: ED * 100000 + 999, depth: 1 });
    expect(fresh.nodes[0]?.id).toBe(ED * 100000 + 999);
    await db
      .prepare("DELETE FROM toc_node WHERE id = ?")
      .bind(ED * 100000 + 999)
      .run();
  });

  test("tanpa corpus_version/built_at/source_hash (fixture, korpus lama) → tanpa memo", async () => {
    await db.batch(KEYS.map((k) => db.prepare("DELETE FROM meta WHERE key = ?").bind(k)));
    await rename("عنوان ثالث");
    expect(await rootTitle()).toBe("عنوان ثالث");
    await rename("عنوان رابع");
    expect(await rootTitle()).toBe("عنوان رابع");
  });
});
