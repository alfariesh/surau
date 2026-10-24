import {
  answerPassages,
  ayahPlaceholderPattern,
  ipKey,
  ipNetwork,
  reviewedTakhrijLabel,
  takhrijReviewsFor,
} from "@surau/core";
import type { AnswerPassage, EffectiveTakhrijReview, HumanReview } from "@surau/core";
import type { D1Db, TakhrijReview } from "@surau/db";

// GET /api/kutipan (S21): teks kutipan untuk kartu sitasi /tanya. Hasil Jawab hanya memuat
// `{passage_id, char_start, char_end}` (ADR-064); teks Arab di kartu DISALIN KODE dari `text_raw` DB
// di sini (aturan teks-arab no. 1), tidak pernah dari keluaran model. Terjemahan AI paragraf ikut
// berlabel; placeholder ayat `⟦QS s:a⟧` ditampilkan sebagai rujukan saja (ayat tidak diterjemahkan
// model, no. 9; terjemahan Kemenag ada di pembaca). Tanpa data pengguna: kueri hanya ID + offset.
// Catatan kaki takhrij diberi `weak` bila teks lengkapnya (DB) memuat istilah kelemahan/tanpa asal
// (`takhrijLabel(...).weak`, docs/05 §4; sejak X06 dari istilah yang sama dengan label status,
// bagian lafaz hadits tidak dipindai): tanda peringatan dari teks sumber, bukan dari ringkasan AI.
// Sejak X07 tanda itu mengikuti label yang ditinjau penilai (DB app), supaya tanda dan status hadits
// di /tanya tidak bertentangan; tinjauan gagal dimuat = label kode.

export const KUTIPAN_MAX_RANGES = 20;
const SPAN_MAX = 2000;

export interface KutipanRange {
  passage_id: number;
  char_start: number;
  char_end: number;
}

export interface KutipanItem extends KutipanRange {
  kind: AnswerPassage["kind"];
  /** Potongan `text_raw` persis dari DB. */
  text: string;
  label: string;
  permalink: string;
  /** Terjemahan AI seluruh paragraf (bukan hanya potongan), atau null. */
  translation: {
    label: "ai_translation";
    review_status: string;
    /** Tinjauan manusia (X08): label "diperiksa/dikoreksi …" lewat `translationLabel`. */
    human_review: HumanReview | null;
    text: string;
  } | null;
  /** Takhrij (catatan kaki) yang teks lengkapnya memuat istilah kelemahan; selalu false untuk matan. */
  weak: boolean;
}

export interface KutipanDeps {
  /** Pembaca terbuka (`READER_ENABLED`); mati → 404 seperti /api/search. */
  enabled: boolean;
  db: D1Db;
  hmacKey: string | undefined;
  ip: string | null;
  limit: (key: string) => Promise<boolean>;
  /** Batas global bersama Cari (`SEARCH_GLOBAL_LIMITER`). */
  limitGlobal: () => Promise<boolean>;
  /** Tinjauan label takhrij (X07) dari DB app; tanpa ini tanda `weak` dari label kode saja. */
  reviews?: {
    load: (footnoteIds: number[]) => Promise<TakhrijReview[]>;
    ustadzKeys: ReadonlySet<string>;
  };
}

const json = (status: number, body: unknown, cache = "no-store") =>
  Response.json(body, { status, headers: { "Cache-Control": cache } });

/** `r=1000123:0:120,1000456:10:300` → rentang; `null` bila bentuknya tidak sah. */
export function parseRanges(value: string | null): KutipanRange[] | null {
  if (value === null || value === "" || value.length > 600) return null;
  const parts = value.split(",");
  if (parts.length > KUTIPAN_MAX_RANGES) return null;
  const out: KutipanRange[] = [];
  for (const part of parts) {
    const m = /^([1-9][0-9]{0,9}):(0|[1-9][0-9]{0,6}):([1-9][0-9]{0,6})$/u.exec(part);
    if (m === null) return null;
    const [passage_id, char_start, char_end] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (char_end <= char_start || char_end - char_start > SPAN_MAX) return null;
    out.push({ passage_id, char_start, char_end });
  }
  return out;
}

const lowSurrogate = (n: number) => n >= 0xdc00 && n <= 0xdfff;

/** Potongan teks mentah yang aman (tidak memotong pasangan surrogate), atau null. */
export function sliceRaw(raw: string, start: number, end: number): string | null {
  if (end > raw.length || lowSurrogate(raw.charCodeAt(start)) || lowSurrogate(raw.charCodeAt(end)))
    return null;
  const text = raw.slice(start, end);
  return text.trim() === "" ? null : text;
}

/** `⟦QS 2:153⟧` → `(QS 2:153)`: rujukan ayat tanpa terjemahan model. */
export function ayahRefsOnly(text: string): string {
  return text.replaceAll(ayahPlaceholderPattern(), (m) => `(${m.slice(1, -1)})`);
}

export async function handleKutipan(request: Request, deps: KutipanDeps): Promise<Response> {
  if (!deps.enabled) return json(404, { error: "not_found" });
  const ranges = parseRanges(new URL(request.url).searchParams.get("r"));
  if (ranges === null) return json(400, { error: "invalid" });
  if (deps.hmacKey === undefined || deps.hmacKey === "") return json(503, { error: "unavailable" });
  if (!(await deps.limit(await ipKey(deps.hmacKey, ipNetwork(deps.ip ?? "unknown")))))
    return json(429, { error: "rate_limited" });
  // Per klien dulu: permintaan yang ditolak per klien tidak memakan kuota global (sama dengan Cari).
  if (!(await deps.limitGlobal())) return json(429, { error: "rate_limited" });
  const passages = new Map(
    (await answerPassages(deps.db, [...new Set(ranges.map((r) => r.passage_id))])).map((p) => [
      p.id,
      p,
    ]),
  );
  const feet = [...passages.values()].filter((p) => p.kind === "foot");
  const source = deps.reviews;
  const reviews =
    source === undefined || source.ustadzKeys.size === 0 || feet.length === 0
      ? new Map<number, EffectiveTakhrijReview>()
      : await source
          .load(feet.map((p) => p.id))
          .then((rows) => takhrijReviewsFor(feet, rows, source.ustadzKeys))
          .catch((error: unknown) => {
            console.warn(
              JSON.stringify({
                event: "kutipan_reviews_error",
                name: error instanceof Error ? error.name : "unknown",
              }),
            );
            return new Map<number, EffectiveTakhrijReview>();
          });
  const items: (KutipanItem | null)[] = ranges.map((r) => {
    const p = passages.get(r.passage_id);
    const text = p === undefined ? null : sliceRaw(p.text_raw, r.char_start, r.char_end);
    if (p === undefined || text === null) return null;
    return {
      ...r,
      kind: p.kind,
      text,
      label: p.location.label,
      permalink: p.location.permalink,
      // Terjemahan yang ditolak peninjau tidak ditampilkan (sama dengan kartu Cari).
      translation:
        p.translation === null || p.translation.review_status === "rejected"
          ? null
          : {
              label: "ai_translation",
              review_status: p.translation.review_status,
              human_review: p.translation.human_review,
              text: ayahRefsOnly(p.translation.text),
            },
      weak: p.kind === "foot" && reviewedTakhrijLabel(p.text_raw, reviews.get(p.id) ?? null).weak,
    };
  });
  // Isi = fungsi ID + offset atas korpus yang ID-nya stabil (ADR-059): aman di-cache singkat. Tanda
  // `weak` ikut tinjauan label (X07), jadi perubahan tinjauan tampil paling lambat 5 menit kemudian.
  return json(200, { items }, "public, max-age=300");
}
