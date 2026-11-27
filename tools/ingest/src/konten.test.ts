// Impor konten chat (X24, ADR-145): pembangun baris dari draf, penggantian Intisari batch, unit
// ditarik, dan gerbang build. Teks paragraf di sini buatan tes (bukan teks kitab).
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { contentDraft } from "@surau/core";
import type { ContentDraft } from "@surau/core";
import type { DigestRow, PassageRow, TocNodeRow } from "@surau/db";
import { describe, expect, test } from "vite-plus/test";

import {
  contentDigestRows,
  contentGate,
  mergeDigests,
  readContentUnits,
  withdrawnReport,
} from "./konten.ts";
import type { ContentCorpus } from "./konten.ts";
import type { DigestBuild } from "./llm/digest-attach.ts";
import { sha256 } from "./llm/units.ts";

const repo = join(import.meta.dirname, "../../..");
const SHA = "a".repeat(64);

// Edisi 9: bab 900002 (anak dari 900001) berisi tiga paragraf badan buatan.
const passage = (seq: number, text: string): PassageRow => ({
  id: 90000000 + seq,
  edition_id: 9,
  page_id: 900001,
  toc_node_id: 900002,
  kind: "body",
  ord: seq,
  text_raw: text,
});
const node = (id: number, parent: number | null, level: number): TocNodeRow => ({
  id,
  edition_id: 9,
  parent_id: parent,
  ord: 1,
  level,
  title_ar: "عنوان تجريبي",
  start_page_id: 900001,
  source_title_id: null,
  patched: 0,
});
const rows: ContentCorpus = {
  passage: [
    passage(1, "نص تجريبي أول للاختبار فقط"),
    passage(2, "نص تجريبي ثان للاختبار فقط وفيه آية"),
    passage(3, "نص تجريبي ثالث"),
  ],
  footnote_ref: [],
  page: [{ id: 900001, juz: 1, page_no: 1 }],
  toc_node: [node(900001, null, 1), node(900002, 900001, 2), node(900003, 900001, 2)],
  passage_ayah_ref: [
    {
      passage_id: 90000002,
      char_start: 30,
      char_end: 34,
      surah: 1,
      ayah_start: 1,
      ayah_end: 1,
      kind: "exact",
      source: "matcher",
    } as unknown as ContentCorpus["passage_ayah_ref"][number],
  ],
};

function draft(over: Partial<Record<string, unknown>> = {}, isi: Record<string, unknown> = {}) {
  return contentDraft.parse({
    format: "surau-konten/1",
    jenis: "intisari-bab",
    edition_id: 9,
    section_id: 900002,
    status: "siap",
    asal: {
      pembuat: "claude-code",
      model: "claude-opus-5-5",
      plugin: "surau-redaksi@0.1.0",
      skill: "intisari-bab@1",
      operator: "agen",
      dibuat: "2026-11-27T10:00:00+07:00",
    },
    periksa: {
      mandiri: [],
      independen: null,
      kode: {
        aturan: "konten@1",
        lolos: true,
        sumber_sha256: SHA,
        draf_sha256: SHA,
        waktu: "2026-11-27T03:00:00.000Z",
      },
    },
    isi: {
      inti: "Inti satu kalimat buatan tes.",
      ringkasan: "Ringkasan buatan tes.",
      gagasan: [
        {
          judul: "Menurut penulis, gagasan pertama",
          isi: "Isi gagasan pertama.",
          sikap: "author",
          jenis: "idea",
          dasar: [90000001, 90000003],
          soal: { tanya: "Apa gagasan pertama?", jawab: "Gagasan pertama adalah contoh." },
        },
      ],
      kutipan: [
        { gagasan: 1, passage_id: 90000001, char_start: 4, char_end: 11, terjemahan: "terjemahan" },
      ],
      istilah: ["niat"],
      ...isi,
    },
    ...over,
  });
}
const unit = (d: ContentDraft, file = "data/konten/intisari-bab/900002.json") => ({
  file,
  draft: d,
});

