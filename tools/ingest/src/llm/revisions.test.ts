// Revisi terjemahan manusia → korpus (X08 tahap 2): ekspor dari baris DB app, metadata git tanpa
// teks, pemuatan dengan cek hash, dan penerapan + validasi ulang. Teks Arab dan terjemahan BUATAN.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import type { PassageAyahRefRow, TranslationRevisionRow, TranslationRow } from "@surau/db";
import { describe, expect, test } from "vite-plus/test";

import {
  REVISION_EXPORT_DIR,
  REVISION_META_FILE,
  applyRevisions,
  exportContent,
  exportLines,
  loadRevisions,
  metaItemOf,
  revisionInvariant,
  revisionMetaFile,
  protectedRevisions,
  revisionMetaRows,
} from "./revisions.ts";
import type { LoadedRevisions, RevisionExportLine } from "./revisions.ts";
import { withoutReviewed } from "./batch.ts";
import type { Work } from "./work.ts";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const ARABIC_1 = "قال الشيخ (١) قال تعالى {كلمة أولى} ثم قال";
const ARABIC_2 = "نص الصفحة الثانية";
const AI_1 = "Syaikh berkata (١): Allah berfirman ⟦QS 2:4⟧, lalu berkata.";
const AI_2 = "Teks halaman kedua.";
const P1 = 10_000_001;
const P2 = 10_000_002;

const passage = (id: number, text_raw: string) => ({
  id,
  edition_id: 1,
  page_id: 100_001,
  toc_node_id: null,
  kind: "body" as const,
  ord: id - P1 + 1,
  text_raw,
});
const ayah: PassageAyahRefRow = {
  passage_id: P1,
  char_start: ARABIC_1.indexOf("كلمة"),
  char_end: ARABIC_1.indexOf("كلمة") + "كلمة أولى".length,
  surah: 2,
  ayah_from: 4,
  ayah_to: 4,
  match: "exact",
  partial: 0,
  bracketed: 1,
  alt_count: 0,
};
const tr = (passage_id: number, text: string): TranslationRow => ({
  passage_id,
  lang: "id",
  text,
  model: "claude-haiku-5-5",
  prompt_version: "translate-passage@4",
  created_at: "2026-10-17",
  review_status: "ai_generated",
});
const rows = () => ({
  passage: [passage(P1, ARABIC_1), passage(P2, ARABIC_2)],
  passage_ayah_ref: [ayah],
  footnote_ref: [
    {
      passage_id: P1,
      char_start: ARABIC_1.indexOf("(١)"),
      char_end: ARABIC_1.indexOf("(١)") + 3,
      marker: "١",
      footnote_passage_id: 10_000_009,
    },
  ],
  translation: [tr(P1, AI_1), tr(P2, AI_2)],
});

const revision = (over: Partial<TranslationRevisionRow>): TranslationRevisionRow => ({
  id: 1,
  passage_id: P1,
  lang: "id",
  kind: "revised",
  text: "Syaikh berkata (١): Allah [Ta'ala] berfirman ⟦QS 2:4⟧, lalu ia berkata.",
  reason: "kata",
  restores_id: null,
  supersedes_id: null,
  base_sha256: sha(AI_1),
  draft_sha256: sha(AI_1),
  source_sha256: sha(ARABIC_1),
  author_key: "a".repeat(64),
  author_name: "Ust. Uji Lc.",
  author_short: "Ust. Uji",
  author_role: "ustadz",
  author_public: 1,
  status: "active",
  corpus_version: "ihya-v8",
  created_at: "2026-10-22T03:00:00.000Z",
  ...over,
});

const loaded = (lines: RevisionExportLine[]): LoadedRevisions => ({
  meta: revisionMetaFile.parse({
    format: 1,
    edition: "ihya-9472",
    exported_at: "2026-10-22T04:00:00.000Z",
    source: "lokal",
    export_file: "ihya-9472-revisi-uji.jsonl",
    export_sha256: sha(exportContent(lines)),
    r2_key: null,
    items: lines.map(metaItemOf),
  }),
  lines,
});

