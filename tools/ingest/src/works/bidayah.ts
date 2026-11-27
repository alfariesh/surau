// Konfigurasi ingest Bidayat al-Hidayah, al-Ghazali (Shamela 12718; X31a, ADR-135, ADR-137). Teks
// Arab (judul, nama penulis, penerbit) TIDAK ditulis di sini: semuanya disalin dari Shamela.
// Slug `bidayat-al-hidayah` sama dengan daftar "Segera hadir" (ADR-115) dan dibekukan saat tayang.
import type { WorkConfig } from "./config.ts";

export const BIDAYAH: WorkConfig = {
  shamelaBook: 12718,
  footnotes: "none",
  ids: "data/ids/bidayat-al-hidayah-12718.json",
  reportPrefix: "data/reports/bidayat-al-hidayah-12718",
  // Folder kerja LLM per kitab (X31b, ADR-137 butir 8): data/build/llm/bidayat-al-hidayah. Intisari
  // Bidayah dibuat lewat chat (X24), jadi folder Intisari batch ini tetap kosong.
  // Model Sonnet 5.5 atas keputusan pemilik 2026-11-27 ("langsung aja pake llm model sonnet").
  llm: { dir: "bidayat-al-hidayah", intisari: "bidayat-al-hidayah/intisari", model: "sonnet" },
  expect: {
    pages: 46,
    // Satu jilid (kolom `part` Shamela kosong → juz 1, ADR-029); halaman cetak 25–70.
    volumes: [46],
    titles: 46,
    matanMinPages: 46,
    // Terjemahan dan ringkasan menyusul di X31b.
    llmCoverage: 0,
  },
  // Halaman cetak pertama (4 paragraf badan); الهداية mengenai 7 paragraf. Tanpa catatan kaki.
  smoke: { juz: 1, page: 25, search: "الهداية", footnotes: false },
  // Pengarang sama dengan Ihya: baris `author` id 1 dipakai bersama (isinya dari Shamela author 619).
  author: { id: 1, nameId: "Abu Hamid al-Ghazali", wikidataId: null },
  work: {
    id: 2,
    slug: "bidayat-al-hidayah",
    openitiUri: "0505Ghazali.BidayatHidaya",
    titleId: "Bidayat al-Hidayah",
    attributionStatus: "authentic",
    period: "abad ke-5 H",
  },
  edition: {
    id: 2,
    slug: "maktabat-madbuli",
    license: "CC BY-NC-SA 4.0",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0012718; digitalisasi asal: al-Maktaba al-Shamela; edisi: Maktabat Madbuli, Kairo 1413/1993",
  },
  openiti: {
    release: "2025.1.9",
    commit: "e8dddd44c7998cefce72e4f37fad471634dd9d1e",
    matan: {
      file: "0505Ghazali.BidayatHidaya.Shamela0012718-ara1",
      sha256: "15f75e3f926f249e3301143dad2ac4313b086527ac8dbcdf3252486a1f077263",
    },
  },
};