describe("contentDigestRows", () => {
  test("inti, jawaban, jangkar paragraf utuh, kutipan berasal kode, label asal chat", () => {
    const out = contentDigestRows(rows, [unit(draft())], []);
    expect(out.problems).toEqual([]);
    expect(out.digest[0]).toMatchObject({
      toc_node_id: 900002,
      tier: "section",
      basis: "text",
      lead: "Inti satu kalimat buatan tes.",
      abstract: "Ringkasan buatan tes.",
      source_sha256: SHA,
      prompt_version: "surau-redaksi/intisari-bab@1",
      model: "claude-opus-5-5",
      review_status: "ai_generated",
    });
    expect(out.digest_anchor.map((a) => [a.passage_id, a.char_start, a.char_end])).toEqual([
      [90000001, 0, rows.passage[0]!.text_raw.length],
      [90000003, 0, rows.passage[2]!.text_raw.length],
    ]);
    expect(out.digest_question[0]).toMatchObject({
      point_ord: 1,
      answer: "Gagasan pertama adalah contoh.",
    });
    const q = out.digest_quote[0]!;
    expect(q.raw_sha256).toBe(sha256(rows.passage[0]!.text_raw.slice(4, 11)));
    expect(q).toMatchObject({
      translation_source: "digest",
      translation: "terjemahan",
      prompt_version: "surau-redaksi/intisari-bab@1",
    });
    expect(out.fts.map((f) => f.rowid)).toEqual([900002 * 100 + 1]);
    // Istilah tanpa glosarium tidak dimuat (foreign key digest_term → glossary_term).
    expect(out.digest_term).toEqual([]);
    expect(out.stats.termsWithoutGloss).toBe(1);
  });

  test("kutipan di luar paragraf atau menyentuh ayat = masalah build", () => {
    const outside = contentDigestRows(
      rows,
      [
        unit(
          draft(
            {},
            {
              kutipan: [
                { gagasan: 1, passage_id: 90000003, char_start: 0, char_end: 999, terjemahan: "x" },
              ],
            },
          ),
        ),
      ],
      [],
    );
    expect(outside.problems.join()).toMatch(/di luar paragraf/);
    const ayah = contentDigestRows(
      rows,
      [
        unit(
          draft(
            {},
            {
              kutipan: [
                { gagasan: 1, passage_id: 90000002, char_start: 20, char_end: 33, terjemahan: "x" },
              ],
            },
          ),
        ),
      ],
      [],
    );
    expect(ayah.problems.join()).toMatch(/rujukan ayat/);
  });

  test("bagian yang tidak ada di edisi dan unit tanpa cap cek kode ditolak", () => {
    expect(
      contentDigestRows(rows, [unit(draft({ section_id: 900999 }))], []).problems.join(),
    ).toMatch(/tidak ada/);
    const unchecked = draft({ periksa: { mandiri: [], independen: null, kode: null } });
    expect(contentDigestRows(rows, [unit(unchecked)], []).problems.join()).toMatch(/cap cek kode/);
  });
});

