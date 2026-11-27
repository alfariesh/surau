// Petunjuk terjemahan per kitab untuk at-Ta'rifat, versi 1 (Gelombang 2, ADR-152 tambahan; pola
// ADR-149). Ditambahkan di ujung prompt sistem terjemahan HANYA untuk kitab ini
// (`WorkConfig.llm.translateNote`), sehingga prompt, versi, dan cache kitab lain tidak berubah. Versi
// prompt yang dicatat menjadi `<prompt>+istilah-tarifat@1` (aturan teks-arab 8). Mengubah teks =
// versi baru (file baru).
//
// Isi pokok: identitas kitab (prompt dasar menyebut Ihya'), istilah yang didefinisikan ditulis
// sebagai transliterasi Latin di awal terjemahan (bukan huruf Arab; validator `arabic` menolaknya),
// dan atribusi "menurut ahli X" dipertahankan. Batas rasio panjang memakai bawaan sampai ada data.
import type { TranslateWorkNote } from "../src/translate.ts";

export const TRANSLATE_NOTE_TARIFAT_V1: TranslateWorkNote = {
  id: "istilah-tarifat@1",
  text: `Petunjuk kitab ini (berlaku di atas identitas kitab yang disebut sebelumnya):
- Paragraf yang diterjemahkan berasal dari at-Ta'rifat karya asy-Syarif 'Ali bin Muhammad al-Jurjani (w. 816 H), kamus definisi istilah berbagai ilmu (nahwu, sharaf, balaghah, 'arudh, mantiq, kalam, filsafat, ushul fiqh, fiqh, dan tasawuf) yang disusun menurut urutan huruf hijaiyah, bukan Ihya'. Semua perkataan di dalamnya adalah perkataan al-Jurjani, kecuali yang ia nisbatkan kepada golongan atau pendapat lain.
- Hampir setiap paragraf dimulai dengan istilah yang didefinisikan, lalu titik dua, lalu definisinya. Tulis istilah itu di awal terjemahan dalam transliterasi Latin sesuai harakat dan kata sandang di <teks> (misalnya al-ibtida', al-ijtihad, ijtima' as-sakinain), jangan dengan huruf Arab dan jangan diganti padanan Indonesianya saja. Padanan Indonesia yang tepat boleh ditambahkan sekali dalam kurung sesudahnya, lalu titik dua dan terjemahan definisinya. Contoh bentuk keluaran: al-ibtida' (permulaan): ...
- Bila satu paragraf memuat beberapa istilah atau beberapa definisi (misalnya "dan dikatakan ...", "dan menurut ahli ..."), pertahankan semuanya sesuai urutan di <teks>. "Wa qila" diterjemahkan "ada yang berpendapat" atau "dikatakan pula". Sebutan golongan seperti "menurut ahli nahwu", "dalam istilah ahli ushul", "menurut para sufi", "menurut ahli hakikat" wajib tetap disebut.
- Istilah ilmu lain di dalam definisi ditulis dengan istilah baku pesantren dalam transliterasi bila sudah lazim (misalnya isim, fi'il, mubtada', khabar, qiyas, 'illat, hukum syar'i, jauhar, 'aradh, maqam, hal), dengan padanan Indonesia dalam kurung saat pertama kali muncul bila membantu.
- Contoh kata, kalimat, wazan, dan pola 'arudh (misalnya fa'ilun, mustaf'ilun) ditulis dalam transliterasi Latin di dalam tanda kutip, satu per satu sesuai urutan di <teks>; jangan ditulis dengan huruf Arab. Nama golongan dan tokoh (misalnya al-Yunusiyyah, Yunus bin 'Abd ar-Rahman) ditulis dalam huruf Latin; "ashhabu fulan" diterjemahkan "pengikut fulan".
- Definisi adalah uraian al-Jurjani tentang makna istilah, bukan fatwa. Jangan menambah contoh, penjelasan, atau hukum yang tidak ada di <teks>.`,
};
