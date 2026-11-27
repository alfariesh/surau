// Smoke D1 per kitab (X31a langkah 8a): kueri contoh dibangun dari `WorkConfig.smoke`, dan kitab di
// D1 dipilah menjadi dikenal (diperiksa) dan tak dikenal (hanya dilaporkan).
import { describe, expect, test } from "vite-plus/test";

import { smokePageSql, smokeSearchSql, smokeWorks } from "./d1.ts";
import { BIDAYAH } from "./works/bidayah.ts";
import { IHYA } from "./works/ihya.ts";

describe("smoke per kitab", () => {
  test("kueri halaman memakai slug, juz, dan halaman kitab", () => {
    const sql = smokePageSql("bidayat-al-hidayah", 1, 25);
    expect(sql).toContain("w.slug = 'bidayat-al-hidayah'");
    expect(sql).toContain("pg.juz = 1 AND pg.page_no = 25");
  });

  test("kueri cari dibatasi ke kitabnya dan slug di-escape", () => {
    const sql = smokeSearchSql("a'b", BIDAYAH.smoke.search);
    expect(sql).toContain("w.slug = 'a''b'");
    expect(sql).toContain("passage_fts MATCH '");
    expect(sql).toContain("p.id = passage_fts.rowid");
  });

  test("korpus tanpa Ihya: hanya Bidayah diperiksa, kitab asing dilaporkan", () => {
    const r = smokeWorks(["bidayat-al-hidayah", "kitab-asing"], [IHYA, BIDAYAH]);
    expect(r.known.map((w) => w.work.slug)).toEqual(["bidayat-al-hidayah"]);
    expect(r.unknown).toEqual(["kitab-asing"]);
  });

  test("korpus Ihya lama (rollback ihya-v9) tetap memeriksa j1 h200 dengan catatan kaki", () => {
    const r = smokeWorks(["ihya"], [IHYA, BIDAYAH]);
    expect(r.known).toEqual([IHYA]);
    expect(IHYA.smoke).toMatchObject({ juz: 1, page: 200, footnotes: true });
  });
});
