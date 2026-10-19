#!/usr/bin/env node
// Memotret satu figur dengan Chromium Playwright (yang sudah terpasang untuk e2e apps/web).
// Sumber di aset/figur/ dibangun dulu di memori, jadi token warna selalu dari globals.css terbaru.
//
//   node .claude/skills/aset/skrip/potret.mjs <figur.html> <keluar> [opsi]
//     <keluar>                              jalur tanpa ekstensi atau dengan .png/.jpg/.webp
//     --format webp,jpg                     format keluaran (bawaan: dari ekstensi, atau webp)
//     --query "tema=gelap&sematan=1"        parameter URL figur
//     --lebar 800 --tinggi 640              ukuran jendela (sampul=1 di query → bawaan 1200 x 630)
//     --skala 2                             device scale factor (sampul: bawaan 1)
//     --tunggu 1500                         milidetik sebelum memotret
//
// Font situs (Plus Jakarta Sans) dipasang dari apps/web/public/aset/fonts, tanpa internet.
// Mencetak galat skrip, berkas yang gagal dimuat, figur kosong, dan "NaN" di SVG; keluar dengan kode 2 bila ada.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { bangunHtml, root } from "./bangun.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    format: { type: "string" },
    query: { type: "string", default: "" },
    lebar: { type: "string" },
    tinggi: { type: "string" },
    skala: { type: "string" },
    tunggu: { type: "string", default: "1200" },
  },
});
const [src, outArg] = positionals;
if (!src || !outArg) {
  console.error(
    "pakai: node .claude/skills/aset/skrip/potret.mjs <figur.html> <keluar> [--format webp,jpg] [--query …]",
  );
  process.exit(1);
}
const ext = extname(outArg).slice(1);
const formats = (values.format ?? (["png", "jpg", "webp"].includes(ext) ? ext : "webp")).split(",");
const base = ["png", "jpg", "webp"].includes(ext) ? outArg.slice(0, -ext.length - 1) : outArg;
const sampul = new URLSearchParams(values.query).get("sampul") === "1";
const width = Number(values.lebar ?? (sampul ? 1200 : 800));
const height = Number(values.tinggi ?? (sampul ? 630 : 640));
const scale = Number(values.skala ?? (sampul ? 1 : 2));

// Figur sumber (memuat iso.js lewat <script src>) dibangun ke folder sementara di samping font-nya.
let page = resolve(src);
let tmp = null;
if (/<script\s+src=["'][^"']*iso\.js["']/.test(readFileSync(page, "utf8"))) {
  tmp = mkdtempSync(join(tmpdir(), "aset-"));
  page = join(tmp, basename(src));
  writeFileSync(page, bangunHtml(src));
}
const font = readFileSync(
  join(root, "apps/web/public/aset/fonts/plus-jakarta-sans-latin.woff2"),
).toString("base64");

const require = createRequire(join(root, "apps/web/package.json"));
const { chromium } = require("@playwright/test");
// Sesi cloud memasang Chromium di /opt/pw-browsers/chromium (versinya bisa beda dari Playwright);
// ASET_CHROMIUM menimpa jalur itu. Di laptop, Chromium bawaan Playwright yang dipakai.
const fallback = process.env.ASET_CHROMIUM ?? "/opt/pw-browsers/chromium";
const browser = await chromium.launch().catch((first) =>
  chromium.launch({ executablePath: fallback }).catch((second) => {
    throw new Error(
      `Chromium tidak bisa dijalankan.\n- Playwright: ${first.message}\n- ${fallback}: ${second.message}`,
    );
  }),
);
try {
  const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  // Galat sebelum mesin terpasang (jalur iso.js salah, galat sintaks) tidak sampai ke <html data-errors>,
  // jadi dicatat juga dari sisi browser. Font relatif (fonts/…) memang tidak ada di folder sementara.
  const pageErrors = [];
  tab.on("pageerror", (error) => pageErrors.push(error.message));
  tab.on("requestfailed", (request) => {
    if (!request.url().includes("/fonts/")) pageErrors.push(`gagal memuat ${request.url()}`);
  });
  await tab.goto(pathToFileURL(page).href + (values.query ? `?${values.query}` : ""));
  await tab.addStyleTag({
    content: `@font-face{font-family:'Plus Jakarta Sans';font-weight:400 800;src:url(data:font/woff2;base64,${font}) format('woff2')}`,
  });
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(Number(values.tunggu));
  const png = await tab.screenshot();
  const errors = await tab.evaluate(() => document.documentElement.dataset.errors ?? "");
  const art = await tab.evaluate(() => document.querySelector("#stage")?.innerHTML ?? null);
  const problems = [...pageErrors, errors.trim()].filter(Boolean);
  if (!art) problems.push("figur tidak tergambar (#stage kosong)");
  if (art?.includes("NaN")) problems.push("ada NaN di SVG");

  // WebP lewat sharp (dependensi Next); JPG/PNG langsung dari Chromium.
  const sharp = createRequire(require.resolve("next/package.json"))("sharp");
  for (const f of formats) {
    const out = `${base}.${f}`;
    if (f === "png") writeFileSync(out, png);
    else if (f === "jpg") await sharp(png).jpeg({ quality: 85, mozjpeg: true }).toFile(out);
    else if (f === "webp") await sharp(png).webp({ quality: 82 }).toFile(out);
    else throw new Error(`format tidak dikenal: ${f}`);
    console.log(`dipotret ${out} (${width}x${height} @${scale}x)`);
  }
  if (problems.length > 0) {
    console.error(`galat: ${problems.join(" · ")}`);
    process.exitCode = 2;
  }
} finally {
  await browser.close();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
