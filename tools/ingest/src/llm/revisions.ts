// Revisi terjemahan manusia → korpus (X08 tahap 2, ADR-082). Revisi editor terdaftar disimpan di DB
// app (ADR-081) dan diekspor `pnpm review:export-terjemahan`: teksnya ke berkas lokal git-ignored
// (`data/build/reviews/…jsonl`) + salinan R2 privat, METADATA (tanpa teks) ke git
// (`data/reviews/ihya-9472-revisi.json`). Ingest memuat berkas ekspor HANYA bila sha256-nya sama
// dengan metadata git (koreksi tidak bisa hilang atau berubah diam-diam), memvalidasi ulang setiap
// revisi terhadap teks Arab + rujukan ayat korpus yang sedang dibangun, lalu menimpa teks AI.
// Revisi usang (teks Arab berubah, placeholder ayat tidak lagi cocok, draf AI yang dinyatakan benar
// sudah diganti) TIDAK dimuat dan dilaporkan; ingest tidak pernah menulis balik ke DB app.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { underlyingRevision, validateTranslationText } from "@surau/core";
import { metaRow, translationReviewRow, translationRow } from "@surau/db";
import type {
  MetaRow,
  TranslationReviewRow,
  TranslationRevisionRow,
  TranslationRow,
} from "@surau/db";
import { z } from "zod";

import type { CorpusRows } from "../rows.ts";
import { toAyahRef, toFootnoteRef } from "./units.ts";

/** Metadata revisi di git (tanpa teks), relatif ke root repo. */
export const REVISION_META_FILE = "data/reviews/ihya-9472-revisi.json";
/** Folder berkas ekspor berisi teks (git-ignored; salinan R2 privat). */
export const REVISION_EXPORT_DIR = "data/build/reviews";
/** Bucket R2 privat salinan ekspor (nama objek unik per ekspor, tidak pernah ditimpa). */
export const REVISION_R2_BUCKET = "surau-revisi";

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const hex64 = z.string().regex(/^[a-f0-9]{64}$/u);
const latinName = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((s) => !/[\p{Cc}\p{Cf}]/u.test(s) && !/\p{Script=Arabic}/u.test(s));

const itemShape = {
  passage_id: z.number().int().positive(),
  /** ID revisi DB app yang menentukan teks + label (bukan baris pembatalan). */
  revision_id: z.number().int().positive(),
  kind: z.enum(["confirmed", "revised"]),
  base_sha256: hex64,
  draft_sha256: hex64,
  source_sha256: hex64,
  reviewer_name: latinName(120),
  reviewer_short: latinName(80),
  reviewer_role: z.enum(["ustadz", "editor"]),
  reviewer_public: z.boolean(),
  reviewed_at: z.iso.datetime(),
};

/** Satu revisi di metadata git: hash teksnya saja, TIDAK PERNAH teksnya (aturan keras 3). */
export const revisionMetaItem = z
  .strictObject({ ...itemShape, text_sha256: hex64.nullable() })
  .refine((i) => (i.kind === "revised") === (i.text_sha256 !== null));
export type RevisionMetaItem = z.infer<typeof revisionMetaItem>;

export const revisionMetaFile = z
  .strictObject({
    format: z.literal(1),
    edition: z.string().regex(/^[a-z]+-[0-9]+$/u),
    exported_at: z.iso.datetime(),
    source: z.enum(["surau-app", "surau-app-staging", "lokal"]),
    export_file: z.string().regex(/^[a-z0-9-]+\.jsonl$/u),
    export_sha256: hex64,
    /** Kunci objek di bucket R2 privat (`null` = ekspor uji tanpa salinan R2). */
    r2_key: z
      .string()
      .regex(/^[a-z0-9/-]+\.jsonl$/u)
      .nullable(),
    items: z.array(revisionMetaItem),
  })
  .refine((f) => new Set(f.items.map((i) => i.passage_id)).size === f.items.length);
export type RevisionMetaFile = z.infer<typeof revisionMetaFile>;

/** Satu baris berkas ekspor (git-ignored): metadata + teks perbaikan. */
export const revisionExportLine = z
  .strictObject({ ...itemShape, text: z.string().min(1).max(8000).nullable() })
  .refine((l) => (l.kind === "revised") === (l.text !== null));
export type RevisionExportLine = z.infer<typeof revisionExportLine>;

/** Metadata satu baris ekspor (hash teksnya, tanpa teks). */
export function metaItemOf(line: RevisionExportLine): RevisionMetaItem {
  const { text, ...rest } = line;
  return revisionMetaItem.parse({ ...rest, text_sha256: text === null ? null : sha256(text) });
}

