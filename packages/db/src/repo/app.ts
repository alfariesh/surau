// Query DB app: sakelar dan laporan kesalahan. Input pengguna divalidasi Zod sebelum ditulis.
import type { D1Db } from "../d1.ts";
import { feedbackInput, settingRow, settingsValues } from "../schema/app.ts";
import type { FeedbackInput, Settings } from "../schema/app.ts";
import { allRows, firstRow } from "./rows.ts";
import { z } from "zod";

/** Semua sakelar yang dikenal, dengan tipe nilainya. Kunci yang hilang = error (migrasi rusak). */
export async function getSettings(db: D1Db): Promise<Settings> {
  const rows = await allRows(db.prepare("SELECT key, value, updated_at FROM settings"), settingRow);
  return settingsValues.parse(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}

/** Simpan laporan kesalahan; mengembalikan ID-nya. Melempar ZodError bila input tidak sah. */
export async function createFeedback(db: D1Db, input: FeedbackInput): Promise<number> {
  const f = feedbackInput.parse(input);
  const row = await firstRow(
    db
      .prepare(
        `INSERT INTO feedback (kind, passage_id, page_id, path, message, corpus_version)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      )
      .bind(f.kind, f.passage_id, f.page_id, f.path, f.message, f.corpus_version),
    z.strictObject({ id: z.number().int().positive() }),
  );
  if (row === null) throw new Error("INSERT feedback tidak mengembalikan id");
  return row.id;
}