describe("exportLines", () => {
  test("hanya revisi aktif; pembatalan → revisi yang dipulihkan; kembali ke AI tidak diekspor", () => {
    const r1 = revision({ id: 1, status: "superseded" });
    const r2 = revision({
      id: 2,
      supersedes_id: 1,
      text: "Versi dua (١) ⟦QS 2:4⟧.",
      status: "superseded",
    });
    const undo = revision({
      id: 3,
      kind: "reverted",
      text: null,
      restores_id: 1,
      supersedes_id: 2,
      author_role: "editor",
      author_key: "b".repeat(64),
      author_name: "Pembatal",
      author_short: "Pembatal",
    });
    const toAi = revision({
      id: 4,
      passage_id: P2,
      kind: "reverted",
      text: null,
      restores_id: null,
    });
    const confirmed = revision({ id: 5, passage_id: 10_000_005, kind: "confirmed", text: null });
    const lines = exportLines([r1, r2, undo, toAi, confirmed]);
    expect(lines.map((l) => [l.passage_id, l.revision_id, l.kind, l.reviewer_short])).toEqual([
      [P1, 1, "revised", "Ust. Uji"],
      [10_000_005, 5, "confirmed", "Ust. Uji"],
    ]);
    expect(lines[0]?.text).toBe(r1.text);
    expect(lines[1]?.text).toBeNull();
  });
});

describe("metadata git", () => {
  test("tanpa teks: skema menolak field teks, nilai teks tidak muncul di JSON", () => {
    const [line] = exportLines([revision({})]);
    const meta = loaded([line!]).meta;
    const json = JSON.stringify(meta);
    expect(json).not.toContain("[Ta'ala]");
    expect(meta.items[0]?.text_sha256).toBe(sha(line!.text!));
    expect(
      revisionMetaFile.safeParse({ ...meta, items: [{ ...meta.items[0], text: line!.text }] })
        .success,
    ).toBe(false);
    // Nama dengan huruf Arab atau karakter kontrol ditolak.
    expect(
      revisionMetaFile.safeParse({ ...meta, items: [{ ...meta.items[0], reviewer_name: "أنس" }] })
        .success,
    ).toBe(false);
  });

  test("ingest gagal bila berkas ekspor hilang, hash beda, atau isi tidak sama dengan metadata", () => {
    const repo = mkdtempSync(join(tmpdir(), "surau-revisi-"));
    const lines = exportLines([revision({})]);
    const { meta } = loaded(lines);
    const metaPath = join(repo, REVISION_META_FILE);
    mkdirSync(dirname(metaPath), { recursive: true });
    writeFileSync(metaPath, JSON.stringify(meta));
    const uji = { SURAU_REVISI_UJI: "1" };
    // Ekspor uji (sumber "lokal") hanya dimuat bila diminta eksplisit.
    expect(() => loadRevisions(repo, {})).toThrow(/ekspor uji/u);
    expect(() => loadRevisions(repo, uji)).toThrow(/tidak ada/u);
    const file = join(repo, REVISION_EXPORT_DIR, meta.export_file);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, exportContent(lines).replace("Ta'ala", "Taala"));
    expect(() => loadRevisions(repo, uji)).toThrow(/sha256/u);
    writeFileSync(file, exportContent(lines));
    expect(loadRevisions(repo, uji)?.lines).toEqual(lines);
    // Tanpa metadata = tanpa revisi.
    expect(loadRevisions(mkdtempSync(join(tmpdir(), "surau-revisi-")))).toBeNull();
  });
});

