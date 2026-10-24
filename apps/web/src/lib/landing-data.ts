// Data landing page publik (/, ADR-096), server saja. Semua bagian bersifat sekunder: bila D1 gagal
// atau pembaca tertutup, bagian itu tidak ditampilkan dan halaman tetap tampil.
import type { AnswerPassage } from "@surau/core";
import type { D1Db } from "@surau/db";

import type { WorkCoverData } from "../components/book/work-cover";

import { answerPassages } from "@surau/core";

import { getEnv, readerEnabled } from "./cloudflare";
import { jawabRouteOn } from "./jawab-flag";
import { loadToc, loadWork } from "./reader/data";
import type { TocItem } from "./reader/toc";
import { translationLabel } from "./translation-label";
import { transparencyMonths, type TransparencyMonth } from "./transparency-data";

/** Karya yang dipamerkan landing page (satu-satunya kitab saat ini). */
export const LANDING_WORK = "ihya";

/**
 * Kutipan hero (dan kartu kutipan simulasi Maknaz): kalimat al-Ghazali sendiri (bukan nukilan) di
 * awal "Bayan a'mal al-mutawakkilin", j. 4 h. 265. Teks Arabnya DISALIN KODE dari `text_raw`
 * paragraf ini pada rentang [start, end) (aturan teks-arab no. 1), tidak pernah ditulis di sini.
 */
export const HERO_QUOTE = { passageId: 10017769, start: 0, end: 44 } as const;

/**
 * Dua paragraf contoh hasil Cari "sabar" di simulasi (hasil nyata kueri itu, j. 4 h. 72 dan j. 3 h. 204).
 * Potongan Arabnya disalin kode dari `text_raw` (awal paragraf, dipotong di batas kata).
 */
export const SEARCH_DEMO_IDS = [10016277, 10013591] as const;
/** Kata yang "diketik" di simulasi Cari (Latin; dicari di terjemahan AI). */
export const SEARCH_DEMO_QUERY = "sabar";
// Lebih panjang dari satu baris kartu: kartu memotongnya dengan line-clamp (elipsis dari CSS).
const SNIPPET_MAX = 200;

export interface HeroQuote {
  text: string;
  author: string | null;
  label: string;
  permalink: string;
  /** Kalimat pertama terjemahan AI paragraf itu (padanan rentang kutipan), atau null. */
  translation: { text: string; lang: string; badge: string } | null;
}

/** Satu paragraf contoh: Arab (utuh atau potongan awal di batas kata) + terjemahan AI berlabel. */
export interface DemoPassage {
  arabic: string;
  /** Arab dipotong (tampilkan tanda elipsis di luar teks Arab). */
  cut: boolean;
  label: string;
  permalink: string;
  translation: { text: string; lang: string; badge: string } | null;
}

export interface LandingWork {
  title: string | null;
  /** Sampul kitab di hero (judul Arab dari DB) dan tautan halaman karyanya. */
  cover: WorkCoverData;
  href: string;
  firstPage: string | null;
  /** Angka dari edisi dan pohon daftar isi yang sudah dimuat (tanpa kueri hitung tambahan). */
  stats: { volumes: number | null; books: number; sections: number } | null;
}

export interface LandingData {
  ask: boolean;
  quote: HeroQuote | null;
  work: LandingWork | null;
  /** Paragraf utuh kutipan hero, untuk simulasi pembaca. */
  read: DemoPassage | null;
  results: DemoPassage[];
  cost: TransparencyMonth | null;
}

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

/** Awal teks sampai `max` karakter, dipotong di spasi terakhir (tidak di tengah kata). */
export function wordPrefix(raw: string, max: number): { text: string; cut: boolean } {
  const trimmed = raw.trim();
  if (trimmed.length <= max) return { text: trimmed, cut: false };
  const space = trimmed.lastIndexOf(" ", max);
  return { text: trimmed.slice(0, space > 0 ? space : max).trimEnd(), cut: true };
}

/** Kalimat pertama terjemahan; null bila memuat placeholder ayat (ayat tidak diterjemahkan AI). */
export function firstSentence(text: string): string | null {
  const sentence = text.split(/(?<=[.!?])\s/u)[0]?.trim() ?? "";
  return sentence === "" || sentence.includes("⟦") ? null : sentence;
}

/** Kalimat terjemahan yang memuat `word` (huruf kecil), atau kalimat pertama; tanpa placeholder ayat. */
export function sentenceWith(text: string, word: string): string | null {
  const sentences = text.split(/(?<=[.!?])\s/u).map((x) => x.trim());
  const hit = sentences.find((x) => x.toLowerCase().includes(word) && !x.includes("⟦"));
  return hit ?? firstSentence(text);
}

