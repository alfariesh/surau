// Konfigurasi ingest Rusum Dar al-Khilafah, Hilal ibn al-Muhassin ash-Shabi' (Shamela 8173;
// Gelombang 2, ADR-152). Teks Arab (judul, nama penulis, penerbit) TIDAK ditulis di sini: semuanya
// disalin dari Shamela. Slug `rusum-dar-al-khilafah` baru (tidak ada di "Segera hadir", ADR-115),
// beku saat tayang.
import type { WorkConfig } from "./config.ts";

export const RUSUM: WorkConfig = {
  shamelaBook: 8173,
  // Edisi ini tanpa teks catatan kaki (diperiksa 2026-11-28: tidak ada garis pemisah catatan). Dua
  // penanda (١)/(٢) yatim di badan (page.id 11 dan 48) sisa catatan Mikha'il 'Awwad yang tidak
  // didigitalkan; tetap di `text_raw` sebagai teks biasa. Mukadimah dan lampiran pentahqiq juga
  // tidak ada di Shamela (halaman cetak 3 langsung dibuka teks Hilal ash-Shabi').
  footnotes: "none",
  ids: "data/ids/rusum-dar-al-khilafah-8173.json",
  reportPrefix: "data/reports/rusum-dar-al-khilafah-8173",
  llm: {
    dir: "rusum-dar-al-khilafah",
    intisari: "rusum-dar-al-khilafah/intisari",
    model: "sonnet",
  },
  expect: {
    pages: 140,
    // Satu jilid (kolom `part` Shamela kosong → juz 1, ADR-029); halaman cetak 3–142, unik.
    volumes: [140],
    titles: 21,
    matanMinPages: 140,
    llmCoverage: 0,
  },
  // Halaman cetak 30 (bab keadaan Dar al-Khilafah, 2 paragraf badan); kata pencarian mengenai 20
  // paragraf badan kitab ini.
  smoke: { juz: 1, page: 30, search: "الحاجب", footnotes: false },
  // Pengarang baru: baris `author` id 7 (isinya dari Shamela author 685). Lahir Shabi'ah (Sabian)
  // di Harran, kemudian masuk Islam; atribusi karya ini tidak diperselisihkan.
  author: { id: 7, nameId: "Hilal ash-Shabi'", wikidataId: null },
  work: {
    id: 9,
    slug: "rusum-dar-al-khilafah",
    openitiUri: "0448HilalSabi.RusumDarKhilafa",
    titleId: "Rusum Dar al-Khilafah",
    attributionStatus: "authentic",
    period: "abad ke-5 H",
  },
  edition: {
    id: 9,
    slug: "dar-ar-raid-al-arabi",
    license: "CC BY-NC-SA 4.0",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0008173; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar ar-Ra'id al-'Arabi, Beirut, cetakan kedua 1986 M, tahqiq Mikha'il 'Awwad",
  },
  openiti: {
    release: "2025.1.9",
    repo: "OpenITI/0450AH",
    commit: "e344cfe20a206c9ded3edfa15d45b4f821a97b8a",
    matan: {
      file: "0448HilalSabi.RusumDarKhilafa.Shamela0008173-ara1",
      sha256: "92a822726431d70a364750d07a70e3a2b433c00baec2c54f3fadec67ec0667b4",
    },
  },
};
