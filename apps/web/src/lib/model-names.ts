// Nama tampilan model AI untuk label "dibuat AI" (teks-arab.md aturan 8). ID yang tidak dikenal
// ditampilkan apa adanya, supaya label tetap jujur bila model baru dipakai sebelum daftar ini diubah.
const MODEL_NAMES: Record<string, string> = {
  "claude-haiku-5-5": "Claude Haiku 5.5",
  "claude-sonnet-5-5": "Claude Sonnet 5.5",
};

export function modelName(id: string): string {
  return MODEL_NAMES[id] ?? id;
}
