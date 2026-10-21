import {
  TAKHRIJ_TERMS_VERSION,
  answerPassages,
  effectiveTakhrijReview,
  reviewedTakhrijLabel,
  takhrijLabel,
  takhrijLabelHash,
} from "@surau/core";
import type { ReviewedTakhrijLabel, TakhrijLabel, TakhrijReviewInput } from "@surau/core";
import {
  getCorpusMeta,
  getPassagesByIds,
  getTakhrijReviews,
  listFootnoteTexts,
  listTakhrijReviews,
  saveTakhrijReview,
  takhrijCitedCounts,
} from "@surau/db";
import type { D1Db, TakhrijReview, TakhrijReviewDecision } from "@surau/db";

// Antrean tinjauan label status hadits (X07, ADR-070) untuk /tinjau/takhrij. Dipanggil HANYA
// sesudah auth Access. Label dihitung kode dari teks catatan kaki DB (`takhrijLabel`); antrean
// memuat semua catatan kaki yang dikenali sebagai takhrij, urut: paling sering dikutip Jawab,
// lalu yang penilaiannya berbeda per jalur (`mixed`), lalu urutan kitab. Status "sudah ditinjau"
// per penilai, dan hanya bila label yang ditinjau sama dengan label sekarang.

export const QUEUE_PAGE = 20;
export const QUEUE_FILTERS = ["todo", "unsure", "done"] as const;
export type QueueFilter = (typeof QUEUE_FILTERS)[number];

export interface QueueDeps {
  corpus: D1Db;
  app: D1Db;
  /** Kunci penilai (hash issuer + subjek Access). */
  identity: string;
  now: string;
  /** Kunci akun ustadz peninjau terdaftar (`TAKHRIJ_USTADZ_KEYS`). */
  ustadzKeys: ReadonlySet<string>;
  editionId?: number;
}

interface IndexEntry {
  id: number;
  label: TakhrijLabel;
}

