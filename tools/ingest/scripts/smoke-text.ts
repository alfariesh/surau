// Bukti bahwa @surau/text bisa dipakai langsung oleh Node 24 lewat type stripping (tanpa build):
// paket workspace di-symlink pnpm ke packages/text (di luar node_modules), dan impor relatifnya
// berekstensi .ts. Dijalankan oleh `pnpm test` (root). Gagal = exit code 1.
import { NORM_VERSION, buildFtsMatch, findQuote, normalizeArabic, stemText } from "@surau/text";

const raw = "قَالَ رَسُولُ اللَّهِ ﷺ: الصَّبْرُ ضِيَاءٌ (١)";
const checks: [string, unknown, unknown][] = [
  ["NORM_VERSION", NORM_VERSION, 1],
  ["normalizeArabic", normalizeArabic(raw).text, "قال رسول الله صلي الله عليه وسلم الصبر ضياء"],
  ["stemText", stemText("والصبر ضياء"), "صبر ضياء"],
  ["findQuote", findQuote(raw, "الصبر ضياء")?.rawText, "الصَّبْرُ ضِيَاءٌ"],
  ["buildFtsMatch", buildFtsMatch("")?.length, undefined],
];
let failed = 0;
for (const [name, got, want] of checks) {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "GAGAL"} ${name}: ${String(got)}`);
}
console.log(
  `@surau/text smoke (Node ${process.versions.node}): ${failed === 0 ? "lolos" : `${failed} gagal`}`,
);
if (failed > 0) process.exitCode = 1;
