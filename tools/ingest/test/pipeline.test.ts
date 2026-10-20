// Uji ujung-ke-ujung pipeline ingest dengan kitab BUATAN (test/fixture.ts): baca Shamela tiruan,
// daftar isi + patch, QA OpenITI tiruan, validasi, SQL, .sqlite, peta ID, dan laporan.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { CORPUS_SCHEMA_VERSION } from "@surau/db";
import { NORM_VERSION, buildFtsMatch, normalizeArabic, stemText } from "@surau/text";
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
      footnote_ref: 3,
      passage_needs_review: 7,
      quran_source: 4,
      quran_surah: 2,
      quran_ayah: 6,
      quran_translation: 12,
      passage_ayah_ref: 1,
      translation: 0,
      summary: 0,
      term_stat: 23,
      passage_fts: 18,
      // Indeks Indonesia (S14): kosong karena kitab buatan tanpa terjemahan/ringkasan AI.
      translation_fts: 0,
      summary_fts: 0,
      meta: 6,
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
      { key: "latin_norm_version", value: "1" },
      { key: "norm_version", value: String(NORM_VERSION) },
      { key: "schema_version", value: String(CORPUS_SCHEMA_VERSION) },
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

    // Penanda (١) menunjuk catatan kaki bernomor sama; offset = indeks string di text_raw. Di
    // halaman 3 penanda pembuka takhrij tetap di matan dan menunjuk takhrij yang dipotong, karena
    // halaman itu tidak punya catatan bawah (١).
    const refs = q<{
      page: number;
      text_raw: string;
      char_start: number;
      char_end: number;
      marker: string;
      foot: string;
    }>(
      `SELECT g.source_page_id AS page, b.text_raw, r.char_start, r.char_end, r.marker, f.text_raw AS foot
       FROM footnote_ref r JOIN passage b ON b.id = r.passage_id JOIN passage f ON f.id = r.footnote_passage_id
       JOIN page g ON g.id = b.page_id ORDER BY g.source_page_id`,
    );
    expect(refs.map((r) => [r.page, r.marker, r.text_raw.slice(r.char_start, r.char_end)])).toEqual(
      [
        [1, "١", "(١)"],
        [2, "١", "(١)"],
        [3, "١", "(١)"],
      ],
    );
    expect(refs.map((r) => r.foot)).toEqual([
      "(١) حديث العلم نور أخرجه فلان بإسناد حسن",
      "(١) هذا كلام مصنوع للتجربة\nوله تتمة في سطر ثان",
      "حديث الطهور شطر الايمان رواه احمد",
    ]);

    const review = q<{ reason: string; text_raw: string }>(
      "SELECT n.reason, p.text_raw FROM passage_needs_review n JOIN passage p ON p.id = n.passage_id ORDER BY n.reason, p.id",
    );
    expect(review.map((r) => [r.reason, r.text_raw])).toEqual([
      ["inline_unsplit", "الذكر حياة القلوب // وقال تعالى كذا"],
      ["takhrij_boundary", "قال الشيخ الصبر ضياء"],
      ["takhrij_boundary", "وقال النبي الطهور شطر الايمان (١)"],
      ["takhrij_boundary", "ثم رجع الكلام"],
      ["takhrij_inline", "حديث الصبر ضياء أخرجه مسلم من حديث فلان"],
      ["takhrij_inline", "حديث الطهور شطر الايمان رواه احمد"],
      ["takhrij_unmatched", "(١) هذا كلام مصنوع للتجربة\nوله تتمة في سطر ثان"],
    ]);

    // Indeks pencarian (S11): satu baris per paragraf, dicari dengan kueri yang sama dengan
    // searchText. Hasilnya = persis paragraf (badan dan catatan kaki) yang memuat stem صبر.
    const hits = q<{ id: number }>(
      "SELECT rowid AS id FROM passage_fts WHERE passage_fts MATCH ? ORDER BY rowid",
      buildFtsMatch("الصبر") ?? "",
    ).map((h) => h.id);
    const all = q<{ id: number; kind: string; text_raw: string }>(
      "SELECT id, kind, text_raw FROM passage ORDER BY id",
    );
    const withStem = all.filter((p) =>
      stemText(normalizeArabic(p.text_raw).text).split(" ").includes("صبر"),
    );
    expect(hits).toEqual(withStem.map((p) => p.id));
    expect(new Set(withStem.map((p) => p.kind))).toEqual(new Set(["body", "foot"]));
    // term_stat: df > 10% × 18 paragraf (fixture kecil, jadi banyak stem lolos), urut term.
    const stats = q<{ term: string; df: number }>("SELECT term, df FROM term_stat");
    expect(stats.every((t) => t.df > 1.8)).toBe(true);
    expect(stats.map((t) => t.term)).toEqual(stats.map((t) => t.term).sort());

    // Ayat (S12): kutipan berkurung di halaman 4 cocok persis ke "1:2" mushaf buatan; lafaz yang
    // sama juga ada di 2:3 (alt_count 1). Offset = isi kurung tanpa kurungnya, teks mentah utuh.
    const ayah = q<{
      text_raw: string;
      char_start: number;
      char_end: number;
      surah: number;
      ayah_from: number;
      ayah_to: number;
      match: string;
      partial: number;
      bracketed: number;
      alt_count: number;
    }>(
      `SELECT p.text_raw, r.char_start, r.char_end, r.surah, r.ayah_from, r.ayah_to, r.match,
              r.partial, r.bracketed, r.alt_count
       FROM passage_ayah_ref r JOIN passage p ON p.id = r.passage_id`,
    );
    expect(
      ayah.map(({ text_raw, char_start, char_end, ...r }) => ({
        quote: text_raw.slice(char_start, char_end),
        ...r,
      })),
    ).toEqual([
      {
        quote: "وَالصَّبْرُ نور القلوب في الظلمات",
        surah: 1,
        ayah_from: 2,
        ayah_to: 2,
        match: "exact",
        partial: 0,
        bracketed: 1,
        alt_count: 1,
      },
    ]);
    // Basmalah pembuka surah (atribut `bismillah` Tanzil) bukan teks ayat 1; catatan kaki
    // terjemahan disimpan sebagai JSON, penandanya tetap di teks.
    expect(q("SELECT text_index FROM quran_ayah WHERE surah = 2 AND ayah = 1")).toEqual([
      { text_index: "قل هل يستوي العالم والجاهل" },
    ]);
    expect(
      q("SELECT source_id, text, footnotes FROM quran_translation WHERE surah = 1 AND ayah = 2"),
    ).toEqual([
      {
        source_id: "kemenag-id",
        text: "Terjemahan uji dua1) dengan catatan.",
        footnotes: JSON.stringify([{ marker: "1)", text: "Catatan kaki uji." }]),
      },
      { source_id: "kemenag-latin", text: "Translit 1:2", footnotes: null },
    ]);
    const report = readFileSync(join(paths.repo, `${config.reportPrefix}-ayat.md`), "utf8");
    expect(report).toContain("| · cocok persis (`exact`) | 1 (100,0%) |");
    expect(report).toContain("QS Al-Ula [1]: 2");
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

  test("build versi lain di folder build dihapus; berkas lain tidak", () => {
    const { config, paths } = createFixture();
    mkdirSync(paths.build, { recursive: true });
    const stale = ["surau-corpus-uji-v0.sqlite", "surau-corpus-uji-v0.sqlite-wal", "uji-v0.sha256"];
    for (const f of [...stale, "catatan.txt", "sha256.txt"])
      writeFileSync(join(paths.build, f), "x");
    const r = runIngest(config, paths, { env });
    const left = readdirSync(paths.build).sort();
    for (const f of stale) expect(left).not.toContain(f);
    expect(left).toEqual(
      [
        "catatan.txt",
        "sha256.txt",
        "sql",
        basename(r.output?.sqlite ?? ""),
        "uji-v1.sha256",
      ].sort(),
    );
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

  const stability = (r: ReturnType<typeof runIngest>) =>
    r.validation.invariants.find((i) => i.name.startsWith("ID paragraf rilis"));
  const editPage = (paths: { shamela: string }, from: string, to: string) => {
    const book = new DatabaseSync(join(paths.shamela, "book", "234", "1234.db"));
    book.prepare("UPDATE page SET content = replace(content, ?, ?) WHERE id = 1").run(from, to);
    book.close();
  };

  test("paragraf bergeser di tengah halaman setelah rilis → ditolak (#59)", () => {
    const { config, paths } = createFixture();
    config.expect.matanMinPages = 4;
    const first = runIngest(config, paths, { env });
    expect(stability(first)).toBeUndefined();
    const printsPath = join(paths.repo, config.ids.replace(/\.json$/, ".teks.json"));
    const prints = readFileSync(printsPath, "utf8");
    const ids = readFileSync(join(paths.repo, config.ids), "utf8");
    const map = JSON.parse(ids) as { passage: Record<string, number> };
    const shiftedId = 7 * 10 ** 7 + (map.passage["1:b1"] ?? 0);
    // Baris baru tepat setelah judul: paragraf lama 1:b1 kini 1:b2, dan 1:b1 menunjuk baris baru.
    editPage(paths, "</span>\r", "</span>\rسطر جديد مصنوع\r");
    const shifted = runIngest(config, paths, { env });
    expect(shifted.output).toBeUndefined();
    expect(stability(shifted)).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/^teks berubah 1 /),
    });
    // Daftar LENGKAP ada di laporan validasi.
    const report = readFileSync(join(paths.repo, `${config.reportPrefix}-validasi.md`), "utf8");
    expect(report).toContain(`### Teks berubah, belum diterima (1)\n\n${shiftedId}\n`);
    // Gagal = peta ID dan sidik tidak ditulis ulang.
    expect(readFileSync(printsPath, "utf8")).toBe(prints);
    expect(readFileSync(join(paths.repo, config.ids), "utf8")).toBe(ids);
    // ID yang diterima tetapi tidak berubah juga gagal (daftar basi).
    const wrong = runIngest(config, paths, { env, acceptTextChanges: [shiftedId, shiftedId + 1] });
    expect(wrong.output).toBeUndefined();
    // Koreksi teks yang disengaja: diterima hanya per ID, lalu sidik diperbarui.
    const accepted = runIngest(config, paths, { env, acceptTextChanges: [shiftedId] });
    expect(stability(accepted)?.ok).toBe(true);
    expect(accepted.output).toBeDefined();
    expect(readFileSync(printsPath, "utf8")).not.toBe(prints);
  });

  test("paragraf lama hilang → ditolak walau koreksi diterima (#59)", () => {
    const { config, paths } = createFixture();
    config.expect.matanMinPages = 4;
    runIngest(config, paths, { env });
    const map = JSON.parse(readFileSync(join(paths.repo, config.ids), "utf8")) as {
      passage: Record<string, number>;
    };
    const lost = 7 * 10 ** 7 + (map.passage["1:b1"] ?? 0);
    // Baris badan terakhir halaman 1 dihapus: kunci 1:b1 tidak muncul lagi.
    editPage(paths, "الْعِلْمُ نُورٌ (١) وَالْجَهْلُ ظُلْمَةٌ.\r", "");
    const r = runIngest(config, paths, { env, acceptTextChanges: [lost] });
    expect(r.output).toBeUndefined();
    expect(stability(r)).toMatchObject({ ok: false, detail: expect.stringMatching(/hilang 1/) });
  });

  test("setelah rilis: --reset-ids, peta ID hilang, dan sidik hilang ditolak (#59)", () => {
    const { config, paths } = createFixture();
    runIngest(config, paths, { env });
    expect(() => runIngest(config, paths, { env, resetIds: true })).toThrow(/--reset-ids ditolak/);
    const idsPath = join(paths.repo, config.ids);
    const ids = readFileSync(idsPath, "utf8");
    rmSync(idsPath);
    expect(() => runIngest(config, paths, { env })).toThrow(
      /tidak ada padahal korpus sudah dirilis/,
    );
    writeFileSync(idsPath, ids);
    rmSync(idsPath.replace(/\.json$/, ".teks.json"));
    expect(() => runIngest(config, paths, { env })).toThrow(/Sidik teks .* tidak ada/);
    // Kitab yang belum pernah dirilis: --reset-ids membangun peta dan sidik dari nol.
    expect(runIngest(config, paths, { env, resetIds: true }).output).toBeDefined();
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