describe("mergeDigests", () => {
  const batchDigest = (id: number, basis: DigestRow["basis"]): DigestRow => ({
    toc_node_id: id,
    lang: "id",
    tier: "section",
    basis,
    opening: null,
    abstract: "lama",
    closing: null,
    lead: null,
    source_sha256: SHA,
    model: "claude-haiku-5-5",
    prompt_version: "digest-section@1",
    created_at: "2026-10-25",
    review_status: "ai_generated",
  });
  const batch = {
    glossary_term: [],
    digest: [
      batchDigest(900002, "text"),
      batchDigest(900001, "children"),
      batchDigest(900003, "text"),
    ],
    digest_point: [900002, 900001, 900003].map((id) => ({
      toc_node_id: id,
      lang: "id",
      ord: 1,
      kind: "idea",
      stance: "author",
      title: "t",
      body: "b",
      review_status: "ai_generated",
    })),
    digest_anchor: [],
    digest_quote: [],
    digest_question: [],
    digest_term: [],
    fts: [900001, 900002, 900003].map((id) => ({ rowid: id * 100 + 1, terms: "x" })),
    summary: [],
    stats: {} as DigestBuild["stats"],
    problems: [],
  } as unknown as DigestBuild;

  test("unit chat menggantikan batch bagian yang sama; induk batch dari anak itu ikut dibuang", () => {
    const chat = contentDigestRows(rows, [unit(draft())], []);
    const m = mergeDigests(batch, chat, rows.toc_node);
    expect(m.replaced).toEqual([900002]);
    expect(m.staleParents).toEqual([900001]);
    expect(m.build.digest.map((d) => [d.toc_node_id, d.prompt_version])).toEqual([
      [900003, "digest-section@1"],
      [900002, "surau-redaksi/intisari-bab@1"],
    ]);
    expect(m.build.digest_point.map((p) => p.toc_node_id).toSorted((a, b) => a - b)).toEqual([
      900002, 900003,
    ]);
    expect(m.build.fts.map((f) => f.rowid)).toEqual([90000201, 90000301]);
  });

  test("tanpa batch (kitab Gelombang 1): hanya baris chat", () => {
    const m = mergeDigests(null, contentDigestRows(rows, [unit(draft())], []), rows.toc_node);
    expect(m.build.digest.map((d) => d.toc_node_id)).toEqual([900002]);
    expect(m.replaced).toEqual([]);
  });
});

describe("berkas data/konten", () => {
  function tempRepo(files: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), "konten-"));
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(join(root, path, ".."), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    return root;
  }
  const withdrawn = draft({
    status: "ditarik",
    tarik: { alasan: "gagasan keliru menurut pemeriksa", tanggal: "2026-11-27" },
  });

  test("berkas rusak dan bagian ganda = masalah; ditarik dicatat di log koreksi", () => {
    const root = tempRepo({
      "data/konten/intisari-bab/a.json": JSON.stringify(draft()),
      "data/konten/intisari-bab/b.json": JSON.stringify(draft()),
      "data/konten/intisari-bab/c.json": "{rusak",
      "data/konten/intisari-bab/d.json": JSON.stringify({ ...withdrawn, section_id: 900003 }),
    });
    const units = readContentUnits(root);
    expect(units.ready).toHaveLength(2);
    expect(units.withdrawn).toHaveLength(1);
    expect(units.problems.join("\n")).toMatch(/c\.json: JSON tidak terbaca/);
    expect(units.problems.join("\n")).toMatch(/b\.json: bagian 900002:id sudah diisi/);
    const report = withdrawnReport(units.withdrawn);
    expect(report).toContain("gagasan keliru menurut pemeriksa");
    expect(report).toContain("| 900003 |");
  });

  test("unit di repo sah dan siap (format surau-konten/1)", () => {
    const units = readContentUnits(repo);
    expect(units.problems).toEqual([]);
    expect(units.ready.length).toBeGreaterThan(0);
  });
});

describe("contentGate", () => {
  test("unit rusak (cap tidak cocok isi, bagian tidak ada di korpus) membuat build gagal", async () => {
    const dir = mkdtempSync(join(tmpdir(), "konten-gate-"));
    const path = join(dir, "korpus.sqlite");
    const db = new DatabaseSync(path);
    const migrations = join(repo, "packages/db/migrations/corpus");
    for (const f of readdirSync(migrations).toSorted())
      db.exec(readFileSync(join(migrations, f), "utf8"));
    db.close();
    const problems = await contentGate(path, [unit(draft())]);
    expect(problems.join("\n")).toMatch(/stamp_mismatch/);
    expect(problems.length).toBeGreaterThan(1);
  });

  test("tanpa unit = lolos tanpa membuka DB", async () => {
    expect(await contentGate("/tidak/ada.sqlite", [])).toEqual([]);
  });
});
