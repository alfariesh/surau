// Konfigurasi ingest Ihya' 'Ulum ad-Din (Shamela 9472). Teks Arab (judul, nama penulis, penerbit)
// TIDAK ditulis di sini: semuanya disalin dari Shamela (book.sqlite, author.sqlite, page, title).
// ID karya/edisi/penulis dan slug dibekukan sejak rilis Fase 1 (ADR-029). Keputusan: ADR-018, ADR-032.
import type { AttributionStatus } from "@surau/db";

export interface WorkConfig {
  shamelaBook: number;
  /** Path relatif ke root repo. */
  patch: string;
  /** Daftar kurasi subjudul pembaca (X04, ADR-074): sumber subjudul untuk judul daftar isi Indonesia. */
  subheadings: string;
  ids: string;
  reportPrefix: string;
  corpusVersion: string;
  /** Nama file .sqlite di data/build. */
  output: string;
  expect: {
    pages: number;
    /** Jumlah halaman per juz, urut juz 1..n. */
    volumes: number[];
    titles: number;
    /** `title.id` rub' (node akar yang wajib punya `kitabPerRub` anak). */
    rub: number[];
    kitabPerRub: number;
    /** Gerbang verify-openiti: halaman minimal dengan kemiripan matan ≥ ambang. */
    matanMinPages: number;
    /**
     * Cakupan minimal terjemahan dan ringkasan AI yang dimuat (S13; 0 = tidak diwajibkan). Gagal
     * bila hasil batch di data/build/llm kurang dari ini (mis. file hilang atau sebagian usang).
     */
    llmCoverage: number;
  };
  author: { id: number; nameId: string; wikidataId: string | null };
  work: {
    id: number;
    slug: string;
    openitiUri: string;
    titleId: string;
    attributionStatus: AttributionStatus;
    period: string;
  };
  edition: { id: number; slug: string; license: string; attribution: string };
  /**
   * Pindaian edisi cetak, HANYA ditautkan (ADR-018; dipakai daftar QA manusia S10). Halaman cetak
   * `p` jilid `j` = `${details}/${volumes[j-1].file}/page/n${p + volumes[j-1].leafOffset}/mode/1up`.
   */
  scan?: { details: string; volumes: { file: string; leafOffset: number }[] };
  openiti: {
    release: string;
    commit: string;
    /** Versi pembanding matan (dasar lisensi). */
    matan: { file: string; sha256: string };
    /** Versi pembanding takhrij. */
    takhrij: { file: string; sha256: string };
  };
}

export const IHYA: WorkConfig = {
  shamelaBook: 9472,
  patch: "data/patches/ihya-9472.yaml",
  subheadings: "data/patches/ihya-9472-subjudul.json",
  ids: "data/ids/ihya-9472.json",
  reportPrefix: "data/reports/ihya-9472",
  corpusVersion: "ihya-v8",
  output: "surau-corpus-ihya-v8.sqlite",
  expect: {
    pages: 1706,
    volumes: [361, 386, 413, 546],
    titles: 311,
    rub: [2, 156, 168, 180],
    kitabPerRub: 10,
    matanMinPages: 1705,
    // "Selesai bila" S13: daftar yang gagal < 1%.
    llmCoverage: 0.99,
  },
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