/**
 * Keadaan berlaku setiap paragraf dari semua baris `translation_revision` DB app: revisi aktif →
 * revisi yang menentukannya (pembatalan → yang dipulihkan). Kembali ke draf AI = tidak diekspor.
 * Hanya baris berstatus `active` yang dipakai (yang digantikan/dibatalkan tidak ikut).
 */
export function exportLines(rows: readonly TranslationRevisionRow[]): RevisionExportLine[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: RevisionExportLine[] = [];
  for (const active of rows.filter((r) => r.status === "active")) {
    const source = underlyingRevision(active, byId);
    if (source === null || source.kind === "reverted") continue;
    if (source.author_role === "admin") throw new Error(`revisi ${source.id}: penulis admin`);
    out.push(
      revisionExportLine.parse({
        passage_id: source.passage_id,
        revision_id: source.id,
        kind: source.kind,
        text: source.kind === "revised" ? source.text : null,
        base_sha256: source.base_sha256,
        draft_sha256: source.draft_sha256,
        source_sha256: source.source_sha256,
        // Tanpa izin nama: nama tidak pernah tampil (situs maupun MCP), jadi metadata git di repo
        // publik pun hanya menyimpan perannya, bukan log aktivitas per orang.
        reviewer_name: source.author_public === 1 ? source.author_name : source.author_role,
        reviewer_short: source.author_public === 1 ? source.author_short : source.author_role,
        reviewer_role: source.author_role,
        reviewer_public: source.author_public === 1,
        reviewed_at: source.created_at,
      }),
    );
  }
  return out.sort((a, b) => a.passage_id - b.passage_id);
}

/** Isi berkas ekspor (JSONL, satu revisi per baris, urut paragraf). */
export const exportContent = (lines: readonly RevisionExportLine[]) =>
  lines.map((l) => `${JSON.stringify(l)}\n`).join("");

export interface LoadedRevisions {
  meta: RevisionMetaFile;
  lines: RevisionExportLine[];
}

/**
 * Baca metadata git + berkas ekspornya. Tanpa metadata = tanpa revisi (`null`). Metadata ada tetapi
 * berkas ekspor hilang, sha256 berbeda, atau isinya tidak sama dengan metadata = GAGAL (koreksi
 * tidak boleh hilang atau berubah diam-diam).
 */
export function loadRevisions(
  repo: string,
  env: { SURAU_REVISI_UJI?: string | undefined } = process.env,
): LoadedRevisions | null {
  const metaPath = join(repo, REVISION_META_FILE);
  if (!existsSync(metaPath)) return null;
  const meta = revisionMetaFile.parse(JSON.parse(readFileSync(metaPath, "utf8")) as unknown);
  // Ekspor uji (`--staging`/`--lokal`) berisi teks dan nama uji: hanya dimuat bila diminta eksplisit,
  // supaya metadata uji yang tak sengaja ter-commit tidak pernah masuk korpus produksi.
  if (meta.source !== "surau-app" && env.SURAU_REVISI_UJI !== "1")
    throw new Error(
      `${REVISION_META_FILE} berasal dari ekspor uji (${meta.source}); ekspor ulang dari produksi, atau set SURAU_REVISI_UJI=1 untuk korpus uji lokal`,
    );
  const file = join(repo, REVISION_EXPORT_DIR, meta.export_file);
  if (!existsSync(file)) {
    const hint =
      meta.r2_key === null
        ? "ekspor ulang dengan `pnpm review:export-terjemahan`"
        : `unduh: pnpm wrangler r2 object get ${REVISION_R2_BUCKET}/${meta.r2_key} --file ${REVISION_EXPORT_DIR}/${meta.export_file} --remote`;
    throw new Error(`berkas ekspor revisi ${meta.export_file} tidak ada (${hint})`);
  }
  const bytes = readFileSync(file);
  if (sha256(bytes) !== meta.export_sha256)
    throw new Error(
      `berkas ekspor revisi ${meta.export_file}: sha256 tidak sama dengan ${REVISION_META_FILE}`,
    );
  const lines = bytes
    .toString("utf8")
    .split("\n")
    .filter((l) => l !== "")
    .map((l) => revisionExportLine.parse(JSON.parse(l) as unknown));
  const derived = JSON.stringify(lines.map(metaItemOf));
  if (derived !== JSON.stringify(meta.items))
    throw new Error(`berkas ekspor revisi ${meta.export_file}: isi tidak sama dengan metadata git`);
  return { meta, lines };
}

export type RevisionStaleReason =
  | "passage_missing"
  | "source_changed"
  | "no_draft"
  | "draft_changed"
  | "invalid_text";

