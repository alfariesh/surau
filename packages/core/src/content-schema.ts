// Berkas draf konten turunan `surau-konten/1` (X23, ADR-125): Intisari Bab, Intisari Kitab,
// Faedah, dan Jalur yang ditulis di Claude Desktop lewat plugin `surau-redaksi` (kelak juga oleh
// manusia). Isinya hanya teks Indonesia, ID, dan offset: teks Arab tidak pernah ada di berkas,
// kode menyalinnya dari DB saat dibaca (teks-arab.md aturan 1). Kunci berbahasa Indonesia mengikuti
// skema model Intisari (`judul`, `isi`, `sikap`, `dasar`); angka standar di docs/09-konten.md
// dikunci di `CONTENT_LIMITS` dan diperiksa `lintContent`/`checkContentDraft`.
import { z } from "zod";

import { location, translationView } from "./schema.ts";

/** Format berkas; naik bila bentuknya berubah tidak kompatibel. */
export const CONTENT_FORMAT = "surau-konten/1";
/** Versi aturan pemeriksa (lint + cek korpus); dicap di `periksa.kode.aturan`. */
export const CONTENT_RULES = "konten@1";

export const CONTENT_KINDS = ["intisari-bab", "intisari-kitab", "faedah", "jalur"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

/** Rentang jumlah kata [min, max] dan batas jumlah butir per jenis (standar docs/09 §4). */
export const CONTENT_LIMITS = {
  intisariBab: {
    inti: [12, 35],
    ringkasan: [40, 110],
    judul: [4, 14],
    isi: [25, 110],
    tanya: [6, 30],
    jawab: [4, 30],
    gagasanMax: 7,
    dasarMax: 6,
    kutipanMax: 2,
    istilahMax: 5,
  },
  intisariKitab: {
    inti: [12, 35],
    pembuka: [40, 120],
    ringkasan: [40, 110],
    judul: [4, 14],
    isi: [60, 200],
    tanya: [6, 30],
    jawab: [4, 30],
    penutup: [15, 80],
    gagasan: [5, 10],
    dasarMax: 6,
    kutipanMax: 3,
    istilahMax: 8,
  },
  kutipan: { chars: [20, 400], terjemahan: [2, 150] },
  faedah: { butirMax: 14, judul: [2, 8], konteks: [6, 30], terjemahan: [15, 90], temaMax: 3 },
  jalur: { hari: 7, judul: [3, 12], deskripsi: [15, 60], pengantar: [8, 40] },
  /** Cakupan jangkar Intisari Bab di bawah ini = peringatan. */
  coverageWarn: 0.5,
} as const;

/** Model yang dikenal (Claude 5); model lain = peringatan, operator memastikan pemilih model. */
export const CONTENT_MODELS = [
  "claude-opus-5-5",
  "claude-sonnet-5-5",
  "claude-fable-5-1",
  "claude-haiku-5-5",
] as const;

const words = z.string().trim().min(1).max(2_000);
const id = z.number().int().positive();
const sha256 = z.string().regex(/^[0-9a-f]{64}$/u);

export const contentStance = z
  .enum(["author", "reported", "refuted"])
  .describe("Pendapat penulis sendiri, yang ia nukil, atau yang ia bantah");
export const contentPointKind = z
  .enum(["idea", "advice"])
  .describe("advice = anjuran penulis sendiri (hanya bila sikap author)");

const soal = z.strictObject({ tanya: words, jawab: words });

const gagasanBab = z.strictObject({
  judul: words,
  isi: words,
  sikap: contentStance,
  jenis: contentPointKind,
  dasar: z.array(id).min(1).max(CONTENT_LIMITS.intisariBab.dasarMax),
  soal,
});

const gagasanKitab = gagasanBab.extend({
  /** Bab anak (node daftar isi) yang dirangkum gagasan ini. */
  bab: z.array(id).min(1).max(10),
});

/** Kutipan = rentang `text_raw` satu paragraf (offset dari `verify_quote`); teks disalin kode. */
export const contentQuote = z.strictObject({
  gagasan: z.number().int().min(1),
  passage_id: id,
  char_start: z.number().int().nonnegative(),
  char_end: z.number().int().positive(),
  terjemahan: words,
});

const termKey = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,39}$/u);

export const intisariBabContent = z.strictObject({
  inti: words,
  ringkasan: words,
  gagasan: z.array(gagasanBab).min(1).max(CONTENT_LIMITS.intisariBab.gagasanMax),
  kutipan: z.array(contentQuote).max(CONTENT_LIMITS.intisariBab.kutipanMax).default([]),
  istilah: z.array(termKey).max(CONTENT_LIMITS.intisariBab.istilahMax).default([]),
});

