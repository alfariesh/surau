import { feedbackInput } from "@surau/db";
import { z } from "zod";

import { FEEDBACK_KINDS } from "./feedback";

// Body POST /api/feedback (batas sistem, KONVENSI §TypeScript). Pesan memakai aturan yang sama
// dengan `feedbackInput` @surau/db (1–2.000 karakter, tanpa karakter kontrol). Path hanya halaman
// kitab, tanpa query string/fragmen (P-7). `website` = honeypot: harus kosong untuk manusia.
export const feedbackRequest = z.strictObject({
  kind: z.enum(FEEDBACK_KINDS),
  message: feedbackInput.shape.message,
  path: z
    .string()
    .max(300)
    .regex(/^\/kitab\/[a-z0-9@%/-]+$/, "path harus halaman /kitab tanpa ? atau #"),
  passage_id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable().default(null),
  website: z.string().max(500).default(""),
});
export type FeedbackRequest = z.infer<typeof feedbackRequest>;