function translationOf(p: AnswerPassage, text: string | null) {
  return p.translation && text
    ? {
        text,
        lang: p.translation.lang,
        badge: translationLabel(p.translation.human_review).badge,
      }
    : null;
}

interface Demos {
  quote: HeroQuote | null;
  read: DemoPassage | null;
  results: DemoPassage[];
}

// Satu kueri untuk semua paragraf contoh (kutipan hero + hasil Cari), urutan sesuai ID.
async function demos(db: D1Db, author: string | null): Promise<Demos> {
  const rows = await answerPassages(db, [HERO_QUOTE.passageId, ...SEARCH_DEMO_IDS]);
  const hero = rows.find((p) => p.id === HERO_QUOTE.passageId);
  const span = hero ? quoteSpan(hero.text_raw, HERO_QUOTE.start, HERO_QUOTE.end) : null;
  const quote =
    hero && span
      ? {
          text: span,
          author,
          label: hero.location.label,
          permalink: hero.location.permalink,
          translation: translationOf(
            hero,
            hero.translation ? firstSentence(hero.translation.text) : null,
          ),
        }
      : null;
  // Pembaca: paragraf utuh (Arab + terjemahan seluruh paragraf), jadi keduanya selalu sepadan.
  const read =
    hero && !hero.translation?.text.includes("⟦")
      ? {
          arabic: hero.text_raw.trim(),
          cut: false,
          label: hero.location.label,
          permalink: hero.location.permalink,
          translation: translationOf(hero, hero.translation?.text ?? null),
        }
      : null;
  const results = SEARCH_DEMO_IDS.flatMap((pid) => {
    const p = rows.find((r) => r.id === pid);
    if (!p) return [];
    const { text, cut } = wordPrefix(p.text_raw, SNIPPET_MAX);
    return [
      {
        arabic: text,
        cut,
        label: p.location.label,
        permalink: p.location.permalink,
        translation: translationOf(
          p,
          p.translation ? sentenceWith(p.translation.text, SEARCH_DEMO_QUERY) : null,
        ),
      },
    ];
  });
  return { quote, read, results };
}

const countNodes = (items: readonly TocItem[]): number =>
  items.reduce((n, item) => n + 1 + countNodes(item.children), 0);

function settle<T>(what: string, p: Promise<T>): Promise<T | null> {
  return p.catch((error: unknown) => {
    console.error(`landing: ${what} gagal dimuat`, error);
    return null;
  });
}

const EMPTY: LandingData = {
  ask: false,
  quote: null,
  work: null,
  read: null,
  results: [],
  cost: null,
};

export async function loadLandingData(): Promise<LandingData> {
  // Binding Cloudflare gagal = landing tanpa bagian data (bukan halaman galat), seperti Beranda.
  const env = await settle("lingkungan", getEnv());
  if (env === null) return EMPTY;
  const ask = jawabRouteOn(env);
  const costs = settle("biaya", transparencyMonths(env.APP_DB, new Date(), 1));
  // loadWork melempar notFound() bila karya tidak ada; settle menelannya (bagian disembunyikan).
  const ctx = readerEnabled(env) ? await settle("karya", loadWork(LANDING_WORK)) : null;
  const [demo, toc, months] = await Promise.all([
    ctx ? settle("contoh", demos(env.CORPUS_DB, ctx.work.author?.name_id ?? null)) : null,
    ctx ? settle("daftar isi", loadToc(LANDING_WORK)) : null,
    costs,
  ]);
  const work = ctx
    ? {
        title: ctx.work.title_id,
        cover: {
          slug: ctx.work.slug,
          title_ar: ctx.work.title_ar,
          title_id: ctx.work.title_id,
          author: ctx.work.author,
        },
        href: ctx.edition.permalink,
        firstPage: toc?.[0]?.href ?? null,
        stats: toc
          ? {
              volumes: ctx.edition.volumes,
              // Kitab = anak level 2 dari rub' (akar yang berisi anak; pendahuluan tanpa anak tidak dihitung).
              books: toc.reduce((n, root) => n + root.children.length, 0),
              sections: countNodes(toc),
            }
          : null,
      }
    : null;
  return {
    ask,
    quote: demo?.quote ?? null,
    work,
    read: demo?.read ?? null,
    results: demo?.results ?? [],
    cost: months?.[0] ?? null,
  };
}
