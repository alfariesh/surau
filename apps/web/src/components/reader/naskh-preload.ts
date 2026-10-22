import { Noto_Naskh_Arabic } from "next/font/google";

// Preload Noto Naskh Arabic KHUSUS halaman baca (X09). Font Arab global (layout.tsx) sengaja tanpa
// preload karena tidak semua halaman berteks Arab; di halaman baca paragraf Arab pertama adalah
// elemen LCP, dan tanpa preload berkasnya baru ditemukan sesudah CSS terurai, lalu huruf cadangan
// berganti ke Naskh dan menggeser tata letak (CLS). Pemanggilan ini memakai opsi yang sama dengan
// layout.tsx, jadi berkas yang di-preload adalah berkas yang sama dengan `@font-face` global
// (subset "arabic" saja). `variable` dipasang di pembungkus halaman hanya supaya modul ini tidak
// dibuang bundler; nilainya sama dengan variabel global, jadi tampilan tidak berubah.
export const naskhPreload = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-naskh",
  display: "swap",
  preload: true,
});
