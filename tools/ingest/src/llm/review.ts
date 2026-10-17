// Halaman HTML lokal untuk menilai sampel terjemahan dan ringkasan (T-17). Teks Arab disalin persis
// dari baris korpus (`text_raw`), placeholder ayat dirender dengan terjemahan Kemenag verbatim dari
// `quran_translation`. File ini berisi teks kitab, jadi hanya ditulis ke data/build/llm (git-ignored).
import { ayahPlaceholderPattern } from "@surau/core";
import { QURAN_SOURCE } from "@surau/db";
import type { QuranTranslationRow } from "@surau/db";

export interface ReviewPassage {
  kind: "passage";
  no: number;
  passageId: number;
  permalink: string;
  heading: string;
  arabic: string;
  translation: string;
  model: string;
  problems: readonly string[];
  note: string;
}

export interface ReviewSummary {
  kind: "summary";
  no: number;
  tocNodeId: number;
  permalink: string;
  heading: string;
  /** Jumlah karakter teks Arab yang diringkas. */
  chars: number;
  id: string;
  en: string;
  problems: readonly string[];
}

export type ReviewItem = ReviewPassage | ReviewSummary;

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function kemenagLookup(
  rows: readonly QuranTranslationRow[],
): (s: number, a: number) => string | null {
  const map = new Map(
    rows
      .filter((r) => r.source_id === QURAN_SOURCE.translation)
      .map((r) => [`${r.surah}:${r.ayah}`, r.text]),
  );
  return (s, a) => map.get(`${s}:${a}`) ?? null;
}

/** Terjemahan bertanda → HTML, placeholder diganti terjemahan Kemenag berlabel. */
export function renderTranslation(
  text: string,
  kemenag: (s: number, a: number) => string | null,
): string {
  let out = "";
  let at = 0;
  for (const m of text.matchAll(ayahPlaceholderPattern())) {
    const start = m.index ?? 0;
    out += esc(text.slice(at, start));
    const surah = Number(m[1]);
    const from = Number(m[2]);
    const to = m[3] === undefined ? from : Number(m[3]);
    const ayat: string[] = [];
    for (let a = from; a <= to; a++) ayat.push(kemenag(surah, a) ?? "(terjemahan tidak ada)");
    out += `<span class="ayah"><b>QS ${surah}:${from === to ? from : `${from}-${to}`}</b> · Kemenag: ${esc(ayat.join(" "))}</span>`;
    at = start + m[0].length;
  }
  return out + esc(text.slice(at));
}

export function reviewHtml(
  title: string,
  intro: string,
  items: readonly ReviewItem[],
  kemenag: (s: number, a: number) => string | null,
  base: string,
): string {
  const body = items
    .map((it) => {
      if (it.kind === "passage") {
        return `<section><h2>${it.no}. Paragraf <a href="${esc(base + it.permalink)}">${it.passageId}</a></h2>
<p class="head" dir="rtl" lang="ar">${esc(it.heading)}</p>
<p class="ar" dir="rtl" lang="ar">${esc(it.arabic)}</p>
<p class="id">${renderTranslation(it.translation, kemenag)}</p>
<p class="meta">${esc(it.model)}${it.note === "" ? "" : ` · ${esc(it.note)}`}${it.problems.length === 0 ? "" : ` · <b class="bad">ditolak validasi: ${esc(it.problems.join(", "))}</b>`}</p>
<p class="rate">Nilai: Benar / Kurang / Salah · catatan:</p></section>`;
      }
      return `<section><h2>${it.no}. Ringkasan bagian <a href="${esc(base + it.permalink)}">${it.tocNodeId}</a></h2>
<p class="head" dir="rtl" lang="ar">${esc(it.heading)}</p>
<p class="meta">${it.chars.toLocaleString("id-ID")} karakter teks Arab diringkas${it.problems.length === 0 ? "" : ` · <b class="bad">ditolak validasi: ${esc(it.problems.join(", "))}</b>`}</p>
<p class="id"><b>ID:</b> ${esc(it.id)}</p>
<p class="id"><b>EN:</b> ${esc(it.en)}</p>
<p class="rate">Nilai: Benar / Kurang / Salah · catatan:</p></section>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic&display=swap">
<style>
:root{--bg:#fbfaf6;--fg:#1f2a1c;--muted:#5d6b57;--line:#dcd8cc;--ayah:#e8f1e1;--bad:#a3261b}
@media (prefers-color-scheme:dark){:root{--bg:#161a14;--fg:#e9eee4;--muted:#9fae97;--line:#333a2f;--ayah:#24331f;--bad:#ff8a7a}}
body{background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,sans-serif;margin:0 auto;max-width:860px;padding:16px}
section{border-top:1px solid var(--line);padding:12px 0}
h1{font-size:1.4rem}h2{font-size:1.05rem;margin:0 0 6px}
a{color:inherit}
.ar,.head{font-family:"Noto Naskh Arabic","Amiri",serif;line-height:2.1}
.ar{font-size:1.3rem}.head{color:var(--muted);font-size:1rem;margin:0}
.ayah{background:var(--ayah);border-radius:4px;padding:1px 4px}
.meta,.rate{color:var(--muted);font-size:.85rem}.bad{color:var(--bad)}
</style></head><body>
<h1>${esc(title)}</h1>
<p>${intro}</p>
${body}
</body></html>
`;
}
