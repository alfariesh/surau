// Uji ujung-ke-ujung pipeline ingest dengan kitab BUATAN (test/fixture.ts): baca Shamela tiruan,
// daftar isi + patch, QA OpenITI tiruan, validasi, SQL, .sqlite, peta ID, dan laporan.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, test } from "vite-plus/test";

import { buildTimestamp, runIngest } from "../src/pipeline.ts";
import { MAX_STATEMENT_BYTES } from "../src/sql.ts";
import { createFixture } from "./fixture.ts";

const env = { SOURCE_DATE_EPOCH: "1760000000" };

function open(path: string): DatabaseSync {
  return new DatabaseSync(path, { readOnly: true });
}

describe("runIngest (kitab buatan)", () => {
  test("lolos validasi dan menulis baris yang benar ke .sqlite", () => {
    const { config, paths } = createFixture();
    const r = runIngest(config, paths, { env });
    expect(r.validation.invariants.filter((i) => !i.ok)).toEqual([]);
    expect(r.output?.counts).toEqual({
      author: 1,
      work: 1,
      edition: 1,
      page: 5,
      toc_node: 6,
      passage: 18,
      footnote_ref: 2,
      passage_needs_review: 4,
      meta: 5,
    });

    const db = open(r.output?.sqlite ?? "");
    const q = <T>(sql: string, ...args: (string | number)[]): T[] =>
      db.prepare(sql).all(...args) as unknown as T[];
    // Metadata disalin dari master Shamela; penerbit dan kota dipisah dari baris "الناشر:".
    expect(q("SELECT publisher, city, volumes, source_ref FROM edition")).toEqual([
      { publisher: "دار التجربة", city: "مدينة", volumes: 2, source_ref: "1234" },
    ]);
    expect(q("SELECT key, value FROM meta ORDER BY key")).toEqual([
      { key: "built_at", value: "2025-10-09T08:53:20.000Z" },
      { key: "corpus_version", value: "uji-v1" },
      { key: "norm_version", value: "1" },
      { key: "schema_version", value: "2" },
      { key: "source_hash", value: expect.stringMatching(/^sha256:[0-9a-f]{64}$/) },
    ]);

    // Daftar isi setelah patch: judul 3 pindah ke rub' 1, node "dzikr" ditambah dengan judul
    // yang disalin dari halaman 5.
    const toc = q<{
      id: number;
      parent_id: number | null;
      ord: number;
      level: number;
      title_ar: string;
      source_title_id: number | null;
      patched: number;
    }>(
      "SELECT id, parent_id, ord, level, title_ar, source_title_id, patched FROM toc_node ORDER BY id",
    );
    const byTitle = new Map(toc.map((n) => [n.source_title_id, n]));
    expect(byTitle.get(3)).toMatchObject({
      parent_id: byTitle.get(1)?.id,
      level: 2,
      ord: 2,
      patched: 1,
    });
    expect(byTitle.get(null)).toMatchObject({
      title_ar: "كتاب الذكر",
      parent_id: byTitle.get(4)?.id,
      level: 2,
      ord: 2,
      patched: 1,
    });
    expect(toc.filter((n) => n.patched === 0)).toHaveLength(4);

    // Paragraf mengikuti judul: span rub' di tengah baris 0 halaman 4, kitab di baris 1.
    const node = (seq: number) =>
      q<{ toc_node_id: number }>(
        "SELECT toc_node_id FROM passage p JOIN page g ON g.id = p.page_id WHERE g.source_page_id = ? AND p.kind = 'body' ORDER BY ord",
        seq,
      ).map((x) => x.toc_node_id);
    expect(node(1)).toEqual([byTitle.get(2)?.id, byTitle.get(2)?.id]);
    expect(node(4)).toEqual([byTitle.get(4)?.id, byTitle.get(5)?.id, byTitle.get(5)?.id]);
    expect(node(5)).toEqual([byTitle.get(5)?.id, byTitle.get(null)?.id, byTitle.get(null)?.id]);

    // Takhrij menempel dipotong ke catatan kaki; teks mentah tidak berubah selain pemisah.
    const page2 = q<{ kind: string; ord: number; text_raw: string }>(
      "SELECT kind, ord, text_raw FROM passage p JOIN page g ON g.id = p.page_id WHERE g.source_page_id = 2 ORDER BY kind, ord",
    );
    expect(page2.map((p) => p.text_raw)).toEqual([
      "فصل في العمل",
      "قال الشيخ الصبر ضياء",
      "والعمل ثمرة العلم (١).",
      "(١) هذا كلام مصنوع للتجربة\nوله تتمة في سطر ثان",
      "حديث الصبر ضياء أخرجه مسلم من حديث فلان",
    ]);

    // Penanda (١) menunjuk catatan kaki bernomor sama; offset = indeks string di text_raw.
    const refs = q<{
      text_raw: string;
      char_start: number;
      char_end: number;
      marker: string;
      foot: string;
    }>(
      `SELECT b.text_raw, r.char_start, r.char_end, r.marker, f.text_raw AS foot
       FROM footnote_ref r JOIN passage b ON b.id = r.passage_id JOIN passage f ON f.id = r.footnote_passage_id`,
    );
    expect(refs).toHaveLength(2);
    for (const ref of refs) {
      expect(ref.text_raw.slice(ref.char_start, ref.char_end)).toBe("(١)");
      expect(ref.marker).toBe("١");
      expect(ref.foot.startsWith("(١)")).toBe(true);
    }

    const review = q<{ reason: string; text_raw: string }>(
      "SELECT n.reason, p.text_raw FROM passage_needs_review n JOIN passage p ON p.id = n.passage_id ORDER BY n.reason",
    );
    expect(review.map((r) => r.reason)).toEqual([
      "inline_unsplit",
      "takhrij_inline",
      "takhrij_inline",
      "takhrij_unmatched",
    ]);
    expect(review[0]?.text_raw).toContain("//");
    db.close();
  });

  test("catatan kaki tanpa padanan di JK ditandai takhrij_unmatched", () => {
    const { config, paths } = createFixture();
    const r = runIngest(config, paths, { env });
    const db = open(r.output?.sqlite ?? "");
    const rows = db
      .prepare(
        "SELECT p.text_raw FROM passage_needs_review n JOIN passage p ON p.id = n.passage_id WHERE n.reason = 'takhrij_unmatched'",
      )
      .all() as { text_raw: string }[];
    db.close();
    expect(rows.map((x) => x.text_raw)).toEqual(["(١) هذا كلام مصنوع للتجربة\nوله تتمة في سطر ثان"]);
  });

  test("deterministik: build ulang menghasilkan hash dan peta ID yang sama", () => {
    const { config, paths } = createFixture();
    const first = runIngest(config, paths, { env });
    const ids = readFileSync(join(paths.repo, config.ids), "utf8");
    const second = runIngest(config, paths, { env });
    expect(second.output?.hash).toBe(first.output?.hash);
    expect(second.output?.idsAdded).toEqual({ page: 0, toc: 0, passage: 0 });
    expect(readFileSync(join(paths.repo, config.ids), "utf8")).toBe(ids);
    expect(JSON.parse(ids)).toMatchObject({ format: 1, edition: 7, page: { "1": 1, "5": 5 } });
    // Tanpa BEGIN/COMMIT dan setiap statement ≤ batas.
    for (const f of readdirSync(join(paths.build, "sql"))) {
      const sql = readFileSync(join(paths.build, "sql", f), "utf8");
      expect(sql).not.toMatch(/\b(BEGIN|COMMIT)\b/);
      for (const st of sql.split(/;\n/))
        expect(Buffer.byteLength(st, "utf8")).toBeLessThan(MAX_STATEMENT_BYTES);
    }
  });

  test("ID stabil: paragraf baru mendapat seq setelah yang terbesar", () => {
    const { config, paths } = createFixture();
    // Halaman 1 diubah sehingga tidak lagi sama dengan OpenITI tiruan; gerbang dilonggarkan.
    config.expect.matanMinPages = 4;
    const before = runIngest(config, paths, { env });
    const book = new DatabaseSync(join(paths.shamela, "book", "234", "1234.db"));
    book
      .prepare("UPDATE page SET content = replace(content, ?, ?) WHERE id = 1")
      .run("ظُلْمَةٌ.\r", "ظُلْمَةٌ.\rسطر جديد مصنوع\r");
    book.close();
    const after = runIngest(config, paths, { env });
    expect(after.output?.idsAdded).toEqual({ page: 0, toc: 0, passage: 1 });
    const map = JSON.parse(readFileSync(join(paths.repo, config.ids), "utf8")) as {
      passage: Record<string, number>;
    };
    expect(map.passage["1:b2"]).toBe(19);
    expect(map.passage["1:b0"]).toBe(1);
    expect(after.output?.hash).not.toBe(before.output?.hash);
  });

  test("gerbang matan gagal → laporan ditulis, keluaran tidak", () => {
    const { config, paths } = createFixture({
      matan: ["نص مختلف تماما", "نص آخر", "كلام غير ذلك", "شيء", "لا شيء"],
    });
    const r = runIngest(config, paths, { env });
    expect(r.output).toBeUndefined();
    expect(r.validation.ok).toBe(false);
    expect(r.validation.invariants.find((i) => i.name.startsWith("Matan"))?.ok).toBe(false);
    const report = readFileSync(join(paths.repo, `${config.reportPrefix}-openiti.md`), "utf8");
    expect(report).toContain("**GAGAL**");
  });

  test("buildTimestamp: SOURCE_DATE_EPOCH, tanggal commit HEAD, dan nilai salah", () => {
    expect(buildTimestamp(".", { SOURCE_DATE_EPOCH: "0" })).toBe("1970-01-01T00:00:00.000Z");
    expect(buildTimestamp(".", {})).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.000Z$/);
    expect(() => buildTimestamp(".", { SOURCE_DATE_EPOCH: "kemarin" })).toThrow(
      /SOURCE_DATE_EPOCH/,
    );
  });
});
