// Berkas draf terjemahan paragraf `surau-terjemah/1` (X27, ADR-132): terjemahan Inggris per paragraf
// yang ditulis lewat plugin `surau-redaksi` (langganan Claude, Sonnet) sebagai ganti batch API.
// Isinya hanya ID paragraf dan teks terjemahan (dengan placeholder ayat ⟦QS s:a⟧ dan penanda catatan
// kaki (١) yang sama dengan sumber); teks Arab tidak pernah ada di berkas (teks-arab.md aturan 1).
import { z } from "zod";

import { contentIssue, contentOrigin, contentReview, contentStamp } from "./content-schema.ts";
import { location } from "./schema.ts";

export const TRANSLATION_FORMAT = "surau-terjemah/1";
/** Versi aturan pemeriksa terjemahan; dicap di `periksa.kode.aturan`. */
export const TRANSLATION_RULES = "terjemah@1";
/** Bahasa terjemahan lewat plugin (bahasa Indonesia tetap dari batch, ADR-107/109). */
export const TRANSLATION_DRAFT_LANG = "en";
/** Paragraf per berkas: satu percakapan chat, ±satu halaman `list_translation_units`. */
export const TRANSLATION_DRAFT_MAX_ITEMS = 40;
/** Paragraf per halaman `list_translation_units`. */
export const TRANSLATION_UNITS_MAX = 40;
/** Terjemahan AI terpanjang Ihya (Indonesia) 7.966 karakter; Inggris diberi ruang sama. */
export const TRANSLATION_ITEM_MAX_CHARS = 12_000;

const id = z.number().int().positive();
const sha256 = z.string().regex(/^[0-9a-f]{64}$/u);

export const translationDraft = z.strictObject({
  format: z.literal(TRANSLATION_FORMAT),
  lang: z.literal(TRANSLATION_DRAFT_LANG),
  edition_id: id,
  /** Bagian sumber: paragraf berkas ini harus paragraf badan di bagian ini atau sub-bagiannya. */
  section_id: id,
  status: z
    .enum(["draf", "siap", "ditarik"])
    .describe("draf = belum lolos; siap = dimuat build berikutnya; ditarik = keluar"),
  tarik: z
    .strictObject({ alasan: z.string().trim().min(5).max(300), tanggal: z.iso.date() })
    .optional(),
  butir: z
    .array(
      z.strictObject({
        passage_id: id,
        teks: z.string().trim().min(1).max(TRANSLATION_ITEM_MAX_CHARS),
      }),
    )
    .min(1)
    .max(TRANSLATION_DRAFT_MAX_ITEMS),
  asal: contentOrigin,
  /** `mandiri`/`independen` menilai butir ke-n (urutan `butir`, mulai 1). */
  periksa: contentReview.default({ mandiri: [], independen: null, kode: null }),
});
export type TranslationDraft = z.infer<typeof translationDraft>;

export const translationDraftCheck = z.strictObject({
  ok: z.boolean().describe("true bila tidak ada error (peringatan boleh ada)"),
  rules: z.string(),
  section: z
    .strictObject({ id, title_ar: z.string(), level: z.number().int().positive() })
    .nullable(),
  errors: z.array(contentIssue),
  warnings: z.array(contentIssue),
  facts: z
    .strictObject({
      source_sha256: sha256.describe("Sidik teks sumber bertanda; berubah = terjemahan basi"),
      draft_sha256: sha256.describe("Sidik draf (format, bahasa, edisi, bagian, butir)"),
      items: z.number().int().nonnegative(),
    })
    .nullable(),
  stamp: contentStamp.nullable().describe("Salin apa adanya ke periksa.kode bila ok"),
});
export type TranslationDraftCheck = z.infer<typeof translationDraftCheck>;

export const translationUnitsInput = z.strictObject({
  section_id: id.describe("Section (chapter/sub-chapter) whose body passages to translate"),
  offset: z.number().int().min(0).max(10_000).default(0),
  limit: z.number().int().min(1).max(TRANSLATION_UNITS_MAX).default(20),
});
export type TranslationUnitsInput = z.input<typeof translationUnitsInput>;

export const translationUnits = z.strictObject({
  section: z.strictObject({ id, title_ar: z.string(), level: z.number().int().positive() }),
  total: z
    .number()
    .int()
    .nonnegative()
    .describe("Body passages in the section and its sub-sections"),
  offset: z.number().int().nonnegative(),
  next_offset: z.number().int().nonnegative().nullable(),
  units: z.array(
    z.strictObject({
      passage_id: id,
      location,
      heading: z.string().describe("Arabic heading path (context only, do not translate)"),
      previous: z
        .string()
        .nullable()
        .describe("Previous body passage of the same sub-section, masked (context only)"),
      source: z
        .string()
        .describe("Arabic text to translate, with ayat replaced by ⟦QS s:a⟧ placeholders"),
      placeholders: z.array(z.string()).describe("Placeholders that must appear exactly once each"),
      markers: z.array(z.string()).describe("Footnote marker digits, e.g. ١, to keep as (١)"),
      blocked: z
        .string()
        .nullable()
        .describe("Why this passage cannot be translated here (ayah not maskable); skip it"),
      translated_en: z.boolean().describe("An English translation is already in the corpus"),
    }),
  ),
});
export type TranslationUnits = z.infer<typeof translationUnits>;
