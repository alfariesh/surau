// Titik masuk Worker surau-api: HANYA ekspor bawaan (handler). workerd memperlakukan setiap ekspor
// bernama dari modul utama sebagai entrypoint, jadi konstanta/fungsi bantu (ANON_HEADER, createApp,
// dll.) tinggal di app.ts; `wrangler dev` menolak modul utama yang mengekspor nilai biasa.
export { default } from "./app.ts";
