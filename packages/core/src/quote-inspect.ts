// Jenis kutipan Intisari dan larangannya, ditentukan kode dari baris korpus (ADR-097, ADR-098
// poin 11). Dipindah dari tools/ingest (X23) supaya validator batch, build, dan pemeriksa draf
// konten di MCP `/redaksi` memakai satu aturan: kutipan yang lolos cek di chat tidak boleh hilang
// diam-diam saat build.
import type { DigestQuoteKind, FootnoteRefRow, PageRow, PassageRow } from "@surau/db";
import { normalizeArabic } from "@surau/text";

import { QUOTE_BANNED_TAKHRIJ_KINDS, takhrijLabel } from "./takhrij-label.ts";
import { verseBounds } from "./verse.ts";

export interface QuoteRange {
  passageId: number;
  start: number;
  end: number;
}

export interface QuoteInspection {
  /** Ditentukan kode, bukan model (ADR-097). */
  kind: DigestQuoteKind;
  /** Alasan kutipan tidak boleh dipilih (mis. takhrij "palsu"), atau null. */
  banned: string | null;
}

/** Baris korpus yang dibutuhkan pemeriksa kutipan. */
export interface QuoteCorpus {
  passage: readonly PassageRow[];
  footnote_ref: readonly FootnoteRefRow[];
  page: readonly Pick<PageRow, "id" | "juz" | "page_no">[];
}

function groupBy<T>(rows: readonly T[], key: (r: T) => number): Map<number, T[]> {
  const out = new Map<number, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = out.get(k);
    if (list === undefined) out.set(k, [r]);
    else list.push(r);
  }
  return out;
}

/** Jarak terjauh (karakter) penanda sesudah kutipan, di paragraf yang sama, yang masih berlabel riwayat. */
export const REPORT_LOOKAHEAD_CHARS = 600;
/**
 * Jarak terjauh (karakter, urutan baca, lintas paragraf di bagian yang sama) penanda takhrij PERTAMA
 * sesudah kutipan yang larangannya ikut berlaku. Riwayat di Ihya jarang lebih dari ±1.000 karakter.
 */
export const BAN_LOOKAHEAD_CHARS = 1_500;

const NEW_NARRATION =
  /(?:^| )(?:قال|وقال|فقال|يقول|روي|وروي|صلي الله عليه وسلم|عليه السلام)(?: |$)/u;

/**
 * Jenis kutipan dan larangannya, ditentukan kode dari baris korpus (ADR-097, ADR-098 poin 11):
 * - Larangan: penanda takhrij di dalam kutipan, dan penanda PERTAMA sesudahnya menurut urutan baca
 *   (sisa paragraf, lalu paragraf berikutnya di bagian yang sama, ≤ `BAN_LOOKAHEAD_CHARS`), tanpa
 *   syarat tanda baca: kutipan bisa potongan awal riwayat panjang yang penandanya jauh, di halaman
 *   berikutnya, atau sesudah titik (peninjau X15b). Riwayat bertakhrij sangat lemah, palsu, tanpa
 *   asal, atau tidak ditemukan tidak pernah menjadi kutipan; perkataan penulis yang kebetulan
 *   mendahului riwayat seperti itu ikut terbuang (lebih baik daripada menampilkan riwayat palsu).
 * - Label `report`: penanda di dalam atau tepat sesudah kutipan, atau penanda pertama di paragraf
 *   yang sama ≤ 600 karakter tanpa akhir kalimat dan tanpa rumus riwayat baru di antaranya.
 * - Selain itu `poetry` bila paragrafnya bait syair (`verseBounds`), atau `text`.
 */
export function quoteInspector(rows: QuoteCorpus): (range: QuoteRange) => QuoteInspection {
  const passages = new Map(rows.passage.map((p) => [p.id, p]));
  const footBy = groupBy(rows.footnote_ref, (r) => r.passage_id);
  for (const list of footBy.values()) list.sort((a, b) => a.char_start - b.char_start);
  // Paragraf badan per bagian dalam urutan baca (juz, halaman cetak, ord), untuk lanjut ke paragraf
  // berikutnya bila penanda belum ditemukan.
  const pages = new Map(rows.page.map((pg) => [pg.id, pg]));
  const key = (p: PassageRow): [number, number, number] => {
    const pg = pages.get(p.page_id);
    return [pg?.juz ?? 0, pg?.page_no ?? 0, p.ord];
  };
  const bySection = groupBy(
    rows.passage.filter((p) => p.kind === "body" && p.toc_node_id !== null),
    (p) => p.toc_node_id ?? 0,
  );
  for (const list of bySection.values()) {
    list.sort((a, b) => {
      const [x, y] = [key(a), key(b)];
      return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
    });
  }
  const banned = (m: FootnoteRefRow): string | null => {
    const note = passages.get(m.footnote_passage_id);
    if (note === undefined) return "takhrij tidak ditemukan";
    const bad = takhrijLabel(note.text_raw).terms.find((t) =>
      QUOTE_BANNED_TAKHRIJ_KINDS.has(t.kind),
    );
    return bad === undefined ? null : `takhrij ${bad.kind}`;
  };
  /** Penanda pertama sesudah `end` menurut urutan baca, dengan jarak dan celah teksnya. */
  const firstAfter = (p: PassageRow, end: number) => {
    const here = (footBy.get(p.id) ?? []).find((m) => m.char_start >= end);
    if (here !== undefined) {
      return {
        m: here,
        distance: here.char_start - end,
        gap: p.text_raw.slice(end, here.char_start),
        same: true,
      };
    }
    const list = bySection.get(p.toc_node_id ?? 0) ?? [];
    let distance = p.text_raw.length - end;
    for (const q of list.slice(list.findIndex((x) => x.id === p.id) + 1)) {
      if (distance > BAN_LOOKAHEAD_CHARS) return null;
      const m = (footBy.get(q.id) ?? [])[0];
      if (m !== undefined) return { m, distance: distance + m.char_start, gap: "", same: false };
      distance += q.text_raw.length;
    }
    return null;
  };
  return (range) => {
    const p = passages.get(range.passageId);
    if (p === undefined) throw new Error(`paragraf ${range.passageId} tidak ada`);
    const notes = footBy.get(p.id) ?? [];
    // Penanda di dalam rentang atau tepat sesudahnya (hanya spasi/tanda baca): riwayat itu sendiri.
    const own = notes.filter(
      (m) =>
        (m.char_start >= range.start && m.char_start < range.end) ||
        (m.char_start >= range.end &&
          /^[\s\p{P}]*$/u.test(p.text_raw.slice(range.end, m.char_start))),
    );
    const next = firstAfter(p, range.end);
    const reach = next !== null && next.distance <= BAN_LOOKAHEAD_CHARS ? [next.m] : [];
    for (const m of [...own, ...reach]) {
      const why = banned(m);
      if (why !== null) return { kind: "report", banned: why };
    }
    const sameNarration =
      next !== null &&
      next.same &&
      next.distance <= REPORT_LOOKAHEAD_CHARS &&
      !/[.!?؟]/u.test(next.gap) &&
      !NEW_NARRATION.test(normalizeArabic(next.gap).text);
    if (own.length > 0 || sameNarration) return { kind: "report", banned: null };
    return { kind: verseBounds(p.text_raw) === null ? "text" : "poetry", banned: null };
  };
}
