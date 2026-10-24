// Data landing page publik (/, ADR-096), server saja. Semua bagian bersifat sekunder: bila D1 gagal
// atau pembaca tertutup, bagian itu tidak ditampilkan dan halaman tetap tampil.
import type { D1Db } from "@surau/db";

import { answerPassages } from "@surau/core";

import { getEnv, readerEnabled } from "./cloudflare";
import { jawabRouteOn } from "./jawab-flag";
import { loadReaderToc, loadToc, loadWork } from "./reader/data";
import type { TocItem } from "./reader/toc";
import { translationLabel } from "./translation-label";
import { transparencyMonths, type TransparencyMonth } from "./transparency-data";

/** Karya yang dipamerkan landing page (satu-satunya kitab saat ini). */
export const LANDING_WORK = "ihya";

/**
 * Kutipan hero: kalimat al-Ghazali sendiri (bukan nukilan) di awal "Bayan a'mal al-mutawakkilin",
 * j. 4 h. 265. Teks Arabnya DISALIN KODE dari `text_raw` paragraf ini pada rentang [start, end)
 * (aturan teks-arab no. 1), tidak pernah ditulis di sini. Rentang diperiksa di `heroQuote`.
 */
export const HERO_QUOTE = { passageId: 10017769, start: 0, end: 44 } as const;

export interface HeroQuote {
  text: string;
  author: string | null;
  label: string;
  permalink: string;
  /** Kalimat pertama terjemahan AI paragraf itu (padanan rentang kutipan), atau null. */
  translation: { text: string; lang: string; badge: string } | null;
}

export interface LandingToc {
  /** Judul Latin karya (mis. "Ihya' 'Ulum ad-Din"), dari DB; null bila tidak ada. */
  title: string | null;
  /** Rub' (level 1) dengan kitab di dalamnya (level 2), judul Arab dari DB + judul Indonesia AI. */
  quarters: TocItem[];
  /** Jumlah node daftar isi korpus (semua tingkat): "bagian di daftar isi". */
  sections: number;
  firstPage: string | null;
  volumes: number | null;
}

export interface LandingData {
  ask: boolean;
  quote: HeroQuote | null;
  toc: LandingToc | null;
  cost: TransparencyMonth | null;
}

const countNodes = (items: readonly TocItem[]): number =>
  items.reduce((n, item) => n + 1 + countNodes(item.children), 0);

// Rentang harus berada di batas kata (awal teks/spasi di kedua sisi), supaya kutipan tidak terpotong
// di tengah kata bila korpus berubah; selain itu kartu tidak ditampilkan.
export function quoteSpan(raw: string, start: number, end: number): string | null {
  if (start < 0 || end <= start) return null;
  if (end > raw.length) return null;
  const before = start === 0 || /\s/u.test(raw[start - 1]!);
  const after = end === raw.length || /\s/u.test(raw[end]!);
  const text = raw.slice(start, end);
  return before && after && text.trim() === text && text.length > 0 ? text : null;
}

/** Kalimat pertama terjemahan; null bila memuat placeholder ayat (ayat tidak diterjemahkan AI). */
export function firstSentence(text: string): string | null {
  const sentence = text.split(/(?<=[.!?])\s/u)[0]?.trim() ?? "";
  return sentence === "" || sentence.includes("⟦") ? null : sentence;
}

async function heroQuote(db: D1Db, author: string | null): Promise<HeroQuote | null> {
  const [p] = await answerPassages(db, [HERO_QUOTE.passageId]);
  if (p === undefined) return null;
  const text = quoteSpan(p.text_raw, HERO_QUOTE.start, HERO_QUOTE.end);
  if (text === null) return null;
  const sentence = p.translation ? firstSentence(p.translation.text) : null;
  return {
    text,
    author,
    label: p.location.label,
    permalink: p.location.permalink,
    translation:
      p.translation && sentence
        ? {
            text: sentence,
            lang: p.translation.lang,
            badge: translationLabel(p.translation.human_review).badge,
          }
        : null,
  };
}

async function landingToc(title: string | null, volumes: number | null): Promise<LandingToc> {
  const [{ items }, full] = await Promise.all([loadReaderToc(LANDING_WORK), loadToc(LANDING_WORK)]);
  const quarters = items
    .filter((q) => q.kind === "node")
    .map((q) => ({ ...q, children: q.children.filter((c) => c.kind === "node") }))
    // Rub' = akar yang berisi kitab; akar tanpa anak (mis. pendahuluan penulis) tidak dihitung.
    .filter((q) => q.children.length > 0);
  return {
    title,
    quarters,
    sections: countNodes(full),
    firstPage: full[0]?.href ?? null,
    volumes,
  };
}

function settle<T>(what: string, p: Promise<T>): Promise<T | null> {
  return p.catch((error: unknown) => {
    console.error(`landing: ${what} gagal dimuat`, error);
    return null;
  });
}

const EMPTY: LandingData = { ask: false, quote: null, toc: null, cost: null };

export async function loadLandingData(): Promise<LandingData> {
  // Binding Cloudflare gagal = landing tanpa bagian data (bukan halaman galat), seperti Beranda.
  const env = await settle("lingkungan", getEnv());
  if (env === null) return EMPTY;
  const ask = jawabRouteOn(env);
  const costs = settle("biaya", transparencyMonths(env.APP_DB, new Date(), 1));
  // loadWork melempar notFound() bila karya tidak ada; settle menelannya (bagian disembunyikan).
  const ctx = readerEnabled(env) ? await settle("karya", loadWork(LANDING_WORK)) : null;
  const [quote, toc, months] = await Promise.all([
    ctx ? settle("kutipan", heroQuote(env.CORPUS_DB, ctx.work.author?.name_id ?? null)) : null,
    ctx ? settle("daftar isi", landingToc(ctx.work.title_id, ctx.edition.volumes)) : null,
    costs,
  ]);
  return { ask, quote, toc, cost: months?.[0] ?? null };
}
