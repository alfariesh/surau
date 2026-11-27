// Petunjuk identitas kitab Gelombang 2, versi 1 (ADR-152 tambahan; pola ADR-149). Prompt dasar
// terjemahan menyebut Ihya' dan al-Ghazali; untuk kitab penulis lain petunjuk ini menetapkan kitab,
// penulis, dan siapa yang berbicara. Hanya ditambahkan untuk kitab yang memilihnya
// (`WorkConfig.llm.translateNote`), jadi prompt dan cache kitab lain tidak berubah. Mengubah teks =
// versi baru (file baru).
import type { TranslateWorkNote } from "../src/translate.ts";

function identity(id: string, kitab: string, extra: string): TranslateWorkNote {
  return {
    id,
    text: `Petunjuk kitab ini (berlaku di atas identitas kitab yang disebut sebelumnya):
- Paragraf yang diterjemahkan berasal dari ${kitab}, bukan Ihya' 'Ulum ad-Din dan bukan karya al-Ghazali. Semua aturan tentang "perkataan al-Ghazali sendiri" berlaku untuk penulis kitab ini: jaga beda antara perkataan penulis, sabda Nabi, ucapan sahabat atau ulama, pendapat yang ia nukil, dan pendapat yang ia bantah. Jangan menyebut nama al-Ghazali kecuali ada di <teks>.
${extra}- Jangan menambah penjelasan, kaidah, atau rincian yang tidak ada di <teks>.`,
  };
}

export const TRANSLATE_NOTE_WARAQAT_V1 = identity(
  "kitab-waraqat@1",
  "al-Waraqat karya Imam al-Haramain al-Juwaini (w. 478 H), matan ringkas ushul fiqh mazhab Syafi'i",
  `- Istilah ushul fiqh ditulis dengan istilah baku pesantren dalam transliterasi (mis. wajib, mandub, mubah, mahzhur, makruh, shahih, bathil, 'amm, khashsh, mujmal, mubayyan, zhahir, mu'awwal, nasikh, mansukh, ijma', qiyas, ijtihad, mufti, mustafti); padanan Indonesia boleh ditambahkan sekali dalam kurung.
`,
);

export const TRANSLATE_NOTE_RUSUM_V1 = identity(
  "kitab-rusum@1",
  "Rusum Dar al-Khilafah karya Hilal ibn al-Muhassin ash-Shabi' (w. 448 H), catatan tata cara dan protokol istana khilafah Abbasiyah di Baghdad",
  `- Nama jabatan, gelar, pakaian, dan tempat istana ditulis dalam transliterasi (mis. wazir, hajib, khalifah, dar al-khilafah); padanan Indonesia boleh ditambahkan sekali dalam kurung. Nama orang dan tahun disalin apa adanya.
`,
);

export const TRANSLATE_NOTE_HADHRAMIYYAH_V1 = identity(
  "kitab-hadhramiyyah@1",
  "al-Muqaddimah al-Hadhramiyyah (Masa'il at-Ta'lim) karya Bafadl al-Hadrami (w. 918 H), matan fiqh ibadah mazhab Syafi'i",
  `- Ini teks fiqh yang ringkas: terjemahkan hukum apa adanya (wajib, sunnah, makruh, haram, sah, batal) tanpa menambah dalil atau pendapat lain. Istilah fiqh baku ditulis dalam transliterasi (mis. hadats, najis, istinja', tayammum, qullah, rak'ah, i'tidal, tasyahhud, nishab, haul, ihram, thawaf, sa'i); padanan Indonesia boleh ditambahkan sekali dalam kurung.
`,
);

export const TRANSLATE_NOTE_NIHAYAH_V1 = identity(
  "kitab-nihayah@1",
  "Nihayat az-Zain fi Irsyad al-Mubtadi'in karya Syaikh Muhammad Nawawi al-Bantani al-Jawi (w. 1316 H), syarah atas matan Qurrat al-'Ain karya Zain ad-Din al-Malibari dalam fiqh mazhab Syafi'i",
  `- Teks ini syarah: kata-kata matan Qurrat al-'Ain dan penjelasan Syaikh Nawawi bisa bercampur dalam satu paragraf; terjemahkan berurutan tanpa memisahkan atau menandainya, dan jangan menyebut sesuatu sebagai matan bila <teks> tidak jelas menandainya. Pendapat yang dinukil (mis. "qala fulan", "wa qila", "al-mu'tamad") tetap diatribusikan kepada pemiliknya. Istilah fiqh baku ditulis dalam transliterasi dengan padanan Indonesia boleh sekali dalam kurung.
`,
);
