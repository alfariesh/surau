import type { CitationSource } from "@surau/core";

import { CITE_AUTHOR, CITE_PUBLISHER } from "../../content/works";

// Sitasi untuk tombol "Salin sitasi": "al-Ghazali, Ihya' 'Ulum ad-Din, Dar al-Ma'rifah, j.1 h.200"
// + permalink. Semua bagiannya dari Citation core (DB) atau tabel nama tampilan; tidak ada teks
// kitab di dalamnya. Teks biasa tanpa tanda Markdown; versi HTML memiringkan judul.

export interface CiteParts {
  author: string | null;
  title: string;
  publisher: string | null;
  juz: number;
  pageNo: number;
}

export function citeParts(source: CitationSource, juz: number, pageNo: number): CiteParts {
  const { work, edition } = source;
  return {
    author: CITE_AUTHOR[work.slug] ?? work.author?.name_id ?? work.author?.name_ar ?? null,
    title: work.title_id ?? work.title_ar,
    publisher: CITE_PUBLISHER[`${work.slug}/${edition.slug}`] ?? edition.publisher,
    juz,
    pageNo,
  };
}

function head(p: CiteParts, title: string): string {
  return [p.author, title, p.publisher, `j.${p.juz} h.${p.pageNo}`]
    .filter((x): x is string => x !== null && x !== "")
    .join(", ");
}

/** Teks biasa: `<sitasi>. <url>`. */
export function citeText(p: CiteParts, url: string): string {
  return `${head(p, p.title)}. ${url}`;
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(s: string): string {
  return s.replaceAll(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** HTML untuk penyunting kaya (dokumen, email): judul miring, tautan bisa diklik. */
export function citeHtml(p: CiteParts, url: string): string {
  const safe: CiteParts = {
    ...p,
    author: p.author === null ? null : escapeHtml(p.author),
    publisher: p.publisher === null ? null : escapeHtml(p.publisher),
    title: escapeHtml(p.title),
  };
  const href = escapeHtml(url);
  return `${head(safe, `<i>${safe.title}</i>`)}. <a href="${href}">${href}</a>`;
}

/**
 * Sitasi untuk permalink tertentu (X04, gulir bersambung): juz dan halaman cetak diambil dari path
 * `/kitab/<karya>/<juz>/<halaman>[#pN]`, sehingga paragraf halaman sambungan tidak memakai alamat
 * halaman pertama. Path lain (mis. halaman bab) memakai `base` apa adanya.
 */
export function citeForPath(base: CiteParts, permalink: string): CiteParts {
  const path = permalink.split(/[?#]/)[0] ?? "";
  const m = /^\/kitab\/[^/]+\/(\d+)\/(\d+)$/.exec(path);
  return m === null ? base : { ...base, juz: Number(m[1]), pageNo: Number(m[2]) };
}
