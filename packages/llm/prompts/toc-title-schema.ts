// Skema keluaran terstruktur judul daftar isi (X04 bagian B), dipakai semua versi prompt
// `translate-toc-title@N` (dipisah dari berkas prompt supaya versi lama bisa dihapus).
/** Keluaran terstruktur (`output_config.format`): array, karena kunci dinamis tidak didukung. */
export const TOC_TITLE_SCHEMA = {
  type: "object",
  properties: {
    judul: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          indonesia: { type: "string" },
        },
        required: ["id", "indonesia"],
        additionalProperties: false,
      },
    },
  },
  required: ["judul"],
  additionalProperties: false,
} as const;
