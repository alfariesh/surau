// Eksekusi statement + parse baris dengan Zod. Baris yang tidak cocok skema melempar ZodError:
// lebih baik gagal keras daripada menampilkan teks/sitasi dari baris yang salah bentuk.
import type { z } from "zod";

import type { D1Statement } from "../d1.ts";

export async function allRows<S extends z.ZodType>(
  stmt: D1Statement,
  schema: S,
): Promise<z.output<S>[]> {
  const { results } = await stmt.all();
  return results.map((row) => schema.parse(row));
}

export async function firstRow<S extends z.ZodType>(
  stmt: D1Statement,
  schema: S,
): Promise<z.output<S> | null> {
  const row = await stmt.first();
  return row === null ? null : schema.parse(row);
}
