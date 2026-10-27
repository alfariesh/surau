// Kitab kandidat "Segera hadir" di /kitab (ADR-115): rencana, belum pasti. Judul Arab, nama
// pengarang Arab, dan tahun wafat disalin kode dari master Shamela (scripts/kitab-mendatang.mjs
// → kitab-mendatang.data.json), tidak diketik model. Nama Latin dan keterangan di sini ditulis
// tangan; urutan `authors` sama dengan urutan pengarang di JSON (dijaga kitab-mendatang.test.ts).
import data from "./kitab-mendatang.data.json";

export type KitabField = "tasawuf" | "quran" | "fikih" | "ushul" | "bahasa" | "istilah";

interface UpcomingMeta {
  slug: string;
  shamela_id: number;
  title_id: string;
  authors: readonly string[];
  field: KitabField;
  blurb: string;
}

const META: readonly UpcomingMeta[] = [
  {
    slug: "bidayat-al-hidayah",
    shamela_id: 12718,
    title_id: "Bidayat al-Hidayah",
    authors: ["al-Ghazali"],
    field: "tasawuf",
    blurb: "Panduan adab dan ibadah harian, pintu masuk sebelum Ihya.",
  },
  {
    slug: "al-munqidz-min-adh-dhalal",
    shamela_id: 9246,
    title_id: "Al-Munqidz min adh-Dhalal",
    authors: ["al-Ghazali"],
    field: "tasawuf",
    blurb: "Kisah perjalanan al-Ghazali mencari keyakinan.",
  },
  {
    slug: "nuzhat-al-majalis",
    shamela_id: 28168,
    title_id: "Nuzhat al-Majalis",
    authors: ["ash-Shafuri"],
    field: "tasawuf",
    blurb: "Kumpulan nasihat dan kisah untuk majelis.",
  },
  {
    slug: "tafsir-al-jalalayn",
    shamela_id: 12876,
    title_id: "Tafsir al-Jalalayn",
    authors: ["Jalaluddin al-Mahalli", "Jalaluddin as-Suyuthi"],
    field: "quran",
    blurb: "Tafsir ringkas seluruh Al-Qur'an.",
  },
  {
    slug: "at-tibyan",
    shamela_id: 1969,
    title_id: "At-Tibyan fi Adab Hamalat al-Qur'an",
    authors: ["an-Nawawi"],
    field: "quran",
    blurb: "Adab membaca, menghafal, dan mengajarkan Al-Qur'an.",
  },
  {
    slug: "nihayat-az-zain",
    shamela_id: 6146,
    title_id: "Nihayat az-Zain",
    authors: ["Nawawi al-Bantani"],
    field: "fikih",
    blurb: "Fikih Syafi'i karya ulama Banten, syarah Qurrat al-'Ain.",
  },
  {
    slug: "al-muqaddimah-al-hadhramiyyah",
    shamela_id: 6125,
    title_id: "Al-Muqaddimah al-Hadhramiyyah",
    authors: ["Bafadhal al-Hadhrami"],
    field: "fikih",
    blurb: "Ringkasan fikih ibadah mazhab Syafi'i.",
  },
  {
    slug: "al-waraqat",
    shamela_id: 6297,
    title_id: "Al-Waraqat",
    authors: ["al-Juwaini"],
    field: "ushul",
    blurb: "Dasar-dasar ushul fikih dalam beberapa lembar.",
  },
  {
    slug: "al-ajurrumiyyah",
    shamela_id: 11371,
    title_id: "Al-Ajurrumiyyah",
    authors: ["Ibnu Ajurrum"],
    field: "bahasa",
    blurb: "Dasar ilmu nahwu untuk pemula.",
  },
  {
    slug: "mutammimah-al-ajurrumiyyah",
    shamela_id: 4234,
    title_id: "Mutammimah al-Ajurrumiyyah",
    authors: ["al-Haththab"],
    field: "bahasa",
    blurb: "Pelengkap al-Ajurrumiyyah untuk tingkat lanjut.",
  },
  {
    slug: "syarh-ibn-aqil",
    shamela_id: 9904,
    title_id: "Syarh Ibnu 'Aqil",
    authors: ["Ibnu 'Aqil"],
    field: "bahasa",
    blurb: "Syarah Alfiyah Ibnu Malik tentang nahwu dan sharaf.",
  },
  {
    slug: "jami-ad-durus-al-arabiyyah",
    shamela_id: 3284,
    title_id: "Jami' ad-Durus al-'Arabiyyah",
    authors: ["Mustafa al-Ghalayini"],
    field: "bahasa",
    blurb: "Pelajaran bahasa Arab lengkap: nahwu, sharaf, dan i'rab.",
  },
  {
    slug: "at-tarifat",
    shamela_id: 7312,
    title_id: "At-Ta'rifat",
    authors: ["al-Jurjani"],
    field: "istilah",
    blurb: "Kamus definisi istilah lintas ilmu.",
  },
];

export interface UpcomingKitab {
  slug: string;
  title_id: string;
  title_ar: string;
  /** Nama Latin + tahun wafat (Hijriah) dari master Shamela. */
  authors: { name: string; death_hijri: number | null }[];
  field: KitabField;
  blurb: string;
}

const byId = new Map(data.map((d) => [d.shamela_id, d]));

export const UPCOMING_KITAB: readonly UpcomingKitab[] = META.map((m) => {
  const d = byId.get(m.shamela_id);
  if (!d || d.authors.length !== m.authors.length) {
    throw new Error(`kitab-mendatang: data Shamela ${m.shamela_id} tidak cocok`);
  }
  return {
    slug: m.slug,
    title_id: m.title_id,
    title_ar: d.title_ar,
    authors: m.authors.map((name, i) => ({ name, death_hijri: d.authors[i]?.death_hijri ?? null })),
    field: m.field,
    blurb: m.blurb,
  };
});

export const UPCOMING_SLUGS: ReadonlySet<string> = new Set(UPCOMING_KITAB.map((k) => k.slug));
