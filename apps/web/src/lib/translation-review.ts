// Koreksi terjemahan oleh editor terdaftar (X08, ADR-081) untuk /tinjau/terjemahan dan /admin.
// Dipanggil HANYA sesudah auth Access + cek peran di route (`canUseTinjauRoom`). Teks Arab selalu
// `text_raw` DB; editor hanya menulis teks Indonesia, divalidasi terhadap teks Arab paragraf di
// server (`validateTranslationText`). Revisi tersimpan di DB app dan baru tampil di situs lewat
// korpus berikutnya (ekspor + ingest), jadi pembaca, Cari, MCP, dan Maknaz berubah bersamaan.
//
// Urutan antrean awal (X08, alasan di ADR-081): laporan pembaca jenis terjemahan yang belum selesai
// → paragraf yang dikutip Maknaz (jawaban eval publik + cache) → paragraf badan urut kitab (mulai
// Mukadimah dan Kitab al-'Ilm, bagian yang paling dulu dibaca) → catatan kaki takhrij urut kitab.
// Hasil T-17 tahap 3 (Salah/Kurang) menyusul di depan setelah dinilai.
import {
  canRevert,
  previousState,
  referencedRevisionIds,
  reviewPassages,
  stateOf,
  textSha256,
  validateTranslationText,
} from "@surau/core";
import type {
  AyahRef,
  CorpusTranslation,
  FootnoteRef,
  QuranView,
  ReviewPassage,
  TranslationEditor,
  TranslationIssue,
  TranslationRevisionInput,
  TranslationState,
  TranslationTextCheck,
} from "@surau/core";
import {
  AI_TEXT_LANG,
  getActiveTranslationRevisions,
  getCorpusMeta,
  getPassagesByIds,
  getTranslationRevisionHistory,
  getTranslationRevisionsByIds,
  getTranslations,
  listActiveTranslationRevisions,
  listRecentTranslationRevisions,
  listTranslatedPassages,
  listTranslationRevisionAuthors,
  listTranslationRevisionsByAuthorSince,
  passageAnchor,
  passageId,
  quotaDay,
  saveTranslationRevision,
  translationQueueSignals,
  countTranslationRevisionsSince,
} from "@surau/db";
import type {
  D1Db,
  TranslatedPassage,
  TranslationEditorSeen,
  TranslationRevisionKind,
  TranslationRevisionRow,
  TranslationRevisionStatus,
  TranslationRevisionWrite,
  TranslationRow,
} from "@surau/db";

import { wordDiff } from "./word-diff";
import type { DiffPiece } from "./word-diff";

export const TR_QUEUE_PAGE = 20;
export const TR_QUEUE_FILTERS = ["todo", "done", "stale"] as const;
export type TrQueueFilter = (typeof TR_QUEUE_FILTERS)[number];
/** Batas simpanan per editor per hari UTC (gagal tertutup, 429); cukup untuk kerja wajar. */
export const TR_DAILY_LIMIT = 200;
/** Batalkan massal per permintaan /admin (sisanya dengan menekan lagi). */
export const TR_BULK_REVERT_MAX = 100;
/** Edisi Ihya (satu-satunya korpus sekarang). */
export const TR_EDITION = 1;

export interface TrDeps {
  corpus: D1Db;
  app: D1Db;
  /** Kunci akun (hash issuer + subjek Access). */
  identity: string;
  now: string;
  editionId?: number;
}

const dayStartOf = (now: string) => `${quotaDay(new Date(now))}T00:00:00.000Z`;

