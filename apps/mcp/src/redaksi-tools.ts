// Tool tambahan endpoint `/redaksi` untuk plugin `surau-redaksi`: pemeriksa draf konten turunan
// (lapis 1 gerbang terbit) dan daftar calon Faedah (X23, ADR-125), serta bahan dan pemeriksa draf
// terjemahan Inggris per paragraf (X27, ADR-132). Deterministik, hanya membaca D1, tanpa LLM
// (docs/05 §11). `/mcp` publik tetap delapan tool; tool ini tidak didaftarkan di sana.
import {
  checkContentDraft,
  checkTranslationDraft,
  contentCheck,
  faedahCandidates,
  faedahCandidatesInput,
  listFaedahCandidates,
  listTranslationUnits,
  loadCiteContext,
  translationDraftCheck,
  translationUnits,
  translationUnitsInput,
} from "@surau/core";
import { PAGE_STRIDE } from "@surau/db";
import type { D1Db } from "@surau/db";
import { z } from "zod";

import { TOOLS, defineTool } from "./tools.ts";
import type { McpTool } from "./tools.ts";

/** Lisensi + atribusi edisi pemilik sebuah node daftar isi (node id = edition_id·10⁵ + seq). */
async function editionSources(db: D1Db, sectionId: number | undefined) {
  if (sectionId === undefined) return [];
  return [(await loadCiteContext(db, Math.floor(sectionId / PAGE_STRIDE))).source];
}

export const REDAKSI_EXTRA_TOOLS: readonly McpTool[] = [
  defineTool({
    name: "check_content_draft",
    title: "Check a content draft",
    description:
      "Check a derived-content draft (format surau-konten/1: intisari-bab, intisari-kitab, faedah, jalur) against the Surau content standard and the corpus: schema, language rules (no Arabic letters, attribution not rulings, no hadith status, no ayah paraphrase), lengths, passage ids inside the section, quotation offsets on word boundaries (no ayah, no very weak or baseless report), glossary terms, Faedah eligibility and Jalur days. Returns ok, errors and warnings with a path, facts (source and draft hashes, anchor coverage, reading minutes) and, when ok, a stamp to copy into periksa.kode. Never echoes the draft. · Periksa draf konten turunan terhadap standar dan korpus; bila lolos, salin stamp ke periksa.kode.",
    input: z.strictObject({
      draft: z
        .record(z.string(), z.unknown())
        .describe("The whole draft object (surau-konten/1), as it will be saved"),
    }),
    output: contentCheck,
    run: async (args, db) => {
      const view = await checkContentDraft(db, args.draft);
      return { view, sources: await editionSources(db, view.section?.id) };
    },
  }),

  defineTool({
    name: "list_faedah_candidates",
    title: "Faedah candidates",
    description:
      "List passages of a section that may become a Faedah (one passage per post): body passages in reading order with their labelled AI translation (copied by code into the post, never retyped), word count and eligibility. Ineligible reasons are codes: faedah_ayah, faedah_footnote (hadith markers; v1 whitelist excludes them), faedah_not_author (an Intisari marks it as a quoted or refuted view), faedah_translation_length, faedah_no_translation, faedah_needs_review. Paginate with offset/next_offset. · Daftar paragraf calon Faedah beserta terjemahan AI berlabel dan alasan layak/tidak.",
    input: faedahCandidatesInput,
    output: faedahCandidates,
    run: async (args, db) => {
      const view = await listFaedahCandidates(db, args);
      return { view, sources: await editionSources(db, view.section.id) };
    },
  }),

  defineTool({
    name: "list_translation_units",
    title: "Passages to translate",
    description:
      "List the body passages of a section (and its sub-sections) in reading order as translation units for an English paragraph translation (format surau-terjemah/1): the Arabic source with every Quran quotation replaced by a placeholder ⟦QS s:a⟧ (never translate an ayah; copy each placeholder exactly once), footnote marker digits to keep as (١), the Arabic heading path and the previous passage as context only, and whether the passage is blocked (skip it) or already translated. Paginate with offset/next_offset. · Bahan terjemahan Inggris per paragraf: teks Arab dengan ayat diganti placeholder.",
    input: translationUnitsInput,
    output: translationUnits,
    run: async (args, db) => {
      const view = await listTranslationUnits(db, args);
      return { view, sources: await editionSources(db, view.section.id) };
    },
  }),

  defineTool({
    name: "check_translation_draft",
    title: "Check a translation draft",
    description:
      "Check an English paragraph-translation draft (format surau-terjemah/1) with the same rules as the Surau translation batch: passages are body passages of the section, ayah placeholders exactly as in the source, footnote markers as Arabic digits (١), no Arabic letters, no Markdown, no translator notes or preambles, and a plausible length (warning only). Returns ok, errors and warnings with a path, facts (source and draft hashes) and, when ok, a stamp to copy into periksa.kode. Never echoes the draft. · Periksa draf terjemahan Inggris; bila lolos, salin stamp ke periksa.kode.",
    input: z.strictObject({
      draft: z
        .record(z.string(), z.unknown())
        .describe("The whole draft object (surau-terjemah/1), as it will be saved"),
    }),
    output: translationDraftCheck,
    run: async (args, db) => {
      const view = await checkTranslationDraft(db, args.draft);
      return { view, sources: await editionSources(db, view.section?.id) };
    },
  }),
];

/** Dua belas tool `/redaksi`: delapan tool baca publik + empat tool redaksi. */
export const REDAKSI_TOOLS: readonly McpTool[] = [...TOOLS, ...REDAKSI_EXTRA_TOOLS];