export const intisariKitabContent = z.strictObject({
  inti: words,
  pembuka: words,
  ringkasan: words,
  gagasan: z.array(gagasanKitab).min(1).max(CONTENT_LIMITS.intisariKitab.gagasan[1]),
  kutipan: z.array(contentQuote).max(CONTENT_LIMITS.intisariKitab.kutipanMax).default([]),
  istilah: z.array(termKey).max(CONTENT_LIMITS.intisariKitab.istilahMax).default([]),
  penutup: words,
});

export const faedahContent = z.strictObject({
  butir: z
    .array(
      z.strictObject({
        passage_id: id,
        judul: words,
        konteks: words,
        tema: z
          .array(
            z.string().regex(/^[a-z][a-z' -]{1,23}$/u, "tema: huruf kecil Latin, 2–24 karakter"),
          )
          .min(1)
          .max(CONTENT_LIMITS.faedah.temaMax),
      }),
    )
    .min(1)
    .max(CONTENT_LIMITS.faedah.butirMax),
});

export const jalurContent = z.strictObject({
  slug: z
    .string()
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  judul: words,
  deskripsi: words,
  hari: z
    .array(z.strictObject({ hari: z.number().int().min(1), section_id: id, pengantar: words }))
    .length(CONTENT_LIMITS.jalur.hari),
});

export const contentOrigin = z.strictObject({
  pembuat: z
    .enum(["claude-desktop", "claude-web", "cowork", "claude-code", "manusia"])
    .describe("Tempat draf dibuat; `manusia` untuk fase penulis/peninjau manusia"),
  /** ID model yang dipakai (dilaporkan model sendiri di chat); null bila ditulis manusia. */
  model: z
    .string()
    .regex(/^[a-z0-9][a-z0-9.-]{2,59}$/u)
    .nullable(),
  /** Plugin dan versinya, mis. `surau-redaksi@0.1.0`. */
  plugin: z.string().max(60).nullable(),
  /** Skill dan versi standarnya, mis. `intisari-bab@1`. */
  skill: z.string().min(1).max(60),
  /** Siapa yang menjalankan: peran atau nama pendek (data publik di repo). */
  operator: z.string().trim().min(1).max(40),
  dibuat: z.iso.datetime({ offset: true }),
});

/** Cap cek kode (lapis 1) dari `check_content_draft` atau `pnpm konten cek`. */
export const contentStamp = z.strictObject({
  aturan: z.string().min(1).max(40),
  lolos: z.boolean(),
  sumber_sha256: sha256,
  draf_sha256: sha256,
  waktu: z.iso.datetime({ offset: true }),
});
export type ContentStamp = z.infer<typeof contentStamp>;

const ke = z.number().int().min(1).describe("Nomor gagasan, butir, atau hari (mulai 1)");
const catatan = z.string().max(500);
/** Skala QA X15: Benar (setia dan atribusi tepat), Kurang (perlu dirapikan), Salah (keliru isi). */
const verdict = z.enum(["benar", "kurang", "salah"]);

export const contentReview = z.strictObject({
  /** Periksa mandiri (lapis 2): model yang sama, di percakapan yang sama. */
  mandiri: z.array(z.strictObject({ ke, nilai: verdict, catatan })).default([]),
  /** Periksa independen (lapis 3): agen konteks segar saat impor (ADR-105: bukan manusia). */
  independen: z
    .strictObject({
      penilai: z.string().min(1).max(160),
      tanggal: z.iso.date(),
      /** Sidik isi yang dinilai (`contentDraftSha256`): isi berubah = periksa ulang. */
      draf_sha256: sha256,
      nilai: z.array(z.strictObject({ ke, nilai: verdict, catatan })),
      laporan: z.string().max(200).nullable(),
    })
    .nullable()
    .default(null),
  kode: contentStamp.nullable().default(null),
});

export const contentStatus = z
  .enum(["draf", "siap", "ditarik"])
  .describe("draf = belum lolos tiga lapis; siap = terbit di build berikutnya; ditarik = keluar");

const envelope = {
  format: z.literal(CONTENT_FORMAT),
  edition_id: id,
  /** Bagian sumber: bab/sub-bab (Intisari Bab, Faedah) atau Kitab (Intisari Kitab, Jalur). */
  section_id: id,
  lang: z.literal("id").default("id"),
  versi: z.number().int().min(1).default(1),
  /** Unit yang digantikan: `null`, versi sebelumnya ("intisari-bab/100007@1"), atau rekaman lama
   * ("digest-section@2"). Dicatat agar build X24 tahu Intisari batch mana yang diganti. */
  menggantikan: z.string().trim().min(1).max(80).nullable().default(null),
  status: contentStatus,
  tarik: z
    .strictObject({ alasan: z.string().trim().min(5).max(300), tanggal: z.iso.date() })
    .optional(),
  asal: contentOrigin,
  periksa: contentReview.default({ mandiri: [], independen: null, kode: null }),
};

export const contentDraft = z
  .discriminatedUnion("jenis", [
    z.strictObject({ ...envelope, jenis: z.literal("intisari-bab"), isi: intisariBabContent }),
    z.strictObject({ ...envelope, jenis: z.literal("intisari-kitab"), isi: intisariKitabContent }),
    z.strictObject({ ...envelope, jenis: z.literal("faedah"), isi: faedahContent }),
    z.strictObject({ ...envelope, jenis: z.literal("jalur"), isi: jalurContent }),
  ])
  .superRefine((d, ctx) => {
    if (d.status === "ditarik" && d.tarik === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["tarik"],
        message: "status ditarik wajib punya tarik",
      });
    }
    if (d.asal.pembuat !== "manusia" && d.asal.model === null) {
      ctx.addIssue({ code: "custom", path: ["asal", "model"], message: "model wajib diisi" });
    }
  });
