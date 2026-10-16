// Banding CSS global sebelum/sesudah perubahan impor HeroUI (ADR-035), per deklarasi.
//
//   pnpm --filter @surau/web build            # bundle sesudah, dipakai untuk menentukan kelas yang dipakai
//   node apps/web/scripts/heroui-css/banding-deklarasi.mjs <css-sebelum> <css-sesudah>
//
// CSS diambil dari apps/web/.next/static/chunks/*.css (berkas terbesar) dari dua build. Selektor
// dianggap "dipakai" bila semua kelasnya muncul sebagai token di bundle klien/server. Untuk selektor
// itu nilai tiap deklarasi harus sama, dan urutan relatifnya per layer+properti tidak boleh berubah.
// Variabel tema dan @keyframes yang hilang harus tidak dirujuk lagi oleh CSS sesudah.
import fs from "node:fs";
import path from "node:path";

import postcss from "postcss";

const web = path.join(import.meta.dirname, "../..");
const [beforeFile, afterFile] = process.argv.slice(2);
if (!beforeFile || !afterFile) {
  console.error("pakai: banding-deklarasi.mjs <css-sebelum> <css-sesudah>");
  process.exit(2);
}

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|html|rsc|body)$/.test(f)) out.push(p);
  }
  return out;
}
const bundle = [
  ...walk(path.join(web, ".next/static/chunks")),
  ...walk(path.join(web, ".next/server")),
]
  .map((f) => fs.readFileSync(f, "utf8"))
  .join("\n");
const tokens = new Set(bundle.match(/[A-Za-z0-9_-]+/g));

function splitSelectors(sel) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of sel) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
const classesIn = (sel) =>
  [...sel.matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)].map((m) => m[1].replace(/\\(.)/g, "$1"));
// Kelas utilitas Tailwind (berisi : / [ dll.) berasal dari @source, bukan HeroUI: dianggap dipakai.
const used = (sel) => classesIn(sel).every((c) => /[:/[\]().%]/.test(c) || tokens.has(c));

function load(file) {
  const decls = new Map();
  let pos = 0;
  postcss.parse(fs.readFileSync(file, "utf8")).walkDecls((d) => {
    const rule = d.parent;
    if (rule.type !== "rule") return;
    const ctx = [];
    for (let p = rule.parent; p && p.type !== "root"; p = p.parent) {
      if (p.type === "atrule")
        ctx.unshift(p.name === "layer" ? `@layer ${p.params}` : `@${p.name} ${p.params}`);
      else if (p.type === "rule") ctx.unshift(p.selector);
    }
    const layer =
      ctx
        .filter((c) => c.startsWith("@layer "))
        .map((c) => c.slice(7))
        .join(".") || "(none)";
    const where = ctx.filter((c) => !c.startsWith("@layer ")).join(" > ");
    for (const sel of splitSelectors(rule.selector)) {
      decls.set(`${layer} | ${where} | ${sel} | ${d.prop}`, {
        value: d.value + (d.important ? " !important" : ""),
        pos: pos++,
        layer,
        where,
        sel,
        prop: d.prop,
      });
    }
  });
  return decls;
}

const before = load(beforeFile);
const after = load(afterFile);
const afterCss = fs.readFileSync(afterFile, "utf8");
const oldBrowserFallback = (d) => d.where.startsWith("@supports (((-webkit-hyphens");
const missing = [];
const changed = [];
const groups = new Map();
for (const [key, b] of before) {
  if (!used(b.sel)) continue;
  const a = after.get(key);
  if (!a) {
    if (!oldBrowserFallback(b)) missing.push(b);
    continue;
  }
  if (a.value !== b.value) changed.push(`${key}\n    sebelum: ${b.value}\n    sesudah: ${a.value}`);
  const g = `${b.layer} | ${b.prop}`;
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push([b.pos, a.pos, key]);
}
const reordered = [];
for (const list of groups.values()) {
  list.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < list.length; i++) {
    if (list[i][1] < list[i - 1][1])
      reordered.push(`${list[i - 1][2]}\n    kini sesudah ${list[i][2]}`);
  }
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const missingVars = [...new Set(missing.filter((d) => d.layer === "theme").map((d) => d.prop))];
const missingKeyframes = [
  ...new Set(missing.map((d) => d.where.match(/^@keyframes (\S+)/)?.[1]).filter(Boolean)),
];
const stillUsedVars = missingVars.filter((v) => new RegExp(`var\\(${esc(v)}[,)]`).test(afterCss));
const stillUsedKeyframes = missingKeyframes.filter((k) =>
  new RegExp(`animation(?:-name)?\\s*:[^;}]*(?<![a-z0-9-])${esc(k)}(?![a-z0-9-])`).test(afterCss),
);
const missingRules = missing.filter(
  (d) => d.layer !== "theme" && !d.where.startsWith("@keyframes"),
);
const bySelector = new Map();
for (const d of missingRules) bySelector.set(d.sel, (bySelector.get(d.sel) ?? 0) + 1);

console.log(`deklarasi sebelum ${before.size}, sesudah ${after.size}`);
console.log(`nilai berubah: ${changed.length}`);
for (const c of changed.slice(0, 30)) console.log(`  ${c}`);
console.log(`urutan berubah: ${reordered.length}`);
for (const r of reordered.slice(0, 30)) console.log(`  ${r}`);
console.log(
  `variabel tema hilang: ${missingVars.length}, masih dirujuk var(): ${stillUsedVars.join(" ") || "-"}`,
);
console.log(
  `@keyframes hilang: ${missingKeyframes.length}, masih dirujuk: ${stillUsedKeyframes.join(" ") || "-"}`,
);
console.log(
  `aturan "dipakai" yang hilang (periksa: kelasnya benar-benar dirender?): ${bySelector.size} selektor`,
);
for (const [sel, n] of [...bySelector].sort((a, b) => b[1] - a[1]).slice(0, 80))
  console.log(`  ${n}x ${sel}`);
