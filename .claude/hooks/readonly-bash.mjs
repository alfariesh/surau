#!/usr/bin/env node
// Hook PreToolUse untuk subagen/skill yang hanya boleh MEMBACA (peninjau, posisi, docs-terbaru).
// Menerima JSON dari stdin, memeriksa tool_input.command, dan memblokir (exit 2) perintah yang
// bisa menulis. Aturannya sengaja ketat: setiap segmen perintah harus diawali perintah baca.
import { readFileSync } from "node:fs";

const ALLOWED_PREFIXES = [
  "git diff",
  "git log",
  "git show",
  "git status",
  "git branch --show-current",
  "git rev-list",
  "git ls-files",
  "git merge-base",
  "git blame",
  "grep",
  "rg",
  "cat",
  "head",
  "tail",
  "ls",
  "wc",
  "find",
  "sed -n",
  "sort",
  "uniq",
  "cut",
  "tr",
  "jq",
  "file",
  "stat",
  "du",
  "pwd",
  "echo",
  "date",
  "which",
  "npm view",
  "pnpm why",
  "pnpm list",
  "pnpm ls",
  "node -v",
  "node --version",
  "pnpm test",
  "pnpm run test",
  "pnpm check",
  "pnpm run check",
  "vp test",
  "vp check",
  "vp lint",
];
const FORBIDDEN = [
  />/,
  /\brm\b/,
  /\bmv\b/,
  /\bcp\b/,
  /\btee\b/,
  /-delete\b/,
  /-exec\b/,
  /sed\s+-i/,
  /--fix\b/,
  /\bgit\s+(add|commit|push|reset|checkout|switch|restore|stash|clean|merge|rebase)\b/,
];

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0); // input tak terbaca: biarkan aturan izin biasa yang memutuskan
}
const command = String(input?.tool_input?.command ?? "").trim();
if (!command) process.exit(0);

const block = (why) => {
  process.stderr.write(`Ditolak (mode hanya-baca): ${why}. Perintah: ${command}\n`);
  process.exit(2);
};

// Redireksi stderr yang aman (2>&1, 2>/dev/null) diabaikan sebelum memeriksa pola terlarang.
const probe = command.replace(/2>&1|2>\/dev\/null/g, "");
for (const re of FORBIDDEN) if (re.test(probe)) block(`pola terlarang ${re}`);

const segments = probe
  .split(/&&|\|\||;|\|/)
  .map((s) => s.trim())
  .filter(Boolean);
for (const seg of segments) {
  const cleaned = seg.replace(/^(cd\s+\S+\s*)/, "").trim() || seg;
  if (/^cd\s/.test(seg) && cleaned === seg && segments.length > 1) continue;
  if (!ALLOWED_PREFIXES.some((p) => cleaned === p || cleaned.startsWith(p + " "))) {
    block(`"${cleaned.split(/\s+/).slice(0, 2).join(" ")}" bukan perintah baca yang diizinkan`);
  }
}
process.exit(0);
