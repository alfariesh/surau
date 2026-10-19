import { getPassageById } from "@surau/db";
import type { D1Db } from "@surau/db";
import { buildCitation } from "./citation.ts";
import { sourceSpan } from "./eval-schema.ts";
import type { SourceSpan } from "./eval-schema.ts";
import type { Citation } from "./schema.ts";
import { verifyQuote } from "./verify-quote.ts";

export interface EvalSource {
  pointer: SourceSpan;
  text: string;
  citation: Citation;
  page_id: number;
  toc_node_id: number | null;
}
/** Offset UTF-16 dari teks mentah; tidak menerima teks kutipan dari pemanggil/model. */
export async function resolveEvalSource(db: D1Db, value: SourceSpan): Promise<EvalSource | null> {
  const parsed = sourceSpan.safeParse(value);
  if (!parsed.success) return null;
  const p = parsed.data;
  const row = await getPassageById(db, p.passage_id);
  if (row === null || p.char_end > row.text_raw.length) return null;
  // Jangan memotong surrogate pair di tengah karakter.
  const lowSurrogate = (n: number) => n >= 0xdc00 && n <= 0xdfff;
  if (
    lowSurrogate(row.text_raw.charCodeAt(p.char_start)) ||
    lowSurrogate(row.text_raw.charCodeAt(p.char_end))
  )
    return null;
  const text = row.text_raw.slice(p.char_start, p.char_end);
  if (text.trim() === "") return null;
  const check = await verifyQuote(db, p.passage_id, text);
  if (!check.verified) return null;
  return {
    pointer: p,
    text,
    citation: await buildCitation(db, p.passage_id),
    page_id: row.page_id,
    toc_node_id: row.toc_node_id,
  };
}

export async function evalHash(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
