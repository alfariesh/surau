// Benchmark normalizeArabic (S05): target < 2 detik untuk 5 juta karakter di Node 24.
// Korpus sintetis deterministik (kata Arab bervokal + tanda baca + penanda catatan kaki), dipotong
// per paragraf ±300 karakter seperti pemakaian nyata. Bila drive Shamela terpasang, Ihya 9472
// (±5,5 juta karakter) juga diukur; hanya angka yang dicetak, tidak ada teks kitab.
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import { cleanShamelaHtml, normalizeArabic, stemText } from "@surau/text";

const TARGET_CHARS = 5_000_000;
const WORDS = [
  "الصَّبْرُ",
  "وَالْعِلْمُ",
  "قَالَ",
  "رَسُولُ",
  "اللَّهِ",
  "ﷺ",
  "فِي",
  "الدِّينِ",
  "مَسْئُولٌ",
  "(١)",
  "،",
  "إِنَّمَا",
];

function syntheticParagraphs(): string[] {
  const out: string[] = [];
  let total = 0;
  let seed = 1;
  while (total < TARGET_CHARS) {
    let p = "";
    while (p.length < 300) {
      seed = (seed * 16807) % 2147483647;
      p += `${WORDS[seed % WORDS.length]} `;
    }
    out.push(p);
    total += p.length;
  }
  return out;
}

function bench(label: string, paragraphs: string[]): void {
  const chars = paragraphs.reduce((s, p) => s + p.length, 0);
  // Pemanasan JIT, lalu ambil median dari 5 putaran.
  for (const p of paragraphs.slice(0, 2000)) normalizeArabic(p);
  const runs: number[] = [];
  for (let r = 0; r < 5; r++) {
    const t0 = performance.now();
    for (const p of paragraphs) normalizeArabic(p);
    runs.push(performance.now() - t0);
  }
  runs.sort((x, y) => x - y);
  const median = runs[2] as number;
  const t0 = performance.now();
  for (const p of paragraphs) stemText(normalizeArabic(p).text);
  const withStem = performance.now() - t0;
  const per5m = (median / chars) * 5_000_000;
  console.log(
    `${label}: ${chars.toLocaleString("id")} karakter, ${paragraphs.length.toLocaleString("id")} paragraf · ` +
      `normalize median ${median.toFixed(0)} ms (≈${(per5m / 1000).toFixed(2)} dtk per 5 juta) · ` +
      `normalize+stem ${withStem.toFixed(0)} ms`,
  );
  if (per5m >= 2000) process.exitCode = 1;
}

bench("sintetis", syntheticParagraphs());

const IHYA = "/Volumes/Elfariesh/database/book/472/9472.db";
if (existsSync(IHYA)) {
  const db = new DatabaseSync(IHYA, { readOnly: true });
  const rows = db.prepare("SELECT content FROM page").all() as unknown as {
    content: string | null;
  }[];
  db.close();
  const paragraphs = rows.flatMap((r) => cleanShamelaHtml(r.content ?? "").text.split("\r"));
  bench("Ihya 9472", paragraphs);
}
console.log(
  `Node ${process.versions.node} · ${process.exitCode === 1 ? "GAGAL (≥ 2 dtk)" : "lolos (< 2 dtk)"}`,
);
