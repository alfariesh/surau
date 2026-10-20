import { feedbackStatus } from "@surau/db";
import { z } from "zod";

/** Aksi /admin (S20): satu perubahan per permintaan, divalidasi sebelum menyentuh DB. */
export const adminAction = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("jawab_enabled"), value: z.boolean() }),
  z.strictObject({ action: z.literal("budget"), usd: z.number().int().min(0).max(1000) }),
  z.strictObject({
    action: z.literal("quota"),
    anon: z.number().int().min(0).max(1000),
    ip: z.number().int().min(0).max(10_000),
  }),
  z.strictObject({
    action: z.literal("feedback_status"),
    id: z.number().int().positive(),
    status: feedbackStatus,
  }),
]);
export type AdminAction = z.infer<typeof adminAction>;
