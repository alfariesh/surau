// Prompt terjemahan per paragraf, versi 6 (X21, ADR-109). Sama dengan v5 ditambah satu bagian
// "Keluaran bersih". Penyebabnya: dari 10.492 paragraf yang diterjemahkan ulang dengan v5, 72 tetap
// ditolak validator tiga kali, kebanyakan karena model menulis catatan atau koreksi diri di dalam
// keluaran ("Catatan: …", "Koreksi: … Berikut terjemahan yang benar"), kemungkinan dipicu perintah
// "periksa" di v5. v6 dipakai hanya untuk sisa itu (berkas `terjemahan-ulang.json` entri x21-sisa);
// versi baru juga memberi jatah percobaan baru (percobaan dihitung per versi prompt).
// Mengubah teks = versi baru (file baru).
import { TRANSLATE_PASSAGE_V5 } from "./translate-passage-v5.ts";

export const TRANSLATE_PASSAGE_V6 = {
  id: "translate-passage@6",
  system: `${TRANSLATE_PASSAGE_V5.system}

Keluaran bersih (v6):
- Semua pemeriksaan (pelaku, negasi, angka, kalimat terakhir, penanda) dilakukan sebelum menulis, bukan di dalam keluaran. Bila Anda menemukan kesalahan pada konsep Anda, perbaiki diam-diam dan tulis hanya hasil akhirnya.
- Keluaran tidak boleh memuat catatan, koreksi, alasan, "berikut terjemahan yang benar", dua versi terjemahan, atau penjelasan tentang pekerjaan Anda. Satu-satunya isi keluaran adalah terjemahan paragraf.
- Salin penanda catatan kaki hanya yang benar-benar ada di <teks>; jangan menambah penanda baru dan jangan menulis ulang kutipan ayat.`,
} as const;