// Daftar paragraf berterjemahan per versi korpus, disimpan di isolate (±16 ribu ID Ihya). Gagal = tidak
// disimpan, dicoba lagi pada permintaan berikutnya.
const memo = new Map<string, Promise<TranslatedPassage[]>>();
async function translatedIndex(corpus: D1Db, editionId: number): Promise<TranslatedPassage[]> {
  const meta = await getCorpusMeta(corpus);
  const key = `${meta.corpus_version ?? "?"}@${meta.built_at ?? ""}:${editionId}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const build = listTranslatedPassages(corpus, editionId, AI_TEXT_LANG);
  if (memo.size >= 2) memo.clear();
  memo.set(key, build);
  build.catch(() => memo.delete(key));
  return build;
}

/** Terjemahan korpus satu paragraf sebagai dasar resolusi keadaan. */
export async function corpusTranslation(
  textRaw: string,
  translation: Pick<TranslationRow, "text">,
): Promise<CorpusTranslation> {
  const [draftSha256, sourceSha256] = await Promise.all([
    textSha256(translation.text),
    textSha256(textRaw),
  ]);
  return {
    text: translation.text,
    draft: translation.text,
    draftSha256,
    sourceSha256,
    reviewed: false,
  };
}

interface ActiveInfo {
  state: TranslationState;
  mine: boolean;
}

/** Keadaan setiap paragraf yang punya revisi aktif (antrean, ekspor). */
async function activeStates(
  deps: Pick<TrDeps, "corpus" | "app" | "identity">,
  actives: readonly TranslationRevisionRow[],
): Promise<Map<number, ActiveInfo>> {
  if (actives.length === 0) return new Map();
  const ids = actives.map((a) => a.passage_id);
  const [refs, passages, translations] = await Promise.all([
    getTranslationRevisionsByIds(deps.app, referencedRevisionIds(actives)),
    getPassagesByIds(deps.corpus, ids),
    getTranslations(deps.corpus, ids, AI_TEXT_LANG),
  ]);
  const byId = new Map([...refs, ...actives].map((r) => [r.id, r]));
  const rawBy = new Map(passages.map((p) => [p.id, p.text_raw]));
  const trBy = new Map(translations.map((t) => [t.passage_id, t]));
  const out = new Map<number, ActiveInfo>();
  for (const a of actives) {
    const raw = rawBy.get(a.passage_id);
    const tr = trBy.get(a.passage_id);
    if (raw === undefined || tr === undefined) continue;
    out.set(a.passage_id, {
      state: stateOf(a, byId, await corpusTranslation(raw, tr)),
      mine: a.author_key === deps.identity,
    });
  }
  return out;
}

const bucket = (info: ActiveInfo | undefined): TrQueueFilter =>
  info === undefined || info.state.kind === "ai"
    ? "todo"
    : info.state.stale !== null
      ? "stale"
      : "done";

export type TrReason = "laporan" | "maknaz" | "catatan_kaki";

export interface TrSignals {
  reports: ReadonlyMap<number, number>;
  cited: ReadonlyMap<number, number>;
}

/** Urutan antrean: laporan terbanyak → dikutip Maknaz terbanyak → badan urut kitab → catatan kaki. */
export function trQueueOrder<T extends { id: number; kind: "body" | "foot" }>(
  entries: readonly T[],
  signals: TrSignals,
): T[] {
  const r = (e: T) => signals.reports.get(e.id) ?? 0;
  const c = (e: T) => signals.cited.get(e.id) ?? 0;
  return [...entries].sort(
    (a, b) =>
      r(b) - r(a) ||
      c(b) - c(a) ||
      Number(a.kind === "foot") - Number(b.kind === "foot") ||
      a.id - b.id,
  );
}

function reasonsOf(e: { id: number; kind: "body" | "foot" }, s: TrSignals): TrReason[] {
  const out: TrReason[] = [];
  if ((s.reports.get(e.id) ?? 0) > 0) out.push("laporan");
  if ((s.cited.get(e.id) ?? 0) > 0) out.push("maknaz");
  if (e.kind === "foot") out.push("catatan_kaki");
  return out;
}

export interface TrQueueItem {
  passage_id: number;
  /** "j. 1, h. 200 · p2824" */
  location: string;
  reasons: TrReason[];
  reports: number;
  cites: number;
  state: TranslationState["kind"];
  stale: TranslationState["stale"];
  /** Nama pendek pengoreksi/pemeriksa keadaan sekarang (bukan pembatal). */
  by: string | null;
  mine: boolean;
}

export interface TrQueue {
  filter: TrQueueFilter;
  offset: number;
  page: number;
  counts: Record<TrQueueFilter, number>;
  items: TrQueueItem[];
  next: number | null;
  daily: { used: number; limit: number };
}

export async function translationQueue(
  deps: TrDeps,
  filter: TrQueueFilter,
  offset: number,
): Promise<TrQueue> {
  const [entries, signals, actives, used] = await Promise.all([
    translatedIndex(deps.corpus, deps.editionId ?? TR_EDITION),
    translationQueueSignals(deps.app, deps.now),
    listActiveTranslationRevisions(deps.app),
    countTranslationRevisionsSince(deps.app, deps.identity, dayStartOf(deps.now)),
  ]);
  const states = await activeStates(deps, actives);
  const counts: Record<TrQueueFilter, number> = { todo: 0, done: 0, stale: 0 };
  for (const e of entries) counts[bucket(states.get(e.id))]++;
  const ordered = trQueueOrder(
    entries.filter((e) => bucket(states.get(e.id)) === filter),
    signals,
  );
  const page = ordered.slice(offset, offset + TR_QUEUE_PAGE);
  const rows = new Map(
    (
      await getPassagesByIds(
        deps.corpus,
        page.map((e) => e.id),
      )
    ).map((p) => [p.id, p]),
  );
  return {
    filter,
    offset,
    page: TR_QUEUE_PAGE,
    counts,
    items: page.map((e) => {
      const p = rows.get(e.id);
      const info = states.get(e.id);
      return {
        passage_id: e.id,
        location: p === undefined ? "" : `j. ${p.juz}, h. ${p.page_no} · ${passageAnchor(e.id)}`,
        reasons: reasonsOf(e, signals),
        reports: signals.reports.get(e.id) ?? 0,
        cites: signals.cited.get(e.id) ?? 0,
        state: info?.state.kind ?? "ai",
        stale: info?.state.stale ?? null,
        by: info?.state.source?.author_short ?? null,
        mine: info?.mine ?? false,
      };
    }),
    next: offset + TR_QUEUE_PAGE < ordered.length ? offset + TR_QUEUE_PAGE : null,
    daily: { used, limit: TR_DAILY_LIMIT },
  };
}

/**
 * Rujukan paragraf dari isian editor: ID paragraf, jangkar `p2824`, atau tautan pembaca yang memuat
 * `#p2824`. `null` bila tidak dikenali.
 */
export function resolvePassageRef(ref: string, editionId = TR_EDITION): number | null {
  const s = ref.trim();
  if (/^[1-9][0-9]{0,9}$/u.test(s)) return Number(s);
  const m = /(?:^|#)p([1-9][0-9]{0,6})$/u.exec(s);
  return m === null ? null : passageId(editionId, Number(m[1]));
}

interface ItemContext {
  rp: ReviewPassage;
  translation: TranslationRow;
  corpus: CorpusTranslation;
  history: TranslationRevisionRow[];
  byId: Map<number, TranslationRevisionRow>;
  active: TranslationRevisionRow | null;
  state: TranslationState;
  corpusVersion: string;
}

async function loadContext(
  deps: Pick<TrDeps, "corpus" | "app">,
  id: number,
): Promise<ItemContext | null> {
  const [passages, history, meta] = await Promise.all([
    reviewPassages(deps.corpus, [id]),
    getTranslationRevisionHistory(deps.app, id),
    getCorpusMeta(deps.corpus),
  ]);
  const rp = passages.get(id);
  const translation = rp?.translation;
  if (rp === undefined || translation === null || translation === undefined) return null;
  if (translation.review_status === "rejected") return null;
  const corpus = await corpusTranslation(rp.passage.text_raw, translation);
  const byId = new Map(history.map((r) => [r.id, r]));
  const active = history.find((r) => r.status === "active") ?? null;
  return {
    rp,
    translation,
    corpus,
    history,
    byId,
    active,
    state: stateOf(active, byId, corpus),
    corpusVersion: meta.corpus_version ?? "unknown",
  };
}

export interface TrRevisionView {
  id: number;
  kind: TranslationRevisionKind;
  status: TranslationRevisionStatus;
  text: string | null;
  reason: string;
  /** Nama lengkap terdaftar saat menyimpan (pembatal tampil di riwayat, tidak di label). */
  author: string;
  created_at: string;
  /** Pembatalan: kembali ke revisi ini (`null` = draf AI). */
  restores_id: number | null;
}

export interface TrStateView {
  kind: TranslationState["kind"];
  text: string;
  stale: TranslationState["stale"];
  by: { short: string; full: string; role: TranslationRevisionRow["author_role"] } | null;
  at: string | null;
  source_id: number | null;
}

const stateView = (s: TranslationState): TrStateView => ({
  kind: s.kind,
  text: s.text,
  stale: s.stale,
  by:
    s.source === null
      ? null
      : { short: s.source.author_short, full: s.source.author_name, role: s.source.author_role },
  at: s.source?.created_at ?? null,
  source_id: s.source?.id ?? null,
});

export interface TrItem {
  passage_id: number;
  anchor: string;
  kind: "body" | "foot";
  location: { label: string; permalink: string };
  corpus_version: string;
  /** `text_raw` paragraf persis dari DB (teks Arab hanya dari sini). */
  arabic: string;
  ayah_refs: AyahRef[];
  footnote_refs: FootnoteRef[];
  /** Terjemahan Kemenag ayat yang dikutip (pratinjau seperti pembaca). */
  quran: QuranView | null;
  /** Asal draf AI. */
  ai: Pick<TranslationRow, "model" | "prompt_version" | "created_at">;
  draft: string;
  state: TrStateView;
  /** sha256 `state.text`: dikirim balik saat simpan (konflik versi). */
  base_sha256: string;
  active_id: number | null;
  /** "Sudah benar" hanya atas draf AI (bukan atas teks perbaikan orang lain). */
  can_confirm: boolean;
  can_revert: boolean;
  /** Keadaan yang dipulihkan bila "Batalkan" ditekan. */
  revert_to: TrStateView | null;
  /** Pemeriksaan otomatis teks yang tampil sekarang terhadap teks Arab. */
  check: TranslationTextCheck;
  history: TrRevisionView[];
  reasons: TrReason[];
  reports: number;
  cites: number;
  daily: { used: number; limit: number };
}

export async function translationReviewItem(deps: TrDeps, id: number): Promise<TrItem | null> {
  const [ctx, signals, used] = await Promise.all([
    loadContext(deps, id),
    translationQueueSignals(deps.app, deps.now),
    countTranslationRevisionsSince(deps.app, deps.identity, dayStartOf(deps.now)),
  ]);
  if (ctx === null) return null;
  const p = ctx.rp.passage;
  return {
    passage_id: p.id,
    anchor: p.anchor,
    kind: p.kind,
    location: { label: p.location.label, permalink: p.location.permalink },
    corpus_version: ctx.corpusVersion,
    arabic: p.text_raw,
    ayah_refs: p.ayah_refs,
    footnote_refs: p.footnote_refs,
    quran: ctx.rp.quran,
    ai: {
      model: ctx.translation.model,
      prompt_version: ctx.translation.prompt_version,
      created_at: ctx.translation.created_at,
    },
    draft: ctx.corpus.draft,
    state: stateView(ctx.state),
    base_sha256: await textSha256(ctx.state.text),
    active_id: ctx.active?.id ?? null,
    can_confirm: ctx.state.kind === "ai",
    can_revert: canRevert(ctx.active, ctx.byId),
    revert_to:
      ctx.active === null || !canRevert(ctx.active, ctx.byId)
        ? null
        : stateView(previousState(ctx.active, ctx.byId, ctx.corpus)),
    check: validateTranslationText(ctx.state.text, {
      arabic: p.text_raw,
      ayahRefs: p.ayah_refs,
      footnoteRefs: p.footnote_refs,
    }),
    history: ctx.history.map((r) => ({
      id: r.id,
      kind: r.kind,
      status: r.status,
      text: r.text,
      reason: r.reason,
      author: r.author_name,
      created_at: r.created_at,
      restores_id: r.restores_id,
    })),
    reasons: reasonsOf({ id: p.id, kind: p.kind }, signals),
    reports: signals.reports.get(p.id) ?? 0,
    cites: signals.cited.get(p.id) ?? 0,
    daily: { used, limit: TR_DAILY_LIMIT },
  };
}

export type TrSaveResult =
  | { ok: true; id: number }
  | {
      ok: false;
      error: "not_found" | "conflict" | "limit" | "not_allowed" | "unchanged" | "invalid_text";
      issues?: TranslationIssue[];
    };

/** Teks perbaikan: baris baru Windows diseragamkan, spasi di awal/akhir dibuang. */
export const normalizeRevisionText = (text: string) => text.replaceAll(/\r\n?/gu, "\n").trim();

/** Penulis pembatalan dari /admin (pemilik; tidak pernah tampil di label). */
const ADMIN_AUTHOR = { name: "Pemilik (admin)", short: "Pemilik" } as const;

interface Author {
  key: string;
  name: string;
  short: string;
  role: TranslationRevisionRow["author_role"];
  public: 0 | 1;
}

const editorAuthor = (identity: string, e: TranslationEditor): Author => ({
  key: identity,
  name: e.full,
  short: e.short,
  role: e.role,
  public: e.mcpName ? 1 : 0,
});

async function write(
  deps: Pick<TrDeps, "app" | "now">,
  ctx: ItemContext,
  author: Author,
  fields: Pick<TranslationRevisionWrite, "kind" | "text" | "reason" | "restores_id">,
  dailyLimit: number | null,
): Promise<TrSaveResult> {
  const saved = await saveTranslationRevision(
    deps.app,
    {
      passage_id: ctx.rp.passage.id,
      lang: "id",
      ...fields,
      base_sha256: await textSha256(ctx.state.text),
      draft_sha256: ctx.corpus.draftSha256,
      source_sha256: ctx.corpus.sourceSha256,
      author_key: author.key,
      author_name: author.name,
      author_short: author.short,
      author_role: author.role,
      author_public: author.public,
      corpus_version: ctx.corpusVersion,
      created_at: deps.now,
    },
    { expectedActiveId: ctx.active?.id ?? null, dailyLimit, dayStart: dayStartOf(deps.now) },
  );
  return saved.ok ? saved : { ok: false, error: saved.reason };
}

/** Simpan "sudah benar", perbaikan, atau pembatalan oleh editor terdaftar. */
export async function saveTranslationDecision(
  deps: TrDeps,
  editor: TranslationEditor,
  input: TranslationRevisionInput,
): Promise<TrSaveResult> {
  const ctx = await loadContext(deps, input.passage_id);
  if (ctx === null) return { ok: false, error: "not_found" };
  if (
    input.active_id !== (ctx.active?.id ?? null) ||
    input.base_sha256 !== (await textSha256(ctx.state.text))
  )
    return { ok: false, error: "conflict" };
  const author = editorAuthor(deps.identity, editor);
  const reason = input.reason.trim();
  if (input.action === "confirm") {
    if (ctx.state.kind !== "ai") return { ok: false, error: "not_allowed" };
    return write(
      deps,
      ctx,
      author,
      { kind: "confirmed", text: null, reason, restores_id: null },
      TR_DAILY_LIMIT,
    );
  }
  if (input.action === "revert") {
    if (ctx.active === null || !canRevert(ctx.active, ctx.byId))
      return { ok: false, error: "not_allowed" };
    const prev = previousState(ctx.active, ctx.byId, ctx.corpus);
    return write(
      deps,
      ctx,
      author,
      { kind: "reverted", text: null, reason, restores_id: prev.source?.id ?? null },
      TR_DAILY_LIMIT,
    );
  }
  const text = normalizeRevisionText(input.text);
  if (text === ctx.state.text) return { ok: false, error: "unchanged" };
  const p = ctx.rp.passage;
  const check = validateTranslationText(text, {
    arabic: p.text_raw,
    ayahRefs: p.ayah_refs,
    footnoteRefs: p.footnote_refs,
    base: ctx.state.text,
  });
  if (!check.ok) return { ok: false, error: "invalid_text", issues: check.errors };
  return write(
    deps,
    ctx,
    author,
    { kind: "revised", text, reason, restores_id: null },
    TR_DAILY_LIMIT,
  );
}

// ── /admin ──────────────────────────────────────────────────────────────────────────────────

export interface AdminTrRevision {
  id: number;
  passage_id: number;
  location: string;
  permalink: string;
  kind: TranslationRevisionKind;
  status: TranslationRevisionStatus;
  author: string;
  role: TranslationRevisionRow["author_role"];
  reason: string;
  created_at: string;
  /** Perbaikan: diff kata dari teks sebelumnya (null bila terlalu panjang atau bukan perbaikan). */
  diff: DiffPiece[] | null;
  /** Pembatalan: nama pendek keadaan yang dipulihkan (`null` = draf AI). */
  restores: string | null;
  /** Revisi aktif paragrafnya yang masih bisa dibatalkan dari sini. */
  active: boolean;
}

export interface AdminTranslationOverview {
  recent: AdminTrRevision[];
  /** Halaman berikutnya (`before`), atau null. */
  next_before: number | null;
  /** Editor yang pernah menyimpan (untuk batalkan massal); kunci = hash akun, bukan email. */
  authors: TranslationEditorSeen[];
}

export const ADMIN_TR_PAGE = 20;

export async function adminTranslationOverview(
  app: D1Db,
  corpus: D1Db,
  before: number | null = null,
): Promise<AdminTranslationOverview> {
  const [recent, authors] = await Promise.all([
    listRecentTranslationRevisions(app, ADMIN_TR_PAGE, before),
    listTranslationRevisionAuthors(app),
  ]);
  // Baris yang dirujuk (digantikan/dipulihkan) dua tingkat: cukup untuk keadaan sebelum revisi.
  const level1 = await getTranslationRevisionsByIds(app, referencedRevisionIds(recent));
  const level2 = await getTranslationRevisionsByIds(app, referencedRevisionIds(level1));
  const byId = new Map([...level2, ...level1, ...recent].map((r) => [r.id, r]));
  const ids = [...new Set(recent.map((r) => r.passage_id))];
  const [passages, translations] = await Promise.all([
    getPassagesByIds(corpus, ids),
    getTranslations(corpus, ids, AI_TEXT_LANG),
  ]);
  const pBy = new Map(passages.map((p) => [p.id, p]));
  const trBy = new Map(translations.map((t) => [t.passage_id, t]));
  const out: AdminTrRevision[] = [];
  for (const r of recent) {
    const p = pBy.get(r.passage_id);
    const tr = trBy.get(r.passage_id);
    let diff: DiffPiece[] | null = null;
    let restores: string | null = null;
    if (p !== undefined && tr !== undefined) {
      const corpusTr = await corpusTranslation(p.text_raw, tr);
      if (r.kind === "revised" && r.text !== null) {
        const prev = previousState(r, byId, corpusTr);
        diff = wordDiff(prev.text, r.text);
      }
      if (r.kind === "reverted")
        restores = r.restores_id === null ? null : (byId.get(r.restores_id)?.author_short ?? null);
    }
    out.push({
      id: r.id,
      passage_id: r.passage_id,
      location:
        p === undefined ? "" : `j. ${p.juz}, h. ${p.page_no} · ${passageAnchor(r.passage_id)}`,
      permalink:
        p === undefined ? "" : `/kitab/ihya/${p.juz}/${p.page_no}#${passageAnchor(r.passage_id)}`,
      kind: r.kind,
      status: r.status,
      author: r.author_name,
      role: r.author_role,
      reason: r.reason,
      created_at: r.created_at,
      diff,
      restores,
      active: r.status === "active" && canRevert(r, byId),
    });
  }
  return {
    recent: out,
    next_before: recent.length === ADMIN_TR_PAGE ? (recent.at(-1)?.id ?? null) : null,
    authors,
  };
}

const adminAuthor = (identity: string): Author => ({
  key: identity,
  name: ADMIN_AUTHOR.name,
  short: ADMIN_AUTHOR.short,
  role: "admin",
  public: 0,
});

/** Pemilik membatalkan satu revisi aktif (kembali ke keadaan sebelumnya). */
export async function adminRevertRevision(deps: TrDeps, revisionId: number): Promise<TrSaveResult> {
  const [row] = await getTranslationRevisionsByIds(deps.app, [revisionId]);
  if (row === undefined) return { ok: false, error: "not_found" };
  const ctx = await loadContext(deps, row.passage_id);
  if (ctx === null) return { ok: false, error: "not_found" };
  if (ctx.active?.id !== row.id) return { ok: false, error: "conflict" };
  if (!canRevert(row, ctx.byId)) return { ok: false, error: "not_allowed" };
  const prev = previousState(row, ctx.byId, ctx.corpus);
  return write(
    deps,
    ctx,
    adminAuthor(deps.identity),
    {
      kind: "reverted",
      text: null,
      reason: "Dibatalkan pemilik lewat /admin",
      restores_id: prev.source?.id ?? null,
    },
    null,
  );
}

export interface BulkRevertResult {
  reverted: number;
  /** Paragraf yang sesudahnya diubah editor lain: tidak disentuh, tinjau manual. */
  skipped: number;
  /** Paragraf yang belum diproses (lebih dari `TR_BULK_REVERT_MAX`): tekan lagi. */
  remaining: number;
}

/**
 * Batalkan semua koreksi satu editor sejak waktu tertentu (akun disalahgunakan). Hanya paragraf
 * yang revisi aktifnya masih milik editor itu; keadaan dipulihkan ke sebelum rangkaian simpanannya
 * sejak `since` (bisa revisi editor lain, atau draf AI).
 */
export async function adminRevertAuthorSince(
  deps: TrDeps,
  authorKey: string,
  since: string,
): Promise<BulkRevertResult> {
  const rows = await listTranslationRevisionsByAuthorSince(deps.app, authorKey, since);
  const actives = await getActiveTranslationRevisions(
    deps.app,
    rows.map((r) => r.passage_id),
  );
  const mine = actives.filter((a) => a.author_key === authorKey && a.created_at >= since);
  const skipped = actives.length - mine.length;
  let reverted = 0;
  for (const active of mine.slice(0, TR_BULK_REVERT_MAX)) {
    const ctx = await loadContext(deps, active.passage_id);
    if (ctx === null || ctx.active?.id !== active.id) continue;
    let cur: TranslationRevisionRow | null = active;
    while (cur !== null && cur.author_key === authorKey && cur.created_at >= since)
      cur = cur.supersedes_id === null ? null : (ctx.byId.get(cur.supersedes_id) ?? null);
    const target = stateOf(cur, ctx.byId, { ...ctx.corpus, reviewed: false });
    const saved = await write(
      deps,
      ctx,
      adminAuthor(deps.identity),
      {
        kind: "reverted",
        text: null,
        reason: "Batalkan massal oleh pemilik lewat /admin",
        restores_id: target.source?.id ?? null,
      },
      null,
    );
    if (saved.ok) reverted++;
  }
  return { reverted, skipped, remaining: Math.max(0, mine.length - TR_BULK_REVERT_MAX) };
}
