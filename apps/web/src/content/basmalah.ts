// Demo tipografi S04: basmalah (QS 1:1), teks Tanzil rasm Utsmani, verbatim. Diambil oleh skrip
// (bukan diketik model) lewat api.alquran.cloud edisi quran-uthmani, lalu dicocokkan sama persis
// dengan unduhan resmi tanzil.net "Tanzil Quran Text (Uthmani, Version 1.1)", baris 1|1, pada
// 2026-10-15. sha256 teks: ac1e6f8f64c2e83d0b5087625a5e1eb0067b99d4a8962d3ad30528709dcf3dd6.
// Syarat Tanzil: teks tidak boleh diubah, sumber disebut, dan ada tautan ke tanzil.net.
// S12 sengaja tetap memakai konstanta ini (bukan DB): halaman demo tidak boleh bergantung pada versi
// korpus. Sama persis dengan quran_ayah 1:1 (text_uthmani) korpus ihya-v3, dicek 2026-10-17.
export const BASMALAH = {
  text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  source: "Tanzil Quran Text (Uthmani, v1.1), CC BY 3.0",
  sourceUrl: "https://tanzil.net",
  ref: "QS al-Fatihah 1:1",
} as const;
