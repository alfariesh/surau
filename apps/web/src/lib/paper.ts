// Tekstur kertas ditunda pada kunjungan pertama (X09). Modul biasa (bukan "use client"): skripnya
// ditulis root layout sebagai <script> mentah di awal <body>, jadi dijalankan browser saat HTML
// diurai, sebelum isi halaman tampil (di titik yang sama dengan skrip tema next-themes). Bukan
// `<Script strategy="beforeInteractive">`: di App Router isinya baru dijalankan sesudah JS utama
// terunduh (`self.__next_s`), jauh sesudah cat pertama di ponsel.
//
// globals.css memasang mask `body::before` KECUALI <html> beratribut `data-kertas-tunda`:
// - Tile pernah terunduh di browser ini (penanda `localStorage`): skrip tidak berbuat apa-apa; tile
//   ada di cache (`/kertas/*` immutable), tekstur tampil sejak cat pertama.
// - Belum: atribut `data-kertas-tunda` dipasang sekarang; sesudah event `load` dan saat browser
//   senggang tile diunduh lewat `Image()` (mode CORS, sama dengan `mask-image`, supaya cache-nya
//   terpakai), lalu atribut dilepas + `data-kertas-masuk` (masuk halus 0,6 dtk) dan penanda disimpan.
//   Tile ±75 KB tidak lagi berebut jaringan dengan teks halaman di ponsel (LCP).
// - Tanpa JavaScript: atribut tidak pernah dipasang, tekstur tampil seperti sebelum X09.
// URL tile dibaca dari `--paper-mask` (satu sumber: globals.css, diperbarui `pnpm kertas`). Tanpa
// `localStorage` (mode privat/diblokir) tekstur muncul sesudah halaman dimuat di setiap kunjungan.

export const PAPER_KEY = "surau:kertas";

export const PAPER_SCRIPT = `(function(){var d=document.documentElement,k=${JSON.stringify(PAPER_KEY)};try{if(localStorage.getItem(k)==="1")return}catch(e){}d.setAttribute("data-kertas-tunda","");function show(){d.removeAttribute("data-kertas-tunda");d.setAttribute("data-kertas-masuk","")}function go(){var m=/url\\(["']?([^"')]+)/.exec(getComputedStyle(d).getPropertyValue("--paper-mask"));if(!m){show();return}var i=new Image();i.crossOrigin="anonymous";i.onload=function(){show();try{localStorage.setItem(k,"1")}catch(e){}};i.onerror=show;i.src=m[1]}function later(){(window.requestIdleCallback||function(f){setTimeout(f,200)})(go,{timeout:2000})}if(document.readyState==="complete")later();else addEventListener("load",later,{once:true})})();`;