export interface RevisionStats {
  total: number;
  confirmed: number;
  revised: number;
  /** Tidak dimuat (dihitung, tidak ditulis balik ke DB app). */
  stale: { passage_id: number; revision_id: number; reason: RevisionStaleReason }[];
  /** Perbaikan yang tetap dimuat walau draf AI di sekitarnya berubah (revisi manusia menang). */
  draftChanged: number[];
}

type RevisionRows = Pick<CorpusRows, "passage" | "passage_ayah_ref" | "footnote_ref">;

/** Pemeriksa satu revisi terhadap baris korpus yang sedang dibangun (dipakai ingest + batch). */
function revisionChecker(rows: RevisionRows) {
  const passageBy = new Map(rows.passage.map((p) => [p.id, p]));
  const refsBy = new Map<number, ReturnType<typeof toAyahRef>[]>();
  for (const r of rows.passage_ayah_ref)
    refsBy.set(r.passage_id, [...(refsBy.get(r.passage_id) ?? []), toAyahRef(r)]);
  const footBy = new Map<number, ReturnType<typeof toFootnoteRef>[]>();
  for (const r of rows.footnote_ref)
    footBy.set(r.passage_id, [...(footBy.get(r.passage_id) ?? []), toFootnoteRef(r)]);
  /**
   * `draft` = draf AI yang berlaku sekarang (lolos, sumbernya sama), atau `null`. Hasil: alasan usang,
   * atau `null` = revisi berlaku. Perbaikan divalidasi dengan dasar = draf (petik/kurung yang memang
   * tidak berpasangan di draf, mis. kutipan lintas paragraf, cukup peringatan, sama dengan saat
   * simpan).
   */
  return (l: RevisionExportLine, draft: string | null): RevisionStaleReason | null => {
    const p = passageBy.get(l.passage_id);
    if (p === undefined) return "passage_missing";
    if (sha256(p.text_raw) !== l.source_sha256) return "source_changed";
    if (draft === null) return "no_draft";
    if (l.kind === "confirmed") return sha256(draft) === l.base_sha256 ? null : "draft_changed";
    const check = validateTranslationText(l.text ?? "", {
      arabic: p.text_raw,
      ayahRefs: refsBy.get(p.id) ?? [],
      footnoteRefs: footBy.get(p.id) ?? [],
      base: draft,
    });
    return check.ok ? null : "invalid_text";
  };
}

/**
 * Paragraf yang revisi manusianya MASIH BERLAKU terhadap baris korpus + draf AI sekarang: batch AI
 * (`plan`/`submit`/`retry`) tidak menerjemahkan ulang paragraf ini. Revisi usang (teks Arab berubah,
 * placeholder tidak cocok lagi, draf hilang/ditolak/usang) TIDAK dilindungi, supaya paragrafnya
 * mendapat draf AI baru (dan tidak pernah kehilangan terjemahan); perbaikan manusianya berlaku lagi
 * di atas draf baru, "sudah benar" perlu ditinjau ulang.
 */
export function protectedRevisions(
  rows: RevisionRows,
  loaded: LoadedRevisions | null,
  draftOf: (passageId: number) => string | null,
): ReadonlySet<number> {
  if (loaded === null) return new Set();
  const check = revisionChecker(rows);
  return new Set(
    loaded.lines.filter((l) => check(l, draftOf(l.passage_id)) === null).map((l) => l.passage_id),
  );
}

/**
 * Terapkan revisi ke baris terjemahan korpus yang sedang dibangun. Sudah benar → status tinjauan
 * saja (teks AI tetap), hanya bila draf AI = draf yang dinyatakan benar. Perbaikan → teks diganti,
 * draf AI disimpan di `translation_review.ai_text`; divalidasi ulang terhadap teks Arab + rujukan
 * ayat korpus ini (placeholder yang kini tidak cocok = usang). Status: akun ustadz terdaftar →
 * `ustadz_verified`, editor lain → `reviewed`.
 */
