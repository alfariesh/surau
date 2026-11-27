// Konfigurasi ingest at-Ta'rifat, asy-Syarif al-Jurjani (Shamela 7312; Gelombang 2, ADR-152).
// Teks Arab (judul, nama penulis, penerbit) TIDAK ditulis di sini: semuanya disalin dari Shamela.
// Slug `at-tarifat` sama dengan daftar "Segera hadir" (ADR-115), beku saat tayang.
import { TRANSLATE_NOTES } from "@surau/llm";

import type { WorkConfig } from "./config.ts";

export const TARIFAT: WorkConfig = {
  shamelaBook: 7312,
  // Edisi ini tanpa catatan kaki (diperiksa 2026-11-28: tidak ada garis pemisah catatan).
  footnotes: "none",
  // Judul jilid Shamela (title 1) menaungi semua bab; bab huruf dinaikkan ke tingkat teratas.
  patch: "data/patches/at-tarifat-7312.yaml",
  // Label jilid dan daftar isi penerbit di badan edisi: tidak dimuat (ADR-150, ADR-152).
  editorText: "data/patches/at-tarifat-7312-pentahqiq.yaml",
  ids: "data/ids/at-tarifat-7312.json",
  reportPrefix: "data/reports/at-tarifat-7312",
  // Folder kerja LLM per kitab (ADR-137 butir 8); Sonnet seperti Gelombang 1. Istilah yang
  // didefinisikan ditulis sebagai transliterasi Latin di terjemahan (ADR-149, ADR-152).
  llm: {
    dir: "at-tarifat",
    intisari: "at-tarifat/intisari",
    model: "sonnet",
    translateNote: TRANSLATE_NOTES.tarifat,
  },
  expect: {
    // Angka sumber Shamela. Yang dimuat: 255 halaman dan 29 node (halaman 256–257 dan judul 1, 31
    // dibuang, ADR-150).
    pages: 257,
    // Satu jilid (kolom `part` Shamela kosong → juz 1, ADR-029); halaman cetak 5–262.
    volumes: [257],
    titles: 31,
    matanMinPages: 257,
    llmCoverage: 0,
  },
  // Halaman cetak 7 (awal bab alif, 11 paragraf badan); kata pencarian mengenai 15 paragraf badan.
  smoke: { juz: 1, page: 7, search: "الابتداء", footnotes: false },
  // Pengarang baru: baris `author` id 6 (isinya dari Shamela author 884).
  author: { id: 6, nameId: "asy-Syarif al-Jurjani", wikidataId: null },
  work: {
    id: 8,
    slug: "at-tarifat",
    openitiUri: "0816IbnMuhammadSharifJurjani.Tacrifat",
    titleId: "at-Ta'rifat",
    attributionStatus: "authentic",
    period: "abad ke-9 H",
  },
  edition: {
    id: 8,
    slug: "dar-al-kutub-al-ilmiyyah",
    license: "CC BY-NC-SA 4.0",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0007312; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar al-Kutub al-'Ilmiyyah, Beirut, cetakan pertama 1403/1983, disunting sekelompok ulama di bawah penerbit; daftar isi penerbit tidak disertakan",
  },
  openiti: {
    release: "2025.1.9",
    repo: "OpenITI/0825AH",
    commit: "2630748a4754b509908048087e569ccc8dd251ce",
    matan: {
      file: "0816IbnMuhammadSharifJurjani.Tacrifat.Shamela0007312-ara1",
      sha256: "7eb469f3a7d27785d456111e02456798dca66e9f256c7c01a2d207c6da19c3fe",
    },
  },
};
