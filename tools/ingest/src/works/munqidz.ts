// Konfigurasi ingest al-Munqidz min adh-Dhalal, al-Ghazali (Shamela 9246; Gelombang 2, ADR-152).
// Teks Arab (judul, nama penulis, penerbit) TIDAK ditulis di sini: semuanya disalin dari Shamela.
// Slug `al-munqidz-min-adh-dhalal` sama dengan daftar "Segera hadir" (ADR-115), beku saat tayang.
import type { WorkConfig } from "./config.ts";

export const MUNQIDZ: WorkConfig = {
  shamelaBook: 9246,
  // Edisi ini tanpa catatan kaki (diperiksa 2026-11-28: tidak ada garis pemisah catatan).
  footnotes: "none",
  ids: "data/ids/al-munqidz-min-adh-dhalal-9246.json",
  reportPrefix: "data/reports/al-munqidz-min-adh-dhalal-9246",
  // Folder kerja LLM per kitab (ADR-137 butir 8); Sonnet seperti Gelombang 1.
  llm: {
    dir: "al-munqidz-min-adh-dhalal",
    intisari: "al-munqidz-min-adh-dhalal/intisari",
    model: "sonnet",
  },
  expect: {
    pages: 93,
    // Satu jilid (kolom `part` Shamela kosong → juz 1, ADR-029); halaman cetak 101–207, unik.
    volumes: [93],
    titles: 16,
    // 92/93: h128 (0,897) memuat empat judul sisipan di tengah kalimat yang di OpenITI menjadi
    // baris judul tersendiri; teksnya sama (93% token berurutan), ADR-152.
    matanMinPages: 92,
    // 201/203 paragraf berterjemahan; sepuluh Intisari Bab judul teratas (data/konten, ADR-147).
    llmCoverage: 0.99,
    minDigests: 10,
  },
  // Halaman cetak 112 (awal judul kedua); kata pencarian mengenai paragraf badan kitab ini.
  smoke: { juz: 1, page: 112, search: "السفسطة", footnotes: false },
  // Pengarang sama dengan Ihya dan Bidayah: baris `author` id 1 dipakai bersama.
  author: { id: 1, nameId: "Abu Hamid al-Ghazali", wikidataId: null },
  work: {
    id: 5,
    slug: "al-munqidz-min-adh-dhalal",
    openitiUri: "0505Ghazali.Munqidh",
    titleId: "al-Munqidz min adh-Dhalal",
    attributionStatus: "authentic",
    period: "abad ke-5 H",
  },
  edition: {
    id: 5,
    slug: "dar-al-kutub-al-haditsah",
    license: "CC BY-NC-SA 4.0",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0009246; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar al-Kutub al-Haditsah, Mesir, disertai Dr. 'Abd al-Halim Mahmud",
  },
  openiti: {
    release: "2025.1.9",
    repo: "OpenITI/0525AH",
    commit: "6290621b58e063ed1aa47ffd0a6fc1630191e7cb",
    matan: {
      file: "0505Ghazali.Munqidh.Shamela0009246-ara1",
      sha256: "a9d2ea465cb311b05d0a263035ea51b877f0bd7dc0a53e247531481377b0695a",
    },
  },
};
