// Tekstur kertas ditunda pada kunjungan pertama (X09). Modul biasa (bukan "use client"): skripnya
// disisipkan root layout sebelum teks tampil, seperti preferensi pembaca (lib/reader/scale.ts).
//
// globals.css hanya memasang mask `body::before` bila <html> beratribut `data-kertas`:
// - Tile pernah terunduh di browser ini (penanda `localStorage`): atribut dipasang sekarang, sebelum
//   cat pertama, karena tile sudah di cache (`/kertas/*` immutable). Tekstur tampil sejak awal.
// - Belum: sesudah event `load` dan saat browser senggang, tile diunduh lewat `Image()` (mode CORS,
//   sama dengan `mask-image`, supaya cache-nya terpakai dan tidak diunduh dua kali); begitu siap,
//   atribut `data-kertas="baru"` dipasang (masuk halus 0,6 dtk) dan penanda disimpan. Tile ±75 KB
//   tidak lagi berebut jaringan dengan teks halaman di ponsel (LCP). Gagal unduh = tetap polos.
// URL tile dibaca dari `--paper-mask` (satu sumber: globals.css, diperbarui `pnpm kertas`). Tanpa
// `localStorage` (mode privat/diblokir) tekstur tetap muncul sesudah halaman dimuat.

export const PAPER_KEY = "surau:kertas";

export const PAPER_SCRIPT = `(function(){var d=document.documentElement,k=${JSON.stringify(PAPER_KEY)};try{if(localStorage.getItem(k)==="1"){d.setAttribute("data-kertas","");return}}catch(e){}function go(){var m=/url\\(["']?([^"')]+)/.exec(getComputedStyle(d).getPropertyValue("--paper-mask"));if(!m){d.setAttribute("data-kertas","");return}var i=new Image();i.crossOrigin="anonymous";i.onload=function(){d.setAttribute("data-kertas","baru");try{localStorage.setItem(k,"1")}catch(e){}};i.src=m[1]}function later(){(window.requestIdleCallback||function(f){setTimeout(f,200)})(go,{timeout:2000})}if(document.readyState==="complete")later();else addEventListener("load",later,{once:true})})();`;