export type ContentDraft = z.infer<typeof contentDraft>;
export type IntisariBabContent = z.infer<typeof intisariBabContent>;
export type IntisariKitabContent = z.infer<typeof intisariKitabContent>;
export type FaedahContent = z.infer<typeof faedahContent>;
export type JalurContent = z.infer<typeof jalurContent>;

// ── Hasil pemeriksaan (keluaran MCP `check_content_draft` dan CLI `konten cek`) ─────────────

export const contentIssue = z.strictObject({
  code: z.string().describe("Kode masalah (mis. fatwa, length, outside_section)"),
  path: z.string().describe("Letak di berkas, mis. isi.gagasan[2].judul"),
  message: z.string().describe("Penjelasan berbahasa Indonesia"),
});
export type ContentIssue = z.infer<typeof contentIssue>;

export const contentCheck = z.strictObject({
  ok: z.boolean().describe("true bila tidak ada error (peringatan boleh ada)"),
  rules: z.string().describe("Versi aturan pemeriksa"),
  kind: z.enum(CONTENT_KINDS).nullable(),
  section: z
    .strictObject({
      id,
      title_ar: z.string(),
      level: z.number().int().positive(),
      permalink: z.string(),
    })
    .nullable(),
  errors: z.array(contentIssue),
  warnings: z.array(contentIssue),
  facts: z
    .strictObject({
      source_sha256: sha256.describe("Sidik paragraf yang dirujuk; berubah = draf basi"),
      draft_sha256: sha256.describe("Sidik isi draf (format, jenis, edisi, bagian, versi, isi)"),
      anchored_passages: z.number().int().nonnegative().nullable(),
      body_passages: z.number().int().nonnegative().nullable(),
      coverage: z.number().min(0).max(1).nullable(),
      reading_minutes: z.number().int().positive().nullable(),
    })
    .nullable(),
  stamp: contentStamp.nullable().describe("Salin apa adanya ke periksa.kode bila ok"),
});
export type ContentCheck = z.infer<typeof contentCheck>;

// ── Calon Faedah (keluaran MCP `list_faedah_candidates`) ──────────────────────────────────────

export const FAEDAH_CANDIDATES_MAX = 60;

export const faedahCandidatesInput = z.strictObject({
  section_id: id.describe("Bagian (bab/sub-bab) yang paragrafnya dicari"),
  offset: z.number().int().min(0).max(10_000).default(0),
  limit: z.number().int().min(1).max(FAEDAH_CANDIDATES_MAX).default(30),
  include_ineligible: z
    .boolean()
    .default(false)
    .describe("true = sertakan paragraf yang tidak layak beserta alasannya"),
});
export type FaedahCandidatesInput = z.input<typeof faedahCandidatesInput>;

export const faedahCandidates = z.strictObject({
  section: z.strictObject({
    id,
    title_ar: z.string(),
    level: z.number().int().positive(),
    permalink: z.string(),
  }),
  /** Paragraf badan di bagian ini (layak saja, kecuali include_ineligible). */
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  next_offset: z.number().int().nonnegative().nullable(),
  candidates: z.array(
    z.strictObject({
      passage_id: id,
      anchor: z.string(),
      location,
      words: z.number().int().nonnegative().nullable(),
      eligible: z.boolean(),
      reasons: z.array(z.string()).describe("Alasan tidak layak (kosong = layak)"),
      translation: translationView
        .nullable()
        .describe("Terjemahan AI berlabel yang akan disalin kode"),
    }),
  ),
});
export type FaedahCandidates = z.infer<typeof faedahCandidates>;