describe("applyRevisions", () => {
  test("perbaikan ustadz: teks diganti, status ustadz_verified, draf AI di ai_text; sudah benar editor: reviewed", () => {
    const lines = exportLines([
      revision({}),
      revision({
        id: 2,
        passage_id: P2,
        kind: "confirmed",
        text: null,
        base_sha256: sha(AI_2),
        draft_sha256: sha(AI_2),
        source_sha256: sha(ARABIC_2),
        author_role: "editor",
        author_name: "Editor Uji",
        author_short: "Editor Uji",
        author_public: 0,
      }),
    ]);
    const out = applyRevisions(rows(), loaded(lines));
    expect(out.translation.map((t) => [t.passage_id, t.review_status, t.text, t.model])).toEqual([
      [P1, "ustadz_verified", lines[0]?.text, "claude-haiku-5-5"],
      [P2, "reviewed", AI_2, "claude-haiku-5-5"],
    ]);
    expect(out.translation_review).toEqual([
      expect.objectContaining({
        passage_id: P1,
        revision_id: 1,
        revised: 1,
        ai_text: AI_1,
        reviewer_public: 1,
        reviewer_short: "Ust. Uji",
      }),
      expect.objectContaining({
        passage_id: P2,
        revision_id: 2,
        revised: 0,
        ai_text: null,
        reviewer_public: 0,
        reviewer_role: "editor",
      }),
    ]);
    expect(out.stats).toMatchObject({ total: 2, revised: 1, confirmed: 1, stale: [] });
    expect(revisionInvariant({ ...out }, out.stats)).toMatchObject({ ok: true });
  });

  test("usang: teks Arab berubah, placeholder ayat tidak cocok lagi, draf AI yang dinyatakan benar diganti", () => {
    const changed = {
      ...rows(),
      passage: [passage(P1, `${ARABIC_1} زيادة`), passage(P2, ARABIC_2)],
    };
    const lines = exportLines([revision({})]);
    expect(applyRevisions(changed, loaded(lines)).stats.stale).toEqual([
      { passage_id: P1, revision_id: 1, reason: "source_changed" },
    ]);
    // Pencocok ayat diperbarui: rujukan 2:4 kini 2:4-5 → placeholder di revisi tidak cocok.
    const refs = { ...rows(), passage_ayah_ref: [{ ...ayah, ayah_to: 5 }] };
    const invalid = applyRevisions(refs, loaded(lines));
    expect(invalid.stats.stale).toEqual([
      { passage_id: P1, revision_id: 1, reason: "invalid_text" },
    ]);
    expect(invalid.translation.find((t) => t.passage_id === P1)?.text).toBe(AI_1);
    // Draf AI diterjemahkan ulang: "sudah benar" tidak menempel ke teks yang belum dibaca manusia.
    const confirmed = exportLines([revision({ kind: "confirmed", text: null })]);
    const redraft = {
      ...rows(),
      translation: [tr(P1, "Draf AI baru (١) ⟦QS 2:4⟧."), tr(P2, AI_2)],
    };
    const out = applyRevisions(redraft, loaded(confirmed));
    expect(out.stats.stale).toEqual([{ passage_id: P1, revision_id: 1, reason: "draft_changed" }]);
    expect(out.translation.find((t) => t.passage_id === P1)?.review_status).toBe("ai_generated");
    expect(out.translation_review).toEqual([]);
    // Perbaikan manusia tetap menang walau draf AI di sekitarnya berubah (dicatat).
    const revised = applyRevisions(redraft, loaded(lines));
    expect(revised.stats).toMatchObject({ revised: 1, draftChanged: [P1] });
    expect(revised.translation_review[0]?.ai_text).toBe("Draf AI baru (١) ⟦QS 2:4⟧.");
  });

  test("sha256 berkas ekspor + jumlah revisi tercatat di meta korpus", () => {
    const l = loaded(exportLines([revision({})]));
    const out = applyRevisions(rows(), l);
    expect(out.translation_review).toHaveLength(1);
    // Jumlah = revisi di berkas (deterministik tanpa hasil batch, untuk `corpus:qa`).
    expect(revisionMetaRows(l)).toEqual([
      { key: "revisions_sha256", value: l.meta.export_sha256 },
      { key: "revisions_count", value: "1" },
    ]);
    expect(revisionMetaRows(null)).toEqual([]);
  });

  test("petik tidak berpasangan yang juga ada di draf (kutipan lintas paragraf) tetap dimuat", () => {
    const open = 'Syaikh berkata (١): "Allah berfirman ⟦QS 2:4⟧, lalu berkata.';
    const draftRows = { ...rows(), translation: [tr(P1, open), tr(P2, AI_2)] };
    const lines = exportLines([
      revision({
        text: "Syaikh berkata (١): \"Allah Ta'ala berfirman ⟦QS 2:4⟧, lalu ia berkata.",
        base_sha256: sha(open),
        draft_sha256: sha(open),
      }),
    ]);
    expect(applyRevisions(draftRows, loaded(lines)).stats).toMatchObject({ revised: 1, stale: [] });
  });

  test("batch hanya melindungi revisi yang masih berlaku (usang tetap mendapat draf baru)", () => {
    const lines = exportLines([
      revision({}),
      revision({
        id: 2,
        passage_id: P2,
        kind: "confirmed",
        text: null,
        base_sha256: sha(AI_2),
        draft_sha256: sha(AI_2),
        source_sha256: sha(ARABIC_2),
      }),
    ]);
    const draft = (id: number) => (id === P1 ? AI_1 : id === P2 ? AI_2 : null);
    expect(protectedRevisions(rows(), loaded(lines), draft)).toEqual(new Set([P1, P2]));
    // Draf AI P2 usang/ditolak → tidak dilindungi; P1: rujukan ayat berubah → tidak dilindungi.
    expect(protectedRevisions(rows(), loaded(lines), (id) => (id === P1 ? AI_1 : null))).toEqual(
      new Set([P1]),
    );
    const refs = { ...rows(), passage_ayah_ref: [{ ...ayah, ayah_to: 5 }] };
    expect(protectedRevisions(refs, loaded(lines), draft)).toEqual(new Set([P2]));
    expect(protectedRevisions(rows(), null, draft)).toEqual(new Set());
  });

  test("tanpa izin nama: metadata dan korpus hanya menyimpan peran", () => {
    const [line] = exportLines([revision({ author_public: 0 })]);
    expect(line).toMatchObject({
      reviewer_name: "ustadz",
      reviewer_short: "ustadz",
      reviewer_public: false,
    });
    expect(JSON.stringify(loaded([line!]).meta)).not.toContain("Ust. Uji");
  });

  test("tanpa revisi: baris tetap; invarian menolak status tanpa asal tinjauan", () => {
    const none = applyRevisions(rows(), null);
    expect(none.translation).toEqual(rows().translation);
    expect(revisionInvariant(none, none.stats)).toMatchObject({ ok: true });
    const broken = {
      translation: [{ ...tr(P1, AI_1), review_status: "reviewed" as const }],
      translation_review: [],
    };
    expect(revisionInvariant(broken, none.stats).ok).toBe(false);
  });
});

test("batch AI melewati paragraf berevisi (plan/submit/retry memakai unit tanpa paragraf itu)", () => {
  const work = {
    units: new Map([
      [P1, {}],
      [P2, {}],
    ]),
  } as unknown as Work;
  expect([...withoutReviewed(work, new Set([P1])).units.keys()]).toEqual([P2]);
  expect(withoutReviewed(work, new Set())).toBe(work);
});

test("metadata revisi yang ter-commit selalu berasal dari ekspor produksi", () => {
  const path = join(import.meta.dirname, "../../../..", REVISION_META_FILE);
  if (!existsSync(path)) return;
  expect(revisionMetaFile.parse(JSON.parse(readFileSync(path, "utf8"))).source).toBe("surau-app");
});
