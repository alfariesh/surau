// Banding dua potret potret-gaya.mjs (ADR-035). Properti biasa harus 0 beda; properti kustom (--*)
// yang beda dilaporkan namanya dan dicek apakah masih dirujuk var() di CSS sesudah.
//
//   node apps/web/scripts/heroui-css/banding-gaya.mjs <sebelum.json> <sesudah.json> [css-sesudah]
import fs from "node:fs";

const [fileA, fileB, afterCssFile] = process.argv.slice(2);
if (!fileA || !fileB) {
  console.error("pakai: banding-gaya.mjs <sebelum.json> <sesudah.json> [css-sesudah]");
  process.exit(2);
}
const [a, b] = [fileA, fileB].map((f) => JSON.parse(fs.readFileSync(f, "utf8")));
const afterCss = afterCssFile ? fs.readFileSync(afterCssFile, "utf8") : "";
const cache = new Map();
// Urutan properti dari getComputedStyle bisa berbeda antar-muat; bandingkan isinya.
function parse(s) {
  let m = cache.get(s);
  if (!m) {
    m = new Map(
      s
        .split(";")
        .filter(Boolean)
        .map((x) => [x.slice(0, x.indexOf(":")), x.slice(x.indexOf(":") + 1)]),
    );
    cache.set(s, m);
  }
  return m;
}

let differences = 0;
let elements = 0;
const custom = new Set();
const samples = [];
for (const state of Object.keys(a)) {
  const A = a[state];
  const B = b[state];
  if (!B) {
    differences++;
    samples.push(`${state}: tidak ada di potret kedua`);
    continue;
  }
  const byKey = new Map(B.elems.map((e) => [e[0], e]));
  let stateDiff = 0;
  for (const ea of A.elems) {
    elements++;
    const eb = byKey.get(ea[0]);
    if (!eb) {
      stateDiff++;
      samples.push(`${state} elemen hilang: ${ea[0]}`);
      continue;
    }
    for (const [i, pseudo] of [
      [2, ""],
      [3, "::before"],
      [4, "::after"],
    ]) {
      if (A.styles[ea[i]] === B.styles[eb[i]]) continue;
      const pa = parse(A.styles[ea[i]]);
      const pb = parse(B.styles[eb[i]]);
      for (const k of new Set([...pa.keys(), ...pb.keys()])) {
        if (pa.get(k) === pb.get(k)) continue;
        if (k.startsWith("--")) custom.add(k);
        else {
          stateDiff++;
          if (samples.length < 40)
            samples.push(`${state} ${ea[0]}${pseudo} ${k}: ${pa.get(k)} → ${pb.get(k)}`);
        }
      }
    }
  }
  differences += stateDiff;
  console.log(`${stateDiff === 0 ? "SAMA" : "BEDA"}  ${state.padEnd(28)} ${A.elems.length} elemen`);
}
console.log(
  `\n${Object.keys(a).length} keadaan, ${elements} elemen: ${differences} beda properti tampilan`,
);
for (const s of samples) console.log(`  ${s}`);
const names = [...custom].sort((x, y) => x.localeCompare(y));
const referenced = names.filter(
  (n) => afterCss.includes(`var(${n})`) || afterCss.includes(`var(${n},`),
);
console.log(`properti kustom beda: ${names.length} (${names.join(" ")})`);
if (afterCssFile)
  console.log(`  masih dirujuk var() di CSS sesudah: ${referenced.join(" ") || "-"}`);
process.exitCode = differences === 0 && referenced.length === 0 ? 0 : 1;
