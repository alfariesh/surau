// Konfigurasi ingest at-Tibyan fi Adab Hamalat al-Qur'an, an-Nawawi (Shamela 1969; X31c, ADR-135,
// ADR-137, ADR-138). Teks Arab (judul, nama penulis, penerbit) TIDAK ditulis di sini: semuanya
// disalin dari Shamela. Slug `at-tibyan` sama dengan daftar "Segera hadir" (ADR-115) dan dibekukan
// saat tayang.
import type { WorkConfig } from "./config.ts";

export const TIBYAN: WorkConfig = {
  shamelaBook: 1969,
  // Catatan kaki edisi ini dari pentahqiq (Muhammad al-Hajjar): tidak dimuat (ADR-138 butir 3).
  footnotes: "modern_editor",
  ids: "data/ids/at-tibyan-1969.json",
  reportPrefix: "data/reports/at-tibyan-1969",
  // Folder kerja LLM per kitab (ADR-137 butir 8); model Sonnet untuk Gelombang 1 (X31b).
  llm: { dir: "at-tibyan", intisari: "at-tibyan/intisari", model: "sonnet" },
  expect: {
    pages: 224,
    // Satu jilid (kolom `part` Shamela kosong → juz 1, ADR-029); halaman cetak 5–230.
    volumes: [224],
    titles: 127,
    matanMinPages: 224,
    // Terjemahan dan ringkasan menyusul (X31c lanjutan).
    llmCoverage: 0,
  },
  // Halaman cetak pertama (8 paragraf badan); التلاوة mengenai 24 paragraf. Catatan kaki tidak
  // dimuat (ADR-138).
  smoke: { juz: 1, page: 5, search: "التلاوة", footnotes: false },
  // Pengarang baru: baris `author` id 2 (isinya dari Shamela author 44).
  author: { id: 2, nameId: "an-Nawawi", wikidataId: null },
  work: {
    id: 3,
    slug: "at-tibyan",
    openitiUri: "0676Nawawi.Tibyan",
    titleId: "at-Tibyan fi Adab Hamalat al-Qur'an",
    attributionStatus: "authentic",
    period: "abad ke-7 H",
  },
  edition: {
    id: 3,
    slug: "dar-ibn-hazm",
    license: "CC BY-NC-SA 4.0",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0001969; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar Ibn Hazm, Beirut 1414/1994, tahqiq Muhammad al-Hajjar; catatan kaki pentahqiq tidak disertakan",
  },
  openiti: {
    release: "2025.1.9",
    commit: "6dca5e250b9e4405b93c4a5e73cfffdef5d7fef7",
    matan: {
      file: "0676Nawawi.Tibyan.Shamela0001969-ara1",
      sha256: "075cd037b0a57f30be4207118a7685281c08525d5ec99ab5ab4dfed5080ead7f",
    },
  },
};
