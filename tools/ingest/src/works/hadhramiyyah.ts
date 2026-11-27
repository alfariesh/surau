// Konfigurasi ingest al-Muqaddimah al-Hadhramiyyah (Masa'il at-Ta'lim), Bafadl al-Hadrami (Shamela
// 6125; Gelombang 2, ADR-152). Teks Arab (judul, nama penulis, penerbit) TIDAK ditulis di sini:
// semuanya disalin dari Shamela. Slug `al-muqaddimah-al-hadhramiyyah` sama dengan daftar "Segera
// hadir" (ADR-115), beku saat tayang.
import { SUMMARY_NOTES, TRANSLATE_NOTES } from "@surau/llm";

import type { WorkConfig } from "./config.ts";

export const HADHRAMIYYAH: WorkConfig = {
  shamelaBook: 6125,
  // Edisi ini tanpa catatan kaki (diperiksa 2026-11-28: tidak ada garis pemisah catatan di 142
  // halaman) dan tanpa mukadimah pentahqiq di badan (page.id 1 = mukadimah penulis).
  footnotes: "none",
  // Daftar isi: mukadimah, 4 "kitab" + 15 "bab" yang di Shamela hanya teks sebaris (bukan `title`)
  // menjadi node patch; 99 judul "fasl" dipindah ke bawahnya (ADR-152, tambahan).
  patch: "data/patches/al-muqaddimah-al-hadhramiyyah-6125.yaml",
  ids: "data/ids/al-muqaddimah-al-hadhramiyyah-6125.json",
  reportPrefix: "data/reports/al-muqaddimah-al-hadhramiyyah-6125",
  llm: {
    dir: "al-muqaddimah-al-hadhramiyyah",
    intisari: "al-muqaddimah-al-hadhramiyyah/intisari",
    model: "sonnet",
    // Identitas kitab: prompt dasar menyebut Ihya' (ADR-152 tambahan).
    translateNote: TRANSLATE_NOTES.hadhramiyyah,
    // Identitas kitab untuk ringkasan (ADR-152 tambahan).
    summaryNote: SUMMARY_NOTES.hadhramiyyah,
  },
  expect: {
    pages: 142,
    // Satu jilid (kolom `part` Shamela kosong → juz 1, ADR-029); halaman cetak 19–162.
    volumes: [142],
    titles: 99,
    matanMinPages: 142,
    llmCoverage: 0,
    // Enam Intisari Bab chat, satu per node patch tingkat teratas (ADR-147, ADR-152): batas bawah
    // supaya tidak hilang diam-diam (ADR-137).
    minDigests: 6,
  },
  // Halaman cetak 50 (fasl rukun tayamum); kata pencarian mengenai paragraf badan kitab ini.
  smoke: { juz: 1, page: 50, search: "التيمم", footnotes: false },
  // Pengarang baru: baris `author` id 5 (isinya dari Shamela author 1677).
  author: { id: 5, nameId: "Bafadl al-Hadrami", wikidataId: null },
  work: {
    id: 7,
    slug: "al-muqaddimah-al-hadhramiyyah",
    openitiUri: "0918BafadlHadrami.MuqaddimaHadramiyya",
    titleId: "al-Muqaddimah al-Hadhramiyyah",
    attributionStatus: "authentic",
    period: "abad ke-10 H",
  },
  edition: {
    id: 7,
    slug: "ad-dar-al-muttahidah",
    license: "CC BY-NC-SA 4.0",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0006125; digitalisasi asal: al-Maktaba al-Shamela; edisi: ad-Dar al-Muttahidah, Damaskus, cetakan ke-2 1413 H, tahqiq Majid al-Hamawi",
  },
  openiti: {
    release: "2025.1.9",
    repo: "OpenITI/0925AH",
    commit: "4f0f4562d1e13083c593e3a0ca6a19a3eb33805e",
    matan: {
      file: "0918BafadlHadrami.MuqaddimaHadramiyya.Shamela0006125-ara1",
      sha256: "1f2dee98e31f7a2df79c40b3f7990389e6030fd94fc4eb1a3e9d27536cb27149",
    },
  },
};
