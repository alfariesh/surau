#!/usr/bin/env node
// Menjadikan satu figur aset Surau satu file HTML mandiri (mesin disisipkan, tanpa permintaan luar).
//
//   node .claude/skills/aset/skrip/bangun.mjs aset/figur/kitab-rehal.html [aset/keluaran/kitab-rehal.html]
//
// Figur memuat mesin dengan <script src="…/core.js"></script> selama dikerjakan; tag itu diganti
// isi .claude/skills/aset/mesin/core.js. Bawaan keluaran: aset/keluaran/<nama>.html.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const [src, outArg] = process.argv.slice(2);
if (!src) {
  console.error("pakai: node .claude/skills/aset/skrip/bangun.mjs <figur.html> [keluaran.html]");
  process.exit(1);
}
const out = outArg ?? join(root, "aset/keluaran", basename(src));
const page = readFileSync(src, "utf8");
const core = readFileSync(join(here, "../mesin/core.js"), "utf8");
const tag = /<script\s+src=["'][^"']*core\.js["']\s*>\s*<\/script>/.exec(page);
if (!tag) {
  console.error(`tidak ada <script src="…core.js"></script> di ${src}`);
  process.exit(1);
}
if (core.toLowerCase().includes("</script")) {
  console.error('core.js memuat "</script" dan tidak bisa disisipkan');
  process.exit(1);
}
const built =
  page.slice(0, tag.index) +
  "<script>\n" +
  core +
  "\n</script>" +
  page.slice(tag.index + tag[0].length);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, built);
console.log(`ditulis ${out} (${Math.round(built.length / 1024)} KiB)`);
