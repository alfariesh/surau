// `pnpm t17 …` (X04): T-17 tahap 3 sesuai pra-registrasi data/reports/ihya-9472-t17-tahap3.md.
//   pnpm t17 sampel [--force]  → data/reviews/ihya-9472-t17-tahap3-sampel.json (ID saja, di-commit;
//                                menolak menimpa daftar yang sudah ada tanpa --force)
//   pnpm t17 halaman [--out f] → halaman nilai HTML lokal (teks kitab; data/build/llm/qa, git-ignored)
//   pnpm t17 hasil <a> [b]     → laporan dari hasil penilai (JSON "Unduh hasil" atau teks "Salin
//                                hasil"); dengan dua berkas: kesepakatan + kappa Cohen
//   --db <path>                → .sqlite korpus (bawaan: satu-satunya data/build/surau-corpus-*.sqlite)
// Halaman nilai BUTA: tanpa model, versi prompt, status koreksi, atau strata.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { ayahPlaceholderPattern } from "@surau/core";
import { QURAN_SOURCE } from "@surau/db";

import { assertWritable, openReadOnly } from "./sqlite.ts";
import {
  T17_CATEGORIES,
  T17_ORDER_SEED,
  T17_PER_STRATUM,
  T17_SEED,
  drawT17Sample,
  parseT17Grades,
  t17Agreement,
  t17Report,
  type T17Item,
  type T17Stratum,
} from "./t17.ts";

const repo = resolve(import.meta.dirname, "../../..");
const SAMPLE = join(repo, "data/reviews/ihya-9472-t17-tahap3-sampel.json");
const PAGE = join(repo, "data/build/llm/qa/t17-tahap3.html");
const EDITION = 1;
const SITE = "https://surau.org";

interface SampleFile {
  format: 1;
  corpus: string;
  seed: number;
  order_seed: number;
  per_stratum: number;
  population: Record<T17Stratum, number>;
  items: T17Item[];
}

function defaultDb(): string {
  const dir = join(repo, "data/build");
  const found = readdirSync(dir).filter((f) => /^surau-corpus-.+\.sqlite$/.test(f));
  if (found.length !== 1)
    throw new Error(`Pakai --db: data/build berisi ${found.length} korpus .sqlite`);
  return join(dir, found[0]!);
}

const esc = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function sample(dbPath: string, force: boolean): number {
  if (existsSync(SAMPLE) && !force) {
    console.error(
      `${SAMPLE} sudah ada (daftar pra-registrasi yang di-commit). Menarik ulang hanya dengan --force dan dicatat sebagai penyimpangan.`,
    );
    return 1;
  }
  const db = openReadOnly(dbPath);
  try {
    const corpus = String(
      db.prepare("SELECT value FROM meta WHERE key = 'corpus_version'").get()?.value ?? "?",
    );
    const population = db
      .prepare(
        `SELECT p.id AS passage, length(p.text_raw) AS length FROM translation t
         JOIN passage p ON p.id = t.passage_id WHERE t.lang = 'id' AND p.edition_id = ?`,
      )
      .all(EDITION)
      .map((r) => ({ passage: Number(r.passage), length: Number(r.length) }));
    const drawn = drawT17Sample(population);
    const file: SampleFile = {
      format: 1,
      corpus,
      seed: T17_SEED,
      order_seed: T17_ORDER_SEED,
      per_stratum: T17_PER_STRATUM,
      population: drawn.population,
      items: drawn.items,
    };
    writeFileSync(assertWritable(SAMPLE), `${JSON.stringify(file, null, 2)}\n`);
    console.info(
      `Populasi ${population.length} (${Object.entries(drawn.population)
        .map(([k, v]) => `${k} ${v}`)
        .join(", ")}), korpus ${corpus} → ${SAMPLE}`,
    );
    return 0;
  } finally {
    db.close();
  }
}

function readSample(): SampleFile {
  return JSON.parse(readFileSync(SAMPLE, "utf8")) as SampleFile;
}

function sampleHash(file: SampleFile): string {
  return createHash("sha256").update(JSON.stringify(file.items)).digest("hex").slice(0, 12);
}

/** Terjemahan bertanda → HTML: teks AI apa adanya, placeholder ayat = terjemahan Kemenag (tidak dinilai). */
function translationHtml(text: string, kemenag: (s: number, a: number) => string | null): string {
  let out = "";
  let at = 0;
  for (const m of text.matchAll(ayahPlaceholderPattern())) {
    const start = m.index ?? 0;
    out += esc(text.slice(at, start));
    const surah = Number(m[1]);
    const from = Number(m[2]);
    const to = m[3] === undefined ? from : Number(m[3]);
    const ayat: string[] = [];
    for (let a = from; a <= to; a++) ayat.push(kemenag(surah, a) ?? "(terjemahan tidak ada)");
    out += `<span class="ayah" title="Terjemahan Kemenag, tidak dinilai">QS ${surah}:${from === to ? from : `${from}-${to}`} · Kemenag (tidak dinilai): ${esc(ayat.join(" "))}</span>`;
    at = start + m[0].length;
  }
  return out + esc(text.slice(at));
}

