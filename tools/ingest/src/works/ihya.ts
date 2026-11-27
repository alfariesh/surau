// Konfigurasi ingest Ihya' 'Ulum ad-Din (Shamela 9472). Teks Arab (judul, nama penulis, penerbit)
// TIDAK ditulis di sini: semuanya disalin dari Shamela (book.sqlite, author.sqlite, page, title).
// ID karya/edisi/penulis dan slug dibekukan sejak rilis Fase 1 (ADR-029). Keputusan: ADR-018, ADR-032.
import type { WorkConfig } from "./config.ts";

export type { WorkConfig } from "./config.ts";

export const IHYA: WorkConfig = {
  shamelaBook: 9472,
  footnotes: "classical",
  patch: "data/patches/ihya-9472.yaml",
  subheadings: "data/patches/ihya-9472-subjudul.json",
  ayahPatch: "data/patches/ihya-9472-ayat.yaml",
  ids: "data/ids/ihya-9472.json",
  reportPrefix: "data/reports/ihya-9472",
  // Intisari pilot X15b (= yang tayang di ihya-v9), bukan folder `intisari` yang kini berisi hasil
  // X15c yang belum digabung (ADR-136; folder per kitab sejak ADR-137).
  llm: { dir: ".", intisari: "intisari-pilot-x15b-cadangan-2026-10-27" },
  audioManifest: "data/audio/ihya-9472-audio.json",
  expect: {
    pages: 1706,
    volumes: [361, 386, 413, 546],
    titles: 311,
    rub: [2, 156, 168, 180],
    kitabPerRub: 10,
    matanMinPages: 1705,
    // "Selesai bila" S13: daftar yang gagal < 1%.
    llmCoverage: 0.99,
    // 19 Intisari tayang di ihya-v9 (ADR-136): build yang memuat lebih sedikit gagal.
    minDigests: 19,
  },
  // j1 h200: hadits shalat malam Jumat + takhrij al-'Iraqi (badan, catatan kaki, penanda tertaut);
  // الصبر mengenai ±320 paragraf.
  smoke: { juz: 1, page: 200, search: "الصبر", footnotes: true },
  author: { id: 1, nameId: "Abu Hamid al-Ghazali", wikidataId: null },
  work: {
    id: 1,
    slug: "ihya",
    openitiUri: "0505Ghazali.IhyaCulumDin",
    titleId: "Ihya' 'Ulum ad-Din",
    attributionStatus: "authentic",
    period: "abad ke-5 H",
  },
  edition: {
    id: 1,
    slug: "dar-al-marifah",
    license: "CC BY-NC-SA 4.0",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0009472 & JK000001; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar al-Ma'rifah, Beirut 1402/1982",
  },
  // Selisih indeks halaman pindaian (n, mulai 0) terhadap halaman cetak, dicek 2026-10-16 di dua
  // titik per jilid (j1 n50/n200/n350, j2 n100/n350, j3 n100/n400, j4 n100/n500): tetap per jilid.
  scan: {
    details: "https://archive.org/details/ihya-ghazali",
    volumes: [
      { file: "iud-dm-001", leafOffset: 9 },
      { file: "iud-dm-002", leafOffset: 2 },
      { file: "iud-dm-003", leafOffset: 3 },
      { file: "iud-dm-004", leafOffset: 3 },
    ],
  },
  openiti: {
    release: "2025.1.9",
    commit: "e8dddd44c7998cefce72e4f37fad471634dd9d1e",
    matan: {
      file: "0505Ghazali.IhyaCulumDin.Shamela0009472-ara1.completed",
      sha256: "e60d73c72033e5ca1be5ac3bf52f5fa5057aa4a3d1c750f26b9301b6b97e8997",
    },
    takhrij: {
      file: "0505Ghazali.IhyaCulumDin.JK000001-ara1",
      sha256: "0780031c3e4a55b65bdf45d7cca890869757cbedaa46a21273e9378428466018",
    },
  },
};
