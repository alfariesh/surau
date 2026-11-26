// Bentuk konfigurasi ingest per kitab dan per korpus (X31a, ADR-137). Teks Arab (judul, nama
// penulis, penerbit) TIDAK ditulis di konfigurasi: semuanya disalin dari Shamela.
import type { AttributionStatus } from "@surau/db";

/** Berkas sumber yang dipin sha256-nya (data/SOURCES.md). */
export interface PinnedFile {
  file: string;
  sha256: string;
}

export interface WorkConfig {
  shamelaBook: number;
  /** Patch daftar isi (path relatif ke root repo); tanpa berkas = tanpa patch. */
  patch?: string;
  /** Daftar kurasi subjudul pembaca (X04, ADR-074): sumber subjudul untuk judul daftar isi Indonesia. */
  subheadings?: string;
  /** Patch ayat terverifikasi (X29, ADR-133); tanpa berkas = tanpa patch. */
  ayahPatch?: string;
  ids: string;
  reportPrefix: string;
  /**
   * Hasil batch LLM kitab ini, relatif ke folder hasil LLM (`data/build/llm`). Tanpa entri = kitab
   * dibangun tanpa terjemahan/ringkasan/Intisari (gerbang `llmCoverage` harus 0).
   */
  llm?: {
    /** Folder `translation.jsonl` dan kawan-kawan; `.` = akar folder hasil LLM (Ihya). */
    dir: string;
    /** Folder hasil Intisari (X15b); per kitab sejak ADR-137 (pemicu ADR-136 butir 4). */
    intisari: string;
  };
  /** Metadata audio Intisari (ditulis `pnpm audio manifest`); tanpa entri = tanpa audio. */
  audioManifest?: string;
  expect: {
    pages: number;
    /** Jumlah halaman per juz, urut juz 1..n. Kitab satu jilid: satu angka (ADR-029). */
    volumes: number[];
    titles: number;
    /**
     * Struktur khas Ihya: `title.id` rub' (node akar yang wajib punya `kitabPerRub` anak). Kitab
     * lain tanpa entri = gerbang ini tidak berlaku.
     */
    rub?: number[];
    kitabPerRub?: number;
    /** Gerbang verify-openiti: halaman minimal dengan kemiripan matan ≥ ambang. */
    matanMinPages: number;
    /**
     * Cakupan minimal terjemahan dan ringkasan AI yang dimuat (S13; 0 = tidak diwajibkan). Gagal
     * bila hasil batch di data/build/llm kurang dari ini (mis. file hilang atau sebagian usang).
     */
    llmCoverage: number;
    /**
     * Intisari minimal yang termuat (ADR-137): mencegah regresi senyap seperti di ADR-136, ketika
     * build biasa keluar dengan Intisari 0 tanpa gagal. Tanpa entri = 0.
     */
    minDigests?: number;
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
    matan: PinnedFile;
    /** Versi pembanding takhrij (hanya Ihya: JK). Tanpa entri = catatan kaki tidak dibandingkan. */
    takhrij?: PinnedFile;
  };
}

/** Satu build korpus D1: beberapa kitab dalam satu basis data (X31a, ADR-137). */
export interface CorpusConfig {
  /** `meta.corpus_version` dan nama DB produksi `surau-corpus-<version>` (pola promote). */
  version: string;
  /** Nama file .sqlite di data/build. */
  output: string;
  works: readonly WorkConfig[];
}
