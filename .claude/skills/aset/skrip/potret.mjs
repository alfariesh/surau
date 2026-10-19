#!/usr/bin/env node
// Memotret satu figur dengan Chromium Playwright (yang sudah terpasang untuk e2e apps/web).
//
//   node .claude/skills/aset/skrip/potret.mjs <figur.html> <keluar.png> [opsi]
//     --query "tema=gelap&press=Buka@300"   parameter URL figur
//     --lebar 800 --tinggi 860              ukuran jendela (sampul=1 di query → bawaan 1200 x 630)
//     --skala 2                             device scale factor (sampul: bawaan 1)
//     --tunggu 1500                         milidetik sebelum memotret
//     --tanpa-font-web                      jangan muat Plus Jakarta Sans dari Google Fonts
//
// Mencetak galat skrip, berkas yang gagal dimuat, figur kosong, dan "NaN" di SVG; keluar dengan kode 2 bila ada.
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    query: { type: "string", default: "" },
    lebar: { type: "string" },
    tinggi: { type: "string" },
    skala: { type: "string" },
    tunggu: { type: "string", default: "1200" },
    "tanpa-font-web": { type: "boolean", default: false },
  },
});
const [src, out] = positionals;
if (!src || !out) {
  console.error(
    "pakai: node .claude/skills/aset/skrip/potret.mjs <figur.html> <keluar.png> [--query …]",
  );
  process.exit(1);
}
const sampul = new URLSearchParams(values.query).get("sampul") === "1";
const width = Number(values.lebar ?? (sampul ? 1200 : 800));
const height = Number(values.tinggi ?? (sampul ? 630 : 860));
const scale = Number(values.skala ?? (sampul ? 1 : 2));

const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=block";

const require = createRequire(new URL("../../../../apps/web/package.json", import.meta.url));
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
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  // Galat sebelum mesin terpasang (jalur core.js salah, galat sintaks) tidak sampai ke <html data-errors>,
  // jadi dicatat juga dari sisi browser.
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => pageErrors.push(`gagal memuat ${request.url()}`));
  const url = pathToFileURL(resolve(src)).href + (values.query ? `?${values.query}` : "");
  await page.goto(url);
  // Font situs (Plus Jakarta Sans) hanya dimuat saat memotret, supaya PNG sama dengan situs. File HTML
  // aset sendiri tidak pernah meminta apa pun ke luar. Gagal (luring) → font cadangan, tetap lanjut.
  if (!values["tanpa-font-web"]) {
    await page
      .addStyleTag({ url: FONT_CSS })
      .catch(() => console.error("font web gagal dimuat; pakai cadangan"));
    await page.evaluate(() => document.fonts.ready);
  }
  await page.waitForTimeout(Number(values.tunggu));
  await page.screenshot({ path: out });
  const errors = await page.evaluate(() => document.documentElement.dataset.errors ?? "");
  const art = await page.evaluate(() => document.querySelector("#art")?.innerHTML ?? null);
  const problems = [...pageErrors, errors.trim()].filter(Boolean);
  if (!art) problems.push("figur tidak tergambar (#art kosong)");
  if (art?.includes("NaN")) problems.push("ada NaN di SVG");
  console.log(`dipotret ${out} (${width}x${height} @${scale}x)`);
  if (problems.length > 0) {
    console.error(`galat: ${problems.join(" · ")}`);
    process.exitCode = 2;
  }
} finally {
  await browser.close();
}
