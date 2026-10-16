// Laporan markdown yang di-commit ke data/reports/. TANPA teks kitab: hanya angka, ID, dan rujukan
// juz/halaman. Isinya deterministik (tanpa jam, tanpa hash build) supaya membangun ulang tanpa
// perubahan sumber tidak mengubah laporan.
import type { MatanCheck, TakhrijCheck } from "./openiti/verify.ts";
import { MATAN_THRESHOLD, TAKHRIJ_THRESHOLD } from "./openiti/verify.ts";
import type { ParsedPage } from "./shamela/page.ts";
import type { LengthStats, Validation } from "./validate.ts";
import { LONG_INLINE_CHARS, cite } from "./validate.ts";
import type { WorkConfig } from "./works/ihya.ts";

const num = (n: number): string => n.toLocaleString("id-ID");
const dec = (n: number, digits = 3): string => n.toFixed(digits).replace(".", ",");
const list = (items: readonly string[]): string => (items.length === 0 ? "–" : items.join(", "));
const lengths = (s: LengthStats): string =>
  `${num(s.count)} paragraf; panjang (karakter) min ${num(s.min)} · median ${num(s.p50)} · p90 ${num(s.p90)} · p99 ${num(s.p99)} · maks ${num(s.max)}`;

export interface ReportContext {
  config: WorkConfig;
  sourceSha256: string;
  normVersion: number;
}

export function validationReport(ctx: ReportContext, v: Validation): string {
  const { config } = ctx;
  const lines = [
    `# Laporan validasi ingest: ${config.work.titleId} (Shamela ${config.shamelaBook})`,
    "",
    "> Dibuat otomatis oleh `pnpm ingest ihya` (`tools/ingest`, S07). Jangan disunting tangan.",
    "> Tanpa teks kitab: hanya angka, ID judul Shamela (`t<title.id>`), dan rujukan juz/halaman cetak.",
    "",
    `- Sumber: Shamela \`book/${String(config.shamelaBook % 1000).padStart(3, "0")}/${config.shamelaBook}.db\`, sha256 \`${ctx.sourceSha256}\``,
    `- Patch daftar isi: \`${config.patch}\` · peta ID: \`${config.ids}\``,
    `- Korpus: \`${config.corpusVersion}\` · NORM_VERSION ${ctx.normVersion}`,
    "",
    "## Invarian (ingest gagal bila ada yang ✗)",
    "",
    "| Invarian | Hasil | Rincian |",
    "|---|---|---|",
    ...v.invariants.map((i) => `| ${i.name} | ${i.ok ? "✓" : "✗"} | ${i.detail} |`),
    "",
    "## Daftar isi",
    "",
    `- ${num(v.toc.nodes)} node (${num(config.expect.titles)} judul Shamela + node patch); ${num(v.toc.patched)} node ditandai \`patched\`.`,
    `- Rub': ${v.toc.rub.map((r) => `t${r.title} (${r.at}) ${r.kitab} kitab`).join(" · ")}.`,
    `- Judul tanpa span di teks (dimulai di awal \`title.page\`): ${list(v.toc.spanless)}.`,
    `- Judul yang span-nya di halaman lain dari \`title.page\`: ${list(v.toc.pageMismatch.map((id) => `t${id}`))}.`,
    `- Judul yang dimulai di tengah paragraf (paragraf itu ikut node baru): ${num(v.toc.midParagraph)}.`,
    "",
    "## Paragraf",
    "",
    `- Badan: ${lengths(v.passages.body)}.`,
    `- Catatan kaki: ${lengths(v.passages.foot)}.`,
    `  - ${num(v.passages.footFromSection)} dari bagian bawah halaman (setelah \`_________\`), ${num(v.passages.footInline)} takhrij menempel yang dipotong dari badan.`,
    `  - ${num(v.passages.multiLineFoot)} catatan memanjang lebih dari satu baris (baris dipisah \`\\n\`).`,
    `- Tag HTML tak dikenal (dibiarkan sebagai teks): ${list(v.unknownTags)}.`,
    "",
    "## Penanda catatan kaki (١)",
    "",
    `- ${num(v.footnotes.refs)} penanda di badan teks; ${num(v.footnotes.linked)} tertaut ke catatan bernomor sama (\`footnote_ref\`).`,
    `- Penanda yatim (tanpa catatan): ${num(v.footnotes.orphanRefs.length)} ${v.footnotes.orphanRefs.length > 0 ? `(${list(v.footnotes.orphanRefs)})` : ""}`.trimEnd(),
    `- Catatan bernomor yang tidak dirujuk dari badan: ${num(v.footnotes.orphanNotes)}. Sebagian besar karena penandanya ikut terpotong bersama takhrij menempel.`,
    "",
    "## Takhrij yang menempel ke matan (`//`)",
    "",
    `- ${num(v.inline.pages)} halaman memuat \`//\` di badan teks.`,
    `- Takhrij sesudah \`//\`: ${num(v.inline.after)} · sebelum \`//\`: ${num(v.inline.before)} · tidak dikenali (paragraf tidak dipecah, \`inline_unsplit\`): ${num(v.inline.unsplit.length)} (${list(v.inline.unsplit)}).`,
    `- Akhir takhrij "sesudah \`//\`" tidak ditandai di sumber (juga tidak di OpenITI), jadi dipotong sampai akhir paragraf. ${num(v.inline.longAfter.length)} potongan ≥${LONG_INLINE_CHARS} karakter kemungkinan ikut membawa matan lanjutan: ${list(v.inline.longAfter)}.`,
    "- Semua potongan ditandai `takhrij_inline` di `passage_needs_review` untuk ditinjau manusia.",
    "",
    "## Ditandai perlu ditinjau (`passage_needs_review`)",
    "",
    "| Alasan | Paragraf |",
    "|---|---|",
    ...v.review.map((r) => `| \`${r.reason}\` | ${num(r.passages)} |`),
    `| **paragraf unik** | **${num(v.reviewPassages)}** |`,
    "",
  ];
  return lines.join("\n");
}