function page(dbPath: string, out: string): number {
  const file = readSample();
  const db = openReadOnly(dbPath);
  try {
    const corpus = String(
      db.prepare("SELECT value FROM meta WHERE key = 'corpus_version'").get()?.value ?? "?",
    );
    if (corpus !== file.corpus) {
      console.error(
        `Korpus DB ${corpus} ≠ korpus daftar sampel ${file.corpus}: pakai --db korpus yang sama.`,
      );
      return 1;
    }
    // Hanya sumber terjemahan Kemenag (bukan transliterasinya), sama dengan halaman QA lama.
    const kemenagRows = db
      .prepare("SELECT surah, ayah, text FROM quran_translation WHERE source_id = ?")
      .all(QURAN_SOURCE.translation);
    const kemenagMap = new Map(
      kemenagRows.map((r) => [`${Number(r.surah)}:${Number(r.ayah)}`, String(r.text)]),
    );
    const kemenag = (s: number, a: number) => kemenagMap.get(`${s}:${a}`) ?? null;
    const row = db.prepare(
      `SELECT p.text_raw, t.text AS tr, pg.juz, pg.page_no FROM passage p
       JOIN translation t ON t.passage_id = p.id AND t.lang = 'id'
       JOIN page pg ON pg.id = p.page_id WHERE p.id = ?`,
    );
    const hash = sampleHash(file);
    const cats = Object.entries(T17_CATEGORIES)
      .map(([k, v]) => `<label><input type="checkbox" name="cat" value="${k}"> ${esc(v)}</label>`)
      .join(" ");
    const sections = file.items
      .map((it) => {
        const r = row.get(it.passage);
        if (r === undefined) throw new Error(`paragraf ${it.passage} tidak ada di korpus ini`);
        const anchor = `p${it.passage - EDITION * 10_000_000}`;
        const link = `${SITE}/kitab/ihya/${Number(r.juz)}/${Number(r.page_no)}#${anchor}`;
        return `<section class="item" data-no="${it.no}" id="n${it.no}">
<h2>${it.no}. <a href="${esc(link)}" target="_blank" rel="noopener">konteks di Surau ↗</a></h2>
<p class="ar" dir="rtl" lang="ar">${esc(String(r.text_raw))}</p>
<p class="id" lang="id">${translationHtml(String(r.tr), kemenag)}</p>
<fieldset><legend>Nilai nomor ${it.no}</legend>
<label><input type="radio" name="g${it.no}" value="B"> Benar</label>
<label><input type="radio" name="g${it.no}" value="K"> Kurang</label>
<label><input type="radio" name="g${it.no}" value="S"> Salah</label>
<div class="cats">${cats.replaceAll('name="cat"', `name="c${it.no}"`)}</div>
<label class="note">Catatan <textarea name="n${it.no}" rows="2"></textarea></label>
</fieldset></section>`;
      })
      .join("\n");
    const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>T-17 tahap 3 · Nilai terjemahan AI</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic&display=swap">
<style>
:root{--bg:#fbfaf6;--fg:#1f2a1c;--muted:#5d6b57;--line:#dcd8cc;--ayah:#e8f1e1;--accent:#3f6b4a}
@media (prefers-color-scheme:dark){:root{--bg:#161a14;--fg:#e9eee4;--muted:#9fae97;--line:#333a2f;--ayah:#24331f;--accent:#9fd2a8}}
body{background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,sans-serif;margin:0 auto;max-width:860px;padding:16px}
h1{font-size:1.4rem}h2{font-size:1rem;margin:0 0 6px}a{color:var(--accent)}
.item{border-top:1px solid var(--line);padding:14px 0}
.ar{font-family:"Noto Naskh Arabic","Amiri",serif;font-size:1.35rem;line-height:2.1;margin:0 0 8px}
.id{margin:0 0 8px}.ayah{background:var(--ayah);border-radius:4px;padding:1px 4px;font-size:.92em}
fieldset{border:1px solid var(--line);border-radius:10px;padding:8px 12px}legend{font-size:.85rem;color:var(--muted)}
fieldset label{margin-inline-end:14px;white-space:nowrap}.cats{font-size:.85rem;color:var(--muted);margin:6px 0}
.note{display:block;font-size:.85rem;color:var(--muted)}textarea{width:100%;font:inherit;color:inherit;background:transparent;border:1px solid var(--line);border-radius:6px}
.bar{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:8px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;z-index:1}
button{font:inherit;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:var(--bg);color:var(--fg);cursor:pointer}
.muted{color:var(--muted);font-size:.9rem}
</style></head><body>
<h1>T-17 tahap 3 · Nilai terjemahan AI Ihya (60 sampel)</h1>
<p>Untuk setiap nomor, baca teks Arab lalu terjemahan AI di bawahnya, dan pilih <b>Benar</b> (makna setia; gaya boleh kurang halus), <b>Kurang</b> (makna utama benar, tetapi ada yang janggal, istilah kurang tepat, atau bagian kecil hilang/bertambah tanpa membalik makna), atau <b>Salah</b> (makna keliru di bagian penting). Untuk Kurang dan Salah, centang kategorinya dan tulis catatan singkat bila perlu. Kotak hijau = terjemahan ayat Kemenag: <b>tidak dinilai</b>. Model dan versi terjemahan sengaja tidak ditampilkan. Isian tersimpan otomatis di browser ini, per nama penilai (penilai kedua: tekan <b>Penilai baru</b> lalu isi namanya); bila selesai (atau berhenti di tengah), tekan <b>Salin hasil</b> lalu tempel ke chat agent, atau <b>Unduh hasil</b>.</p>
<p class="muted">Sampel ${esc(hash)} · korpus ${esc(file.corpus)} · pra-registrasi: data/reports/ihya-9472-t17-tahap3.md · perkiraan 60–90 menit.</p>
<div class="bar"><label>Nama penilai <input id="rater" autocomplete="name"></label>
<span id="progress" class="muted"></span>
<button type="button" id="copy">Salin hasil</button><button type="button" id="download">Unduh hasil</button><button type="button" id="newrater">Penilai baru</button></div>
${sections}
<script>
const BASE = "surau:t17-tahap3:${hash}";
// Isian disimpan per nama penilai: penilai kedua di browser yang sama tidak melihat nilai penilai pertama.
const keyFor = (rater) => BASE + ":" + rater.trim().toLowerCase();
const items = [...document.querySelectorAll(".item")];
function collect() {
  return {
    sample: "${hash}",
    rater: document.getElementById("rater").value.trim(),
    grades: items.flatMap((s) => {
      const no = Number(s.dataset.no);
      const g = s.querySelector('input[type=radio]:checked');
      if (!g) return [];
      return [{ no, grade: g.value, categories: [...s.querySelectorAll('input[type=checkbox]:checked')].map((c) => c.value), note: s.querySelector("textarea").value.trim() }];
    }),
  };
}
const raterInput = document.getElementById("rater");
function clearForm() {
  for (const s of items) {
    for (const input of s.querySelectorAll("input")) input.checked = false;
    s.querySelector("textarea").value = "";
  }
}
function save() {
  const data = collect();
  const progress = document.getElementById("progress");
  progress.textContent = data.grades.length + "/" + items.length + " dinilai";
  if (!data.rater) { progress.textContent += " · isi nama penilai supaya tersimpan"; return; }
  try { localStorage.setItem(keyFor(data.rater), JSON.stringify(data)); localStorage.setItem(BASE + ":last", data.rater); } catch {}
}
// Penilai yang isiannya sedang tampil di formulir ("" = belum bernama, belum tersimpan).
let current = "";
function restore(rater) {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(keyFor(rater)) || "null"); } catch {}
  // Isian tanpa nama (sebelum nama diketik) ikut ke nama itu; isian penilai lain tidak.
  const keep = !data && current === "";
  current = rater;
  raterInput.value = rater;
  if (keep) return;
  clearForm();
  if (!data) return;
  for (const g of data.grades || []) {
    const s = document.getElementById("n" + g.no);
    if (!s) continue;
    const r = s.querySelector('input[type=radio][value="' + g.grade + '"]');
    if (r) r.checked = true;
    for (const c of g.categories || []) { const box = s.querySelector('input[type=checkbox][value="' + c + '"]'); if (box) box.checked = true; }
    s.querySelector("textarea").value = g.note || "";
  }
}
function asText(data) {
  return ["T-17 tahap 3 · sampel " + data.sample + " · penilai: " + (data.rater || "(tanpa nama)")]
    .concat(data.grades.map((g) => g.no + " " + g.grade + (g.categories.length ? " " + g.categories.join(",") : "") + (g.note ? " — " + g.note.replace(/\\s+/g, " ") : "")))
    .join("\\n");
}
document.addEventListener("input", (e) => { if (e.target !== raterInput) save(); });
document.addEventListener("change", (e) => { if (e.target !== raterInput) save(); });
// Ganti nama = ganti penilai: muat isian penilai itu (atau formulir kosong).
raterInput.addEventListener("change", () => { restore(raterInput.value.trim()); save(); });
document.getElementById("newrater").addEventListener("click", () => { clearForm(); current = ""; raterInput.value = ""; save(); raterInput.focus(); });
document.getElementById("copy").addEventListener("click", async () => {
  const text = asText(collect());
  try { await navigator.clipboard.writeText(text); alert("Hasil disalin. Tempel ke chat agent."); }
  catch { prompt("Salin teks ini:", text); }
});
document.getElementById("download").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(collect(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "t17-tahap3-hasil.json";
  a.click();
});
let lastRater = "";
try { lastRater = localStorage.getItem(BASE + ":last") || ""; } catch {}
restore(lastRater);
save();
</script>
</body></html>
`;
    const target = assertWritable(out);
    if (!existsSync(dirname(target))) mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, html);
    console.info(`Halaman nilai (${file.items.length} nomor, sampel ${hash}): ${target}`);
    return 0;
  } finally {
    db.close();
  }
}

function result(path: string, second: string | undefined): number {
  const file = readSample();
  const hash = sampleHash(file);
  const read = (f: string) => {
    const parsed = parseT17Grades(readFileSync(f, "utf8"));
    if (parsed.sample !== undefined && parsed.sample !== hash) {
      throw new Error(`${f}: hasil untuk sampel ${parsed.sample}, bukan ${hash}`);
    }
    return parsed;
  };
  const { rater, grades } = read(path);
  const r = t17Report(file.items, file.population, grades);
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const prop = (x: { p: number; lo: number; hi: number }) =>
    `${pct(x.p)} (${pct(x.lo)}–${pct(x.hi)})`;
  console.info(`Penilai: ${rater || "(tanpa nama)"} · dinilai ${r.graded}/${file.items.length}`);
  console.info("| Strata | n | Benar | Kurang | Salah |\n|---|---:|---|---|---|");
  for (const [k, s] of Object.entries(r.perStratum)) {
    const cells =
      s.n === 0 ? "– | – | –" : `${prop(s.benar)} | ${prop(s.kurang)} | ${prop(s.salah)}`;
    console.info(`| ${k} | ${s.n} | ${cells} |`);
  }
  // Estimasi tertimbang tanpa satu strata pun menyesatkan: tampilkan hanya bila semua strata terisi.
  const complete = Object.values(r.perStratum).every((s) => s.n > 0);
  console.info(
    complete
      ? `| **tertimbang** | ${r.graded} | ${prop(r.weighted.benar)} | ${prop(r.weighted.kurang)} | ${prop(r.weighted.salah)} |`
      : `| **tertimbang** | ${r.graded} | – (ada strata tanpa nilai) | – | – |`,
  );
  console.info(
    `Kategori: ${
      Object.entries(r.categories)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${T17_CATEGORIES[k as keyof typeof T17_CATEGORIES]} ${n}`)
        .join(", ") || "–"
    }`,
  );
  console.info(`Keputusan (aturan pra-registrasi): ${r.decision}`);
  if (second !== undefined) {
    const other = read(second);
    // Pra-registrasi: nomor 1–20 dinilai kedua penilai.
    const overlap = (g: typeof grades) => g.filter((x) => x.no <= 20);
    const a = t17Agreement(overlap(grades), overlap(other.grades));
    console.info(
      a === null
        ? "Kesepakatan: tidak ada nomor 1–20 yang dinilai keduanya."
        : `Kesepakatan ${rater || "penilai 1"} vs ${other.rater || "penilai 2"} (nomor 1–20, n=${a.n}): sama ${pct(a.agree)}, kappa Cohen ${a.kappa === null ? "–" : a.kappa.toFixed(2)}`,
    );
  }
  return 0;
}

function main(): number {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      db: { type: "string" },
      out: { type: "string" },
      force: { type: "boolean", default: false },
    },
  });
  const [cmd, arg, arg2] = positionals;
  if (cmd === "sampel") return sample(values.db ?? defaultDb(), values.force);
  if (cmd === "halaman") return page(values.db ?? defaultDb(), values.out ?? PAGE);
  if (cmd === "hasil" && arg !== undefined) return result(arg, arg2);
  console.error(
    "Pakai: pnpm t17 sampel [--force] | pnpm t17 halaman [--out berkas.html] | pnpm t17 hasil <berkas> [berkas penilai 2]",
  );
  return 2;
}

process.exitCode = main();
