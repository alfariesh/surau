// Kontrak eval S18 yang juga dapat dipakai pipeline S19. Teks Arab hanya lewat pointer DB.
import { z } from "zod";

const positive = z.number().int().positive();
const latin = (max: number) =>
  z
    .string()
    .max(max)
    .refine(
      (s) => !/\p{Script=Arabic}/u.test(s),
      "teks Arab hanya boleh diambil dari pointer sumber",
    );
export const sourceSpan = z
  .strictObject({
    passage_id: positive,
    char_start: z.number().int().nonnegative(),
    char_end: positive,
  })
  .refine((s) => s.char_end > s.char_start && s.char_end - s.char_start <= 2000);
export type SourceSpan = z.infer<typeof sourceSpan>;
export const evalLocation = z.union([
  z.strictObject({ toc_node_id: positive, label: z.string().regex(/^j\d+ h\d+$/u) }),
  z.strictObject({
    page_id: positive,
    sampai_page_id: positive.optional(),
    label: z.string().regex(/^j\d+ h\d+(?:–\d+)?$/u),
  }),
]);
export const ANSWER_KINDS = [
  "lokasi+isi",
  "topik tersebar",
  "status hadits",
  "di luar cakupan",
  "premis keliru",
  "atribusi",
] as const;
export const hadithGold = z.strictObject({
  passage_id: positive,
  footnote: sourceSpan,
  status: latin(120).min(1),
});
export const evalQuestion = z
  .strictObject({
    id: z.string().regex(/^[jp]\d{3}$/u),
    pertanyaan: latin(1000).min(1),
    kueri: latin(300).min(1),
    jenis: z.enum(ANSWER_KINDS),
    lokasi_benar: z.array(evalLocation).max(12),
    poin_kunci: z.array(latin(1000).min(1)).min(1).max(12),
    sumber: z.array(sourceSpan).max(12),
    wajib_ditolak: z.boolean(),
    hadits: z.array(hadithGold).max(5),
    catatan: latin(2000),
    disetujui_oleh: z.string().min(1).max(120).nullable(),
  })
  .refine((q) => q.wajib_ditolak || (q.lokasi_benar.length > 0 && q.sumber.length > 0))
  .refine((q) => q.jenis !== "status hadits" || q.hadits.length > 0);
export type EvalQuestion = z.infer<typeof evalQuestion>;
export const evalAnswer = z
  .strictObject({
    mode: z.enum(["empty", "search", "answer"]),
    text: latin(20000),
    refused: z.boolean(),
    citations: z.array(sourceSpan).max(20),
    // Sejak X06 setiap takhrij yang disitasi mendapat klaim (struktur), jadi batasnya = sitasi.
    hadith: z.array(hadithGold).max(20),
    model: z.string().min(1).max(80),
    prompt_version: z.string().min(1).max(80),
    latency_ms: z.number().finite().nonnegative(),
    cost_usd: z.number().finite().nonnegative(),
  })
  .refine((a) => !a.refused || a.text.trim().length > 0);
export type EvalAnswer = z.infer<typeof evalAnswer>;

export const judgeScores = z.strictObject({
  faithfulness: z.boolean(),
  attribution: z.boolean(),
  reason: latin(2000).min(1),
});
export type JudgeScores = z.infer<typeof judgeScores>;
