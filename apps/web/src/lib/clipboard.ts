// Salin ke papan klip dari klien. Bila browser mendukung ClipboardItem, salin dua bentuk sekaligus:
// teks biasa (chat, catatan) dan HTML (dokumen: judul miring, tautan aktif). Melempar bila ditolak.
export async function copyRich(text: string, html: string): Promise<void> {
  if (typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function") {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
    return;
  }
  await navigator.clipboard.writeText(text);
}
