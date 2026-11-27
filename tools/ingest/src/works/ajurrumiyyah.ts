// Konfigurasi ingest al-Ajurrumiyyah, Ibnu Ajurrum (Shamela 11371; X31d, ADR-135, ADR-137, ADR-138,
// ADR-139). Teks Arab (judul, nama penulis, penerbit) TIDAK ditulis di sini: semuanya disalin dari
// Shamela. Slug `al-ajurrumiyyah` sama dengan daftar "Segera hadir" (ADR-115) dan dibekukan saat
// tayang.
import { TRANSLATE_NOTES } from "@surau/llm";

import type { WorkConfig } from "./config.ts";

export const AJURRUMIYYAH: WorkConfig = {
  shamelaBook: 11371,
  // Satu-satunya catatan kaki edisi ini dari penyunting (perbedaan naskah cetak): tidak dimuat
  // (ADR-138 butir 3).
  footnotes: "modern_editor",
  // 31 halaman Shamela, 19 nomor cetak (5–23): Shamela memecah halaman cetak per bab, potongannya
  // berurutan, jadi digabung per nomor cetak (ADR-139).
  mergeSamePrintPage: true,
  ids: "data/ids/al-ajurrumiyyah-11371.json",
  reportPrefix: "data/reports/al-ajurrumiyyah-11371",
  // Folder kerja LLM per kitab (ADR-137 butir 8); model Sonnet untuk Gelombang 1 (X31b). Contoh
  // Arab di terjemahan ditulis sebagai transliterasi Latin (ADR-149).
  llm: {
    dir: "al-ajurrumiyyah",
    intisari: "al-ajurrumiyyah/intisari",
    model: "sonnet",
    translateNote: TRANSLATE_NOTES.ajurrumiyyah,
  },
  expect: {
    pages: 19,
    // Satu jilid (kolom `part` Shamela kosong → juz 1, ADR-029); halaman cetak 5–23.
    volumes: [19],
    titles: 25,
    matanMinPages: 19,
    // X31c/X31d: terjemahan + ringkasan Sonnet (batch 2026-11-27); "Definisi selesai" X31 = ≥ 99%.
    llmCoverage: 0.99,
  },
  // Halaman cetak pertama (Shamela page.id 1, 8 paragraf badan); الإعراب mengenai 3 paragraf.
  // Catatan kaki tidak dimuat (ADR-138).
  smoke: { juz: 1, page: 5, search: "الإعراب", footnotes: false },
  // Pengarang baru: baris `author` id 3 (isinya dari Shamela author 1591).
  author: { id: 3, nameId: "Ibnu Ajurrum", wikidataId: null },
  work: {
    id: 4,
    slug: "al-ajurrumiyyah",
    openitiUri: "0723IbnAjrum.Ajrumiyya",
    titleId: "al-Ajurrumiyyah",
    attributionStatus: "authentic",
    period: "abad ke-8 H",
  },
  edition: {
    // Wajib 4: dipakai aturan Intisari edisi Gelombang 1 (`SECTION_ONLY_EDITIONS`).
    id: 4,
    slug: "dar-ash-shumaii",
    license: "CC BY-NC-SA 4.0",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0011371; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar ash-Shumai'i, 1419/1998; catatan kaki penyunting tidak disertakan",
  },
  openiti: {
    release: "2025.1.9",
    repo: "OpenITI/0725AH",
    commit: "1c14df8ff4ca37622d678a3a7e76f915848f3f88",
    matan: {
      file: "0723IbnAjrum.Ajrumiyya.Shamela0011371-ara1",
      sha256: "1929acb67f85a0812d297fba9009bf570581ab46888f83ff97f0170043ea4020",
    },
  },
};
