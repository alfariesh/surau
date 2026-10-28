// Kriteria 5 (ADR-124): HTML Worker berpembungkus (worker.ts) = HTML Worker OpenNext asli, selain tag
// skrip yang dipindah. Supaya render ISR-nya sama, keduanya memakai state lokal yang sama, bergantian:
//   1. `wrangler dev .open-next/worker.js --port 3042`; simpan HTML: curl → $ASLI_DIR/asli_<jalur>.html
//   2. hentikan; `wrangler dev --port 3041` (main = worker.ts) dengan --persist-to yang sama
//   3. ASLI_DIR=… node banding-html.mjs
import { readFileSync } from "node:fs";
const DIR = process.env.ASLI_DIR;
const BUNGKUS = process.env.BUNGKUS ?? "http://localhost:3041";
const paths = ["/kitab/ihya/1/200", "/kitab/ihya/3/202", "/", "/tentang", "/cari", "/kitab"];
const attrs = String.raw`(?: [a-zA-Z-]+(?:="[^"]*")?)*`;
const asyncNext = new RegExp(
  String.raw`<script src="/_next/static/[^"]+"${attrs} async=""${attrs}></script>`,
  "g",
);
const preloadNext = new RegExp(
  String.raw`<link rel="preload" as="script"${attrs} href="/_next/static/[^"]+"${attrs}/>`,
  "g",
);
const loader =
  /<script>\(function\(\)\{var s=\[[\s\S]*?addEventListener\("load",go\)\}\)\(\);<\/script>/g;
let semua = true;
for (const p of paths) {
  const a = readFileSync(`${DIR}/asli${p.replaceAll("/", "_")}.html`, "utf8");
  const b = await (await fetch(BUNGKUS + p)).text();
  const ia = a.indexOf("</head>"),
    ib = b.indexOf("</head>");
  const headA = a.slice(0, ia),
    headB = b.slice(0, ib);
  const nAsync = (headA.match(asyncNext) ?? []).length,
    nPre = (headA.match(preloadNext) ?? []).length,
    nLoader = (headB.match(loader) ?? []).length;
  const normA = headA.replace(asyncNext, "").replace(preloadNext, "") + a.slice(ia);
  const normB = headB.replace(loader, "") + b.slice(ib);
  const sama = normA === normB;
  semua &&= sama && nLoader === 1;
  let beda = "";
  if (!sama) {
    let i = 0;
    while (i < normA.length && normA[i] === normB[i]) i++;
    beda = ` pertama beda di ${i}: asli «${normA.slice(i, i + 80)}» bungkus «${normB.slice(i, i + 80)}»`;
  }
  console.log(
    `${p}: ${sama ? "SAMA" : "BEDA"} (skrip async dipindah ${nAsync}, preload dihapus ${nPre}, pemuat ${nLoader}, panjang ${a.length}→${b.length})${beda}`,
  );
}
console.log(semua ? "HASIL: HTML sama selain tag skrip" : "HASIL: ada perbedaan");