// Label semua catatan kaki per versi korpus + versi aturan, disimpan di isolate (±4.400 catatan kaki
// Ihya, ±0,2 dtk sekali per isolate). Gagal = tidak disimpan, dicoba lagi pada permintaan berikutnya.
const memo = new Map<string, Promise<IndexEntry[]>>();
async function labelIndex(corpus: D1Db, editionId: number): Promise<IndexEntry[]> {
  const meta = await getCorpusMeta(corpus);
  const key = `${meta.corpus_version ?? "?"}@${meta.built_at ?? ""}:${editionId}:${TAKHRIJ_TERMS_VERSION}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const build = (async () => {
    const out: IndexEntry[] = [];
    for (let after = 0; ;) {
      const rows = await listFootnoteTexts(corpus, editionId, after, 1000);
      for (const r of rows) {
        const label = takhrijLabel(r.text_raw);
        if (label.kind !== "not_takhrij") out.push({ id: r.id, label });
      }
      if (rows.length < 1000) return out;
      after = rows.at(-1)!.id;
    }
  })();
  if (memo.size >= 2) memo.clear();
  memo.set(key, build);
  build.catch(() => memo.delete(key));
  return build;
}

/** Urutan prioritas: kutipan Jawab terbanyak, lalu berbeda per jalur, lalu urutan kitab (ID). */
export function queueOrder<T extends { id: number; label: { mixed: boolean } }>(
  entries: readonly T[],
  cites: ReadonlyMap<number, number>,
): T[] {
  return [...entries].sort(
    (a, b) =>
      (cites.get(b.id) ?? 0) - (cites.get(a.id) ?? 0) ||
      Number(b.label.mixed) - Number(a.label.mixed) ||
      a.id - b.id,
  );
}

interface OwnState {
  decision: TakhrijReviewDecision;
  /** Label sudah berubah sejak ditinjau (teks/aturan): masuk lagi ke "belum ditinjau". */
  stale: boolean;
}

async function ownStates(
  entries: ReadonlyMap<number, IndexEntry>,
  rows: readonly TakhrijReview[],
  identity: string,
): Promise<Map<number, OwnState>> {
  const out = new Map<number, OwnState>();
  for (const r of rows) {
    const entry = entries.get(r.passage_id);
    if (r.reviewer_key !== identity || entry === undefined) continue;
    out.set(r.passage_id, {
      decision: r.decision,
      stale: (await takhrijLabelHash(entry.label)) !== r.label_hash,
    });
  }
  return out;
}

const bucket = (s: OwnState | undefined): QueueFilter =>
  s === undefined || s.stale ? "todo" : s.decision === "unsure" ? "unsure" : "done";

export interface QueueSummary {
  passage_id: number;
  /** "j. 1, h. 200" (halaman cetak catatan kaki = halaman penandanya). */
  location: string;
  cites: number;
  mixed: boolean;
  weak: boolean;
  /** Teks label kode. */
  status: string;
  own: TakhrijReviewDecision | null;
  stale_review: boolean;
}

export interface TakhrijQueue {
  rules_version: number;
  filter: QueueFilter;
  offset: number;
  /** Ukuran halaman (`QUEUE_PAGE`). */
  page: number;
  /** Akun penilai ini terdaftar sebagai ustadz peninjau (keputusannya dipakai Jawab). */
  ustadz_account: boolean;
  counts: Record<QueueFilter, number>;
  items: QueueSummary[];
  next: number | null;
}

export async function takhrijQueue(
  deps: QueueDeps,
  filter: QueueFilter,
  offset: number,
): Promise<TakhrijQueue> {
  const [entries, cites, rows] = await Promise.all([
    labelIndex(deps.corpus, deps.editionId ?? 1),
    takhrijCitedCounts(deps.app, deps.now),
    listTakhrijReviews(deps.app, TAKHRIJ_TERMS_VERSION),
  ]);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const own = await ownStates(byId, rows, deps.identity);
  const counts: Record<QueueFilter, number> = { todo: 0, unsure: 0, done: 0 };
  for (const e of entries) counts[bucket(own.get(e.id))]++;
  const ordered = queueOrder(
    entries.filter((e) => bucket(own.get(e.id)) === filter),
    cites,
  );
  const page = ordered.slice(offset, offset + QUEUE_PAGE);
  const pages = new Map(
    (
      await getPassagesByIds(
        deps.corpus,
        page.map((e) => e.id),
      )
    ).map((p) => [p.id, p]),
  );
  return {
    rules_version: TAKHRIJ_TERMS_VERSION,
    filter,
    offset,
    page: QUEUE_PAGE,
    ustadz_account: deps.ustadzKeys.has(deps.identity),
    counts,
    items: page.map((e) => {
      const p = pages.get(e.id);
      const state = own.get(e.id);
      return {
        passage_id: e.id,
        location: p === undefined ? "" : `j. ${p.juz}, h. ${p.page_no}`,
        cites: cites.get(e.id) ?? 0,
        mixed: e.label.mixed,
        weak: e.label.weak,
        status: e.label.text,
        own: state?.decision ?? null,
        stale_review: state?.stale ?? false,
      };
    }),
    next: offset + QUEUE_PAGE < ordered.length ? offset + QUEUE_PAGE : null,
  };
}

export type PublicTakhrijReview = Omit<TakhrijReview, "reviewer_key"> & { stale: boolean };

export interface TakhrijReviewItem {
  passage_id: number;
  rules_version: number;
  corpus_version: string;
  /** `text_raw` catatan kaki persis dari DB (teks Arab hanya dari sini). */
  text: string;
  location: { label: string; permalink: string };
  /** Paragraf badan yang penandanya merujuk catatan kaki ini (lafaz hadits di matan). */
  hadith: { label: string; permalink: string } | null;
  label: TakhrijLabel;
  label_hash: string;
  /** Label yang dipakai Jawab sekarang (sesudah tinjauan semua penilai). */
  current: Pick<ReviewedTakhrijLabel, "review" | "text" | "added">;
  cites: number;
  reviews: PublicTakhrijReview[];
  own: PublicTakhrijReview | null;
}

export async function takhrijReviewItem(
  deps: QueueDeps,
  passageId: number,
): Promise<TakhrijReviewItem | null> {
  const [p] = await answerPassages(deps.corpus, [passageId]);
  if (p === undefined || p.kind !== "foot") return null;
  const label = takhrijLabel(p.text_raw);
  if (label.kind === "not_takhrij") return null;
  const [hash, rows, cites, meta, body] = await Promise.all([
    takhrijLabelHash(label),
    getTakhrijReviews(deps.app, [p.id], TAKHRIJ_TERMS_VERSION),
    takhrijCitedCounts(deps.app, deps.now),
    getCorpusMeta(deps.corpus),
    p.referenced_by[0] === undefined
      ? Promise.resolve([])
      : answerPassages(deps.corpus, [p.referenced_by[0]]),
  ]);
  const current = reviewedTakhrijLabel(
    p.text_raw,
    effectiveTakhrijReview(label, hash, rows, deps.ustadzKeys),
  );
  const shown = rows.map(({ reviewer_key: _key, ...r }) => ({
    ...r,
    stale: r.label_hash !== hash,
  }));
  const ownIndex = rows.findIndex((r) => r.reviewer_key === deps.identity);
  return {
    passage_id: p.id,
    rules_version: label.version,
    corpus_version: meta.corpus_version ?? "",
    text: p.text_raw,
    location: { label: p.location.label, permalink: p.location.permalink },
    hadith:
      body[0] === undefined
        ? null
        : { label: body[0].location.label, permalink: body[0].location.permalink },
    label,
    label_hash: hash,
    current: { review: current.review, text: current.text, added: current.added },
    cites: cites.get(p.id) ?? 0,
    reviews: shown,
    own: ownIndex === -1 ? null : shown[ownIndex]!,
  };
}

/** Simpan keputusan; `stale` = label (atau versi aturan) sudah berbeda dari yang dilihat penilai. */
export async function saveTakhrijDecision(
  deps: QueueDeps,
  input: TakhrijReviewInput,
): Promise<"ok" | "not_found" | "stale"> {
  const [p] = await answerPassages(deps.corpus, [input.passage_id]);
  if (p === undefined || p.kind !== "foot") return "not_found";
  const label = takhrijLabel(p.text_raw);
  if (label.kind === "not_takhrij") return "not_found";
  if (input.rules_version !== label.version || input.label_hash !== (await takhrijLabelHash(label)))
    return "stale";
  const meta = await getCorpusMeta(deps.corpus);
  await saveTakhrijReview(deps.app, {
    ...input,
    reviewer_key: deps.identity,
    corpus_version: meta.corpus_version ?? "unknown",
    updated_at: deps.now,
  });
  return "ok";
}
