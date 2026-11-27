// Konfigurasi ingest al-Waraqat, Imam al-Haramain al-Juwaini (Shamela 6297; Gelombang 2, ADR-152).
// Teks Arab (judul, nama penulis, penerbit) TIDAK ditulis di sini: semuanya disalin dari Shamela.
// Slug `al-waraqat` sama dengan daftar "Segera hadir" (ADR-115), beku saat tayang.
import { SUMMARY_NOTES, TRANSLATE_NOTES } from "@surau/llm";

import type { WorkConfig } from "./config.ts";

export const WARAQAT: WorkConfig = {
  shamelaBook: 6297,
  // Edisi ini tanpa catatan kaki (diperiksa 2026-11-28).
  footnotes: "none",
  // Basmalah sebelum judul pertama menjadi node tingkat teratas (seperti judul pertama al-Munqidz).
  patch: "data/patches/al-waraqat-6297.yaml",
  ids: "data/ids/al-waraqat-6297.json",
  reportPrefix: "data/reports/al-waraqat-6297",
  llm: {
    dir: "al-waraqat",
    intisari: "al-waraqat/intisari",
    model: "sonnet",
    // Identitas kitab: prompt dasar menyebut Ihya' (ADR-152 tambahan).
    translateNote: TRANSLATE_NOTES.waraqat,
    // Identitas kitab untuk ringkasan (ADR-152 tambahan).
    summaryNote: SUMMARY_NOTES.waraqat,
  },
  expect: {
    pages: 25,
    // Satu jilid; halaman cetak 7–31, unik.
    volumes: [25],
    titles: 20,
    matanMinPages: 25,
    // Terjemahan + ringkasan Sonnet sudah ada; "Definisi selesai" = ≥ 99%.
    llmCoverage: 0.99,
    // 20 Intisari Bab chat, satu per judul Shamela (ADR-147): batas bawah (ADR-137).
    minDigests: 20,
  },
  // Halaman cetak 31 (bab ijtihad); kata pencarian mengenai paragraf badan kitab ini.
  smoke: { juz: 1, page: 31, search: "الاجتهاد", footnotes: false },
  // Pengarang baru: baris `author` id 4 (isinya dari Shamela author 1010).
  author: { id: 4, nameId: "Imam al-Haramain al-Juwaini", wikidataId: null },
  work: {
    id: 6,
    slug: "al-waraqat",
    openitiUri: "0478ImamHaramaynJuwayni.Waraqat",
    titleId: "al-Waraqat",
    attributionStatus: "authentic",
    period: "abad ke-5 H",
  },
  edition: {
    id: 6,
    slug: "tahqiq-al-abd",
    license: "CC BY-NC-SA 4.0",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0006297; digitalisasi asal: al-Maktaba al-Shamela; edisi: tahqiq Dr. 'Abd al-Lathif Muhammad al-'Abd",
  },
  openiti: {
    release: "2025.1.9",
    repo: "OpenITI/0500AH",
    commit: "fff9e21790e2e54f14826322ae49ab7671f12744",
    // 17 dari 26 penanda halaman berkas ini PageV00P000; diisi dari urutannya (ADR-152).
    fillZeroPageMarkers: true,
    matan: {
      file: "0478ImamHaramaynJuwayni.Waraqat.Shamela0006297-ara1",
      sha256: "1d7f55f4193d849e4d385d2f3359ddb3e500b08e41ed9940102a8d861118e68e",
    },
  },
};