export function applyRevisions(
  rows: RevisionRows & Pick<CorpusRows, "translation">,
  loaded: LoadedRevisions | null,
): {
  translation: TranslationRow[];
  translation_review: TranslationReviewRow[];
  stats: RevisionStats;
} {
  const stats: RevisionStats = { total: 0, confirmed: 0, revised: 0, stale: [], draftChanged: [] };
  if (loaded === null) return { translation: [...rows.translation], translation_review: [], stats };
  stats.total = loaded.lines.length;
  const check = revisionChecker(rows);
  const translation = new Map(
    rows.translation.filter((t) => t.lang === "id").map((t) => [t.passage_id, t]),
  );
  const review: TranslationReviewRow[] = [];
  for (const l of loaded.lines) {
    const ai = translation.get(l.passage_id);
    const reason = check(l, ai?.text ?? null);
    if (reason !== null || ai === undefined) {
      stats.stale.push({
        passage_id: l.passage_id,
        revision_id: l.revision_id,
        reason: reason ?? "no_draft",
      });
      continue;
    }
    if (l.kind === "revised" && sha256(ai.text) !== l.draft_sha256)
      stats.draftChanged.push(l.passage_id);
    translation.set(
      l.passage_id,
      translationRow.parse({
        ...ai,
        text: l.kind === "revised" ? l.text : ai.text,
        review_status: l.reviewer_role === "ustadz" ? "ustadz_verified" : "reviewed",
      }),
    );
    review.push(
      translationReviewRow.parse({
        passage_id: l.passage_id,
        lang: "id",
        revision_id: l.revision_id,
        revised: l.kind === "revised" ? 1 : 0,
        reviewed_at: l.reviewed_at,
        reviewer_name: l.reviewer_name,
        reviewer_short: l.reviewer_short,
        reviewer_role: l.reviewer_role,
        reviewer_public: l.reviewer_public ? 1 : 0,
        ai_text: l.kind === "revised" ? ai.text : null,
      }),
    );
    if (l.kind === "revised") stats.revised++;
    else stats.confirmed++;
  }
  const others = rows.translation.filter((t) => t.lang !== "id");
  return {
    translation: [...others, ...translation.values()].sort(
      (a, b) => a.passage_id - b.passage_id || (a.lang < b.lang ? -1 : 1),
    ),
    translation_review: review.sort((a, b) => a.passage_id - b.passage_id),
    stats,
  };
}

const STALE_LABEL: Record<RevisionStaleReason, string> = {
  passage_missing: "paragraf tidak ada",
  source_changed: "teks Arab berubah",
  no_draft: "tanpa draf AI yang berlaku (batch akan menerjemahkan ulang)",
  draft_changed: "draf AI yang dinyatakan benar sudah diganti",
  invalid_text:
    "teks perbaikan tidak lolos pemeriksaan terhadap korpus ini (mis. rujukan ayat berubah)",
};

/**
 * Invarian laporan validasi: status tinjauan manusia di `translation` ada bila dan hanya bila baris
 * `translation_review`-nya ada. Revisi usang bukan galat (dilaporkan, menunggu ditinjau ulang).
 */
export function revisionInvariant(
  rows: Pick<CorpusRows, "translation" | "translation_review">,
  stats: RevisionStats,
): { name: string; ok: boolean; detail: string } {
  const reviewed = new Set(
    rows.translation
      .filter((t) => t.review_status === "reviewed" || t.review_status === "ustadz_verified")
      .map((t) => `${t.passage_id}:${t.lang}`),
  );
  const provenance = new Set(rows.translation_review.map((r) => `${r.passage_id}:${r.lang}`));
  const ok = reviewed.size === provenance.size && [...reviewed].every((k) => provenance.has(k));
  const stale = Object.entries(
    Object.groupBy(stats.stale, (s) => s.reason) as Partial<Record<RevisionStaleReason, unknown[]>>,
  )
    .map(([reason, list]) => `${STALE_LABEL[reason as RevisionStaleReason]} ${list?.length ?? 0}`)
    .join(", ");
  return {
    name: "Revisi terjemahan manusia (X08): status tinjauan = asal tinjauannya",
    ok,
    detail:
      stats.total === 0
        ? "0 revisi berlaku"
        : `${stats.total} revisi: ${stats.confirmed} sudah benar + ${stats.revised} perbaikan dimuat; usang ${stats.stale.length}${
            stale === ""
              ? ""
              : ` (${stale}: ${stats.stale
                  .map((s) => s.passage_id)
                  .slice(0, 10)
                  .join(", ")})`
          }; perbaikan dengan draf AI berubah ${stats.draftChanged.length}`,
  };
}

/**
 * Baris `meta` korpus: sha256 berkas ekspor yang dimuat + jumlah revisi DI BERKAS itu. Deterministik
 * tanpa hasil batch AI (QA `corpus:qa` membangun ulang harapan tanpa terjemahan); jumlah yang benar-
 * benar dimuat ada di laporan validasi dan `translation_review`.
 */
export function revisionMetaRows(loaded: LoadedRevisions | null): MetaRow[] {
  if (loaded === null) return [];
  return [
    metaRow.parse({ key: "revisions_sha256", value: loaded.meta.export_sha256 }),
    metaRow.parse({ key: "revisions_count", value: String(loaded.lines.length) }),
  ];
}
