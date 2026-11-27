// Petunjuk identitas kitab untuk prompt ringkasan, versi 1 (ADR-152 tambahan). Prompt ringkasan
// dasar (`summarize-section@2`) menyebut Ihya' dan al-Ghazali, sehingga ringkasan kitab penulis
// lain sempat mengatribusikan isinya kepada al-Ghazali (at-Tibyan: 89 dari 119 ringkasan). Hanya
// dipasang untuk kitab yang memilihnya (`WorkConfig.llm.summaryNote`). Mengubah teks = versi baru.
import type { SummaryWorkNote } from "../src/summarize.ts";

function identity(id: string, kitab: string, author: string): SummaryWorkNote {
  return {
    id,
    text: `Petunjuk kitab ini (berlaku di atas identitas kitab yang disebut sebelumnya):
- Bagian yang diringkas berasal dari ${kitab}, bukan Ihya' 'Ulum ad-Din. Penulisnya ${author}, bukan al-Ghazali.
- Semua aturan atribusi untuk al-Ghazali berlaku untuk penulis ini: tulis "${author.split(" (")[0]} menjelaskan ...", "Menurut ${author.split(" (")[0]} ...", dan bedakan pendapatnya, pendapat yang ia nukil, dan pendapat yang ia bantah. Jangan menyebut al-Ghazali kecuali namanya ada di teks.
- Untuk ringkasan bahasa Inggris, atribusinya memakai nama penulis yang sama.`,
  };
}

export const SUMMARY_NOTES = {
  tibyan: identity("kitab-tibyan@1", "at-Tibyan fi Adab Hamalat al-Qur'an", "an-Nawawi (w. 676 H)"),
  waraqat: identity(
    "kitab-waraqat@1",
    "al-Waraqat, matan ushul fiqh",
    "Imam al-Haramain al-Juwaini (w. 478 H)",
  ),
  rusum: identity(
    "kitab-rusum@1",
    "Rusum Dar al-Khilafah, catatan tata cara istana khilafah Abbasiyah",
    "Hilal ash-Shabi' (w. 448 H)",
  ),
  hadhramiyyah: identity(
    "kitab-hadhramiyyah@1",
    "al-Muqaddimah al-Hadhramiyyah, matan fiqh ibadah mazhab Syafi'i",
    "Bafadl al-Hadrami (w. 918 H)",
  ),
  tarifat: identity(
    "kitab-tarifat@1",
    "at-Ta'rifat, kamus istilah",
    "asy-Syarif al-Jurjani (w. 816 H)",
  ),
  nihayah: identity(
    "kitab-nihayah@1",
    "Nihayat az-Zain, syarah Qurrat al-'Ain dalam fiqh mazhab Syafi'i",
    "Syaikh Nawawi al-Bantani (w. 1316 H)",
  ),
} as const;