export function openitiReport(
  ctx: ReportContext,
  pages: readonly ParsedPage[],
  matan: MatanCheck,
  takhrij: TakhrijCheck,
): string {
  const { config } = ctx;
  const below = matan.ratios
    .map((r, i) => ({ r, p: pages[i] as ParsedPage }))
    .filter((x) => x.r < MATAN_THRESHOLD)
    .map((x) => `${cite(x.p)} (${dec(x.r)})`);
  const sorted = [...matan.ratios].sort((a, b) => a - b);
  const q = (f: number): number => sorted[Math.floor(f * (sorted.length - 1))] ?? 0;
  const buckets = new Map<string, number>();
  for (const s of takhrij.scores.flat()) {
    const b = Math.min(9, Math.floor(s * 10));
    const label = b === 9 ? "0,9–1,0" : `${dec(b / 10, 1)}–${dec((b + 1) / 10, 1)}`;
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }
  const inlineScores = pages.flatMap((p, pi) =>
    p.foot.flatMap((f, fi) => (f.line >= 0 ? [takhrij.scores[pi]?.[fi] ?? 0] : [])),
  );
  const gate = matan.passed >= config.expect.matanMinPages && matan.missing.length === 0;
  return [
    `# Laporan verify-openiti: ${config.work.titleId} (Shamela ${config.shamelaBook})`,
    "",
    "> Dibuat otomatis oleh `pnpm ingest:verify` / `pnpm ingest ihya` (`tools/ingest`, S07, ADR-018). Jangan disunting tangan.",
    "> Tanpa teks kitab: hanya angka dan rujukan juz/halaman cetak.",
    "",
    `- OpenITI rilis ${config.openiti.release}, repo \`OpenITI/0525AH\` commit \`${config.openiti.commit}\`.`,
    `- Matan: \`${config.openiti.matan.file}\` (sha256 \`${config.openiti.matan.sha256}\`, cocok).`,
    `- Takhrij: \`${config.openiti.takhrij.file}\` (sha256 \`${config.openiti.takhrij.sha256}\`, cocok).`,
    `- Pembanding: teks badan halaman Shamela (sebelum takhrij \`//\` dipisah) vs teks halaman OpenITI yang sama (penanda \`PageVxxPyyy\` di akhir halaman), keduanya \`normalizeArabic\` (NORM_VERSION ${ctx.normVersion}). Kemiripan = 2·LCS token / (jumlah token kedua sisi).`,
    "",
    "## Gerbang matan",
    "",
    `**${gate ? "LOLOS" : "GAGAL"}**: ${num(matan.passed)} dari ${num(pages.length)} halaman ≥${dec(MATAN_THRESHOLD, 2)} (gerbang ≥${num(config.expect.matanMinPages)}).`,
    "",
    `- Sebaran kemiripan: min ${dec(sorted[0] ?? 0)} · p1 ${dec(q(0.01))} · median ${dec(q(0.5))}.`,
    `- Halaman di bawah ambang: ${list(below)}.`,
    `- Halaman Shamela tanpa pasangan di OpenITI: ${num(matan.missing.length)}.`,
    "",
    "## Takhrij vs JK000001",
    "",
    `Setiap catatan kaki (termasuk takhrij menempel yang dipotong dari badan) dicocokkan dengan segmen takhrij JK000001 di halaman yang sama (potongan di antara \` + \` yang dibuka "حديث" atau menyebut sumbernya). Skor = bagian bigram token catatan yang ada di satu segmen. Skor <${dec(TAKHRIJ_THRESHOLD, 1)}, atau catatan kurang dari 3 token, ditandai \`takhrij_unmatched\`.`,
    "",
    `- ${num(takhrij.total)} catatan; **${num(takhrij.total - takhrij.unmatched)} cocok**, **${num(takhrij.unmatched)} ditandai \`takhrij_unmatched\`**.`,
    `- Di antaranya ${num(inlineScores.length)} takhrij menempel: ${num(inlineScores.filter((s) => s >= TAKHRIJ_THRESHOLD).length)} cocok, ${num(inlineScores.filter((s) => s < TAKHRIJ_THRESHOLD).length)} tidak.`,
    "",
    "| Skor | Catatan |",
    "|---|---|",
    ...[...buckets.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([b, n]) => `| ${b} | ${num(n)} |`),
    "",
  ].join("\n");
}
