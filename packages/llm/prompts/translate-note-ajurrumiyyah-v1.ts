// Petunjuk terjemahan per kitab untuk al-Ajurrumiyyah, versi 1 (X31d, ADR-149). Ditambahkan di
// ujung prompt sistem terjemahan HANYA untuk kitab ini (`WorkConfig.llm.translateNote`), sehingga
// prompt, versi, dan cache kitab lain tidak berubah. Versi prompt yang dicatat menjadi
// `<prompt>+nahwu-ajurrumiyyah@1` (aturan teks-arab 8). Mengubah teks = versi baru (file baru).
//
// Isi pokok ADR-149: tanpa placeholder baru. Contoh Arab ditulis sebagai transliterasi Latin (bagian
// dari terjemahan AI, berlabel); huruf Arab tetap dilarang (validator `arabic` menolaknya); istilah
// nahwu memakai istilah baku pesantren dalam transliterasi.
import type { TranslateWorkNote } from "../src/translate.ts";

export const TRANSLATE_NOTE_AJURRUMIYYAH_V1: TranslateWorkNote = {
  id: "nahwu-ajurrumiyyah@1",
  // Batas rasio pemeriksa, bukan teks prompt (ADR-149 tambahan): daftar contoh tasrif yang
  // ditransliterasi + diartikan satu per satu terukur 4,6–5,5× teks Arabnya (40000056, 40000098).
  maxLengthRatio: 6,
  text: `Petunjuk kitab ini (berlaku di atas identitas kitab yang disebut sebelumnya):
- Paragraf yang diterjemahkan berasal dari al-Ajurrumiyyah karya Ibnu Ajurrum (w. 723 H), matan ringkas ilmu nahwu, bukan Ihya'. Semua perkataan di dalamnya adalah perkataan Ibnu Ajurrum kecuali bila ia menyebut contoh atau pendapat lain. Pembaca disapa "engkau".
- Contoh kata dan kalimat Arab (biasanya sesudah nahwu, mitsal, ka-qaulika, atau di dalam tanda kutip) jangan ditulis dengan huruf Arab dan jangan hanya diterjemahkan maknanya. Tulis transliterasi Latinnya persis sesuai harakat di <teks>, di dalam tanda kutip. Bila contoh itu kalimat atau frasa bermakna, artinya boleh ditambahkan sekali dalam kurung sesudahnya. Contoh bentuk keluaran: "ra'aitu abaka" (aku melihat ayahmu); "qama Zaidun" (Zaid telah berdiri).
- Daftar huruf, partikel, dan kata yang disebut sebagai bentuk (misalnya huruf jar, huruf 'athf, kata ganti, nama-nama perbuatan) ditulis dalam transliterasi, satu per satu, sesuai urutan di <teks>; jangan diterjemahkan.
- Istilah nahwu ditulis dengan istilah baku pesantren dalam transliterasi, misalnya: kalam, isim, fi'il, harf, i'rab, bina', raf', nashb, khafdh, jazm, marfu', manshub, makhfudh, majzum, dhammah, fathah, kasrah, sukun, tanwin, fa'il, na'ib al-fa'il, maf'ul bih, mubtada', khabar, na't, 'athf, taukid, badal, mashdar, zharf, hal, tamyiz, mustatsna, munada, maf'ul li-ajlih, maf'ul ma'ah, idhafah. Padanan Indonesia boleh ditambahkan sekali dalam kurung saat istilah itu pertama kali muncul di paragraf, misalnya i'rab (perubahan akhir kata).
- Jangan menambah contoh, penjelasan, atau kaidah yang tidak ada di <teks>.`,
};
