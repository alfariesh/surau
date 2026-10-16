// Konfigurasi ingest Ihya' 'Ulum ad-Din (Shamela 9472). Teks Arab (judul, nama penulis, penerbit)
// TIDAK ditulis di sini: semuanya disalin dari Shamela (book.sqlite, author.sqlite, page, title).
// ID karya/edisi/penulis dan slug dibekukan sejak rilis Fase 1 (ADR-029). Keputusan: ADR-018, ADR-032.
import type { AttributionStatus } from "@surau/db";

export interface WorkConfig {
  shamelaBook: number;
  /** Path relatif ke root repo. */
  patch: string;
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
  ids: "data/ids/ihya-9472.json",
  reportPrefix: "data/reports/ihya-9472",
  corpusVersion: "ihya-v1",
  output: "surau-corpus-ihya-v1.sqlite",
  expect: {
    pages: 1706,
    volumes: [361, 386, 413, 546],
    titles: 311,
    rub: [2, 156, 168, 180],
    kitabPerRub: 10,
    matanMinPages: 1705,
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
