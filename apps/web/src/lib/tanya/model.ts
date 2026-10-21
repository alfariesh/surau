// Bentuk data Jawab di sisi web (S21). Sengaja struktural (bukan impor dari apps/api): web hanya
// menerima JSON/SSE dari `/api/jawab`, dan hasilnya divalidasi ringan sebelum dirender.

export type JawabStage = "route" | "retrieve" | "answer" | "retry" | "verify";

export interface JawabCitation {
  n: number;
  passage_id: number;
  char_start: number;
  char_end: number;
  kind: string;
  label: string;
  permalink: string;
}

export interface JawabBlock {
  text: string;
  citations: number[];
}

/** Istilah di teks takhrij: rentang mentah di catatan kaki + arti baku (X06). */
export interface JawabHadithTerm {
  kind: string;
  char_start: number;
  char_end: number;
  gloss: string;
}

export interface JawabHadith {
  passage_id: number;
  footnote: { passage_id: number; char_start: number; char_end: number };
  /** Teks status dari istilah takhrij, dibuat kode (bukan tulisan model). */
  status: string;
  /**
   * `rule_extracted` sejak X06; `ustadz_reviewed`/`ustadz_corrected` = label kode yang disetujui /
   * dikoreksi penilai /tinjau (X07); `ai_extracted` = bentuk lama (API sebelum X06, mis. staging
   * yang melayani Preview dari `main`), tanpa `mixed`/`terms`.
   */
  label: "rule_extracted" | "ustadz_reviewed" | "ustadz_corrected" | "ai_extracted";
  rules_version?: number;
  mixed?: boolean;
  terms?: JawabHadithTerm[];
  /** Koreksi (X07): jenis istilah dari penilai tanpa frasa baku di teks; tidak pernah teks Arab. */
  added_terms?: { kind: string; gloss: string }[];
}

export interface JawabSearchHit {
  passage_id: number;
  char_start: number;
  char_end: number;
  label: string;
  permalink: string;
}

export interface JawabResult {
  outcome: "answer" | "not_found" | "fallback";
  reason: string | null;
  text: string;
  blocks: JawabBlock[];
  citations: JawabCitation[];
  hadith: JawabHadith[];
  search: JawabSearchHit[];
  model: string | null;
  prompt_version: string;
  corpus_version: string;
}

export interface JawabStatus {
  available: boolean;
  reason: "disabled" | "not_configured" | "budget" | "quota" | null;
  challenge: boolean;
  sitekey: string | null;
  quota: { used: number; limit: number } | null;
}

export type SseEvent =
  | { event: "stage"; stage: JawabStage }
  | { event: "block"; block: JawabBlock; citations: JawabCitation[] }
  | { event: "reset" }
  | { event: "done"; result: JawabResult; cached: boolean }
  | { event: "fallback"; result: JawabResult }
  | { event: "error" };

/** Hasil `done`/`fallback` minimal sah (bukan validasi penuh; UI tetap defensif). */
function isResult(v: unknown): v is JawabResult {
  if (v === null || typeof v !== "object") return false;
  const r = v as Partial<JawabResult>;
  return (
    (r.outcome === "answer" || r.outcome === "not_found" || r.outcome === "fallback") &&
    Array.isArray(r.blocks) &&
    Array.isArray(r.citations) &&
    Array.isArray(r.hadith) &&
    Array.isArray(r.search)
  );
}

/** Satu bingkai SSE (`event: …\ndata: …`) → event; komentar/heartbeat dan bingkai rusak → null. */
export function parseSseFrame(frame: string): SseEvent | null {
  let name = "";
  const data: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) name = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (name === "") return null;
  let payload: unknown = null;
  try {
    payload = data.length > 0 ? JSON.parse(data.join("\n")) : null;
  } catch {
    return null;
  }
  const p = (payload ?? {}) as Record<string, unknown>;
  switch (name) {
    case "stage":
      return typeof p.stage === "string" ? { event: "stage", stage: p.stage as JawabStage } : null;
    case "block":
      return p.block !== null && typeof p.block === "object"
        ? {
            event: "block",
            block: p.block as JawabBlock,
            citations: Array.isArray(p.citations) ? (p.citations as JawabCitation[]) : [],
          }
        : null;
    case "reset":
      return { event: "reset" };
    case "done":
      return isResult(p.result)
        ? { event: "done", result: p.result, cached: p.cached === true }
        : null;
    case "fallback":
      return isResult(p.result) ? { event: "fallback", result: p.result } : null;
    case "error":
      return { event: "error" };
    default:
      return null;
  }
}

/** Baca body SSE bertahap; `onEvent` dipanggil per bingkai lengkap. */
export async function readSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (e: SseEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replaceAll("\r\n", "\n");
    let cut = buffer.indexOf("\n\n");
    while (cut >= 0) {
      const e = parseSseFrame(buffer.slice(0, cut));
      buffer = buffer.slice(cut + 2);
      if (e !== null) onEvent(e);
      cut = buffer.indexOf("\n\n");
    }
  }
  const tail = parseSseFrame(buffer.trim());
  if (tail !== null) onEvent(tail);
}

/**
 * Teks blok untuk ditampilkan: penanda Markdown sederhana (tebal/miring, judul) dibuang; teks
 * jawaban ditampilkan sebagai teks biasa (bukan Markdown) supaya blok bersitasi dan tanpa sitasi bisa
 * dibedakan per bagian (ADR-064 butir 5). Teks Arab tidak pernah ada di sini (dibuang pipeline).
 */
export function displayText(text: string): string {
  return text
    .replaceAll(/<\/?cite\b[^<>]*>/giu, "")
    .replaceAll(/\*\*|__/gu, "")
    .replaceAll(/(^|\n)#{1,6}[ \t]+/gu, "$1")
    .replaceAll(/(^|[\s(])[*_](\S[^*_\n]*?\S|\S)[*_](?=[\s).,;:!?]|$)/gu, "$1$2");
}

/** Rentang kutipan → parameter `r` untuk /api/kutipan (maks 20, unik). */
export function kutipanQuery(
  spans: readonly { passage_id: number; char_start: number; char_end: number }[],
): string {
  const keys = [...new Set(spans.map((s) => `${s.passage_id}:${s.char_start}:${s.char_end}`))];
  return keys.slice(0, 20).join(",");
}

export const spanKey = (s: { passage_id: number; char_start: number; char_end: number }) =>
  `${s.passage_id}:${s.char_start}:${s.char_end}`;

/**
 * Frasa Arab satu istilah, disalin dari teks takhrij DB (`text` = potongan catatan kaki mulai
 * `footnoteStart`) lewat rentangnya; null bila di luar potongan itu.
 */
export function termPhrase(
  text: string,
  footnoteStart: number,
  term: { char_start: number; char_end: number },
): string | null {
  const start = term.char_start - footnoteStart;
  const end = term.char_end - footnoteStart;
  if (start < 0 || end > text.length || end <= start) return null;
  return text.slice(start, end);
}
