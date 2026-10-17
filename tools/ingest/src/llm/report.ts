// Laporan S13 (langkah 9–10): cakupan, kegagalan, biaya aktual vs estimasi, dan sampel QA T-17
// tahap 2. Laporan markdown di-commit (tanpa teks kitab: hanya angka, ID, dan permalink); halaman
// nilai HTML berisi teks Arab dan terjemahan, jadi hanya ditulis ke data/build/llm/qa (git-ignored).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  SUMMARY_PROMPT,
  TRANSLATE_PROMPT,
  emptyTotals,
  parseCustomId,
  passageCustomId,
} from "@surau/llm";
import { z } from "zod";

import { samplePages } from "../qa-sample.ts";
import type { LlmContext } from "./cli.ts";
import { kemenagLookup, reviewHtml } from "./review.ts";
import type { ReviewItem } from "./review.ts";
import { llmDir, readBatches, writeText } from "./store.ts";
import { buildWork, expectedIds, links } from "./work.ts";
import { readAccepted, unresolved } from "./batch.ts";

export const QA_SEED = 9473;
export const QA_SIZE = 20;
/** Situs produksi untuk tautan di laporan dan halaman tinjauan (domain sendiri sejak S16). */
export const SITE = "https://surau.org";

const num = (n: number) => n.toLocaleString("id-ID");
const pct = (a: number, b: number) =>
  b === 0 ? "–" : `${((a / b) * 100).toFixed(2).replace(".", ",")}%`;
const usd = (n: number) => `$${n.toFixed(4)}`;

function planEstimate(dir: string, round: number): Record<string, number> | null {
  const path = join(dir, `plan-r${round}.json`);
  if (!existsSync(path)) return null;
  const meta = z
    .looseObject({ total: z.looseObject({ costUsd: z.record(z.string(), z.number()) }) })
    .parse(JSON.parse(readFileSync(path, "utf8")));
  return meta.total.costUsd;
}

export async function runReport(ctx: LlmContext): Promise<number> {
  const dir = llmDir(ctx.repo);
  const rows = ctx.rows();
  const work = buildWork(rows);
  const acc = readAccepted(dir);
  const want = expectedIds(work);
  const link = links(rows);

  const tOk = [...work.units.values()].filter(
    (u) => acc.translations.get(u.passageId)?.source_sha256 === u.sourceSha256,
  );
  const finalOk = (lang: "id" | "en") =>
    want.summaryFinal.filter((s) => {
      if (s.lang !== lang) return false;
      const a = acc.final.get(`${s.tocNodeId}-${lang}`);
      const n = work.nodeById.get(s.tocNodeId);
      if (a === undefined || n === undefined) return false;
      const chunk = n.round2 ? null : n.subtree[0];
      return (
        a.source_sha256 ===
        (chunk === null || chunk === undefined ? n.sourceSha256 : chunk.sourceSha256)
      );
    }).length;
  const nodes = work.nodes.length;
  // Penyebut cakupan = paragraf badan termasuk yang terblokir (sama dengan invarian validate.ts).
  const needed = work.units.size + work.blocked.length;
  const stuck = unresolved(work, acc);
  const lastFailure = new Map(acc.failures.map((f) => [f.custom_id, f]));
  // Placeholder "berlebih" pada kegagalan terakhir paragraf yang belum lolos = tebakan model.
  const hints = [...stuck.keys()].flatMap((id) => {
    const p = parseCustomId(id);
    const f = lastFailure.get(id);
    if (p?.kind !== "passage" || f === undefined) return [];
    const refs = f.details
      .flatMap((d) => /berlebih \[([^\]]*)\]/.exec(d)?.[1]?.split(" ") ?? [])
      .filter((r) => r !== "");
    return refs.length === 0 ? [] : [{ passageId: p.passageId, refs }];
  });

  const batches = readBatches(dir);
  const total = emptyTotals();
  for (const b of batches) {
    if (b.usage === null) continue;
    total.requests += b.usage.requests;
    total.input_tokens += b.usage.input_tokens;
    total.output_tokens += b.usage.output_tokens;
    total.cache_read_input_tokens += b.usage.cache_read_input_tokens;
    total.cache_creation_input_tokens += b.usage.cache_creation_input_tokens;
    total.costUsd += b.usage.costUsd;
  }
  const est1 = planEstimate(dir, 1);
  const est2 = planEstimate(dir, 2);
  const sonnet = [...acc.translations.values(), ...acc.final.values()].filter((a) =>
    a.model.startsWith("claude-sonnet"),
  ).length;
  const markersMissing = [...acc.translations.values()].filter(
    (t) => t.markers_missing.length > 0,
  ).length;
  const refusals = acc.failures.filter((f) => f.reason === "refusal").length;
  // Koreksi tinjauan (X02): paragraf yang hasil lamanya ditolak peninjau lalu diulang ke Sonnet.
  const reviewed = new Set(
    acc.failures.filter((f) => f.reason === "review_rejected").map((f) => f.custom_id),
  );
  const sonnetReview = [...acc.translations.values()].filter(
    (t) => t.model.startsWith("claude-sonnet") && reviewed.has(passageCustomId(t.passage_id)),
  ).length;
  const byPrompt = new Map<string, number>();
  for (const t of acc.translations.values()) {
    byPrompt.set(t.prompt_version, (byPrompt.get(t.prompt_version) ?? 0) + 1);
  }
  const promptCounts = [...byPrompt]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([v, n]) => `\`${v}\` ${num(n)}`)
    .join(", ");

  // Sampel QA T-17 tahap 2: 20 paragraf acak (seed tetap) dari SEMUA paragraf badan, bukan dari
  // hasil yang lolos, supaya daftarnya tidak berubah tiap kali hasil dinilai ulang (X02: juga tidak
  // diganti paragraf lain bila terjemahannya ditolak/belum ada; nomor itu tampil kosong dan dinilai
  // sebagai kegagalan cakupan).
  const unitIds = [...work.units.keys()].toSorted((a, b) => a - b);
  const chosen = new Set(samplePages(unitIds, QA_SIZE, QA_SEED));
  const sample = [...chosen]
    .toSorted((a, b) => a - b)
    .flatMap((id) => {
      const u = work.units.get(id);
      return u === undefined ? [] : [u];
    });

  const lines = [
    "# Terjemahan dan ringkasan AI: Ihya' 'Ulum ad-Din (S13)",
    "",
    "> Dibuat otomatis oleh `pnpm llm report` (`tools/ingest/src/llm`). Tanpa teks kitab: hanya angka, ID, dan permalink.",
    "",
    `- Prompt terjemahan per hasil: ${promptCounts} (aktif untuk paragraf baru: \`${TRANSLATE_PROMPT.id}\`) · ringkasan \`${SUMMARY_PROMPT.id}\` (\`packages/llm/prompts/\`) · model Claude Haiku 5.5 (\`claude-haiku-5-5\`, effort low), ulangan Claude Sonnet 5.5 · Message Batches`,
    '- Ayat yang dikenali pencocok tidak diterjemahkan model: kutipannya dikirim sebagai placeholder `⟦QS s:a⟧` dan diganti terjemahan Kemenag saat tampil (ADR-020, ADR-040, ADR-042). Ayat yang luput dari pencocok bisa ikut diterjemahkan model (sisa risiko ADR-042; lihat "Kemungkinan ayat belum ditandai").',
    "",
    "## Cakupan",
    "",
    "| | Lolos | Dibutuhkan | Cakupan |",
    "|---|---|---|---|",
    `| Terjemahan paragraf badan | ${num(tOk.length)} | ${num(needed)} | ${pct(tOk.length, needed)} |`,
    `| Ringkasan final bahasa Indonesia | ${num(finalOk("id"))} | ${num(nodes)} | ${pct(finalOk("id"), nodes)} |`,
    `| Ringkasan final bahasa Inggris | ${num(finalOk("en"))} | ${num(nodes)} | ${pct(finalOk("en"), nodes)} |`,
    `| Ringkasan putaran 1 (potongan, 2 bahasa) | ${num(acc.r1.size)} | ${num(work.chunks.length * 2)} | ${pct(acc.r1.size, work.chunks.length * 2)} |`,
    "",
    `Dibuat Claude Sonnet 5.5: ${num(sonnet)} (termasuk ${num(sonnetReview)} terjemahan ulang dari koreksi tinjauan, \`data/reviews/\`; sisanya percobaan terakhir sesudah dua kali gagal, atau refusal Haiku). Penolakan model (refusal): ${num(refusals)}. Terjemahan tanpa penanda catatan kaki (diterima, dicatat; takhrij tetap tertaut di teks Arab): ${num(markersMissing)}. Paragraf yang tidak boleh dikirim (rujukan ayat tak bisa ditandai): ${num(work.blocked.length)}.`,
    "",
    `## Belum lolos (${num(stuck.size)})`,
    "",
    ...(stuck.size === 0
      ? ["Tidak ada."]
      : [
          "| custom_id | Percobaan | Refusal | Alasan terakhir | Tautan |",
          "|---|---|---|---|---|",
          ...[...stuck].slice(0, 300).map(([id, s]) => {
            const p = parseCustomId(id);
            const href =
              p?.kind === "passage"
                ? link.passage(p.passageId)
                : p?.kind === "toc"
                  ? link.section(p.tocNodeId)
                  : "";
            const last = lastFailure.get(id);
            return `| \`${id}\` | ${s.attempts} | ${s.refusal ? "ya" : "–"} | ${last?.reason.replace("invalid:", "") ?? ""} (${last?.model ?? ""}) | \`${href}\` |`;
          }),
        ]),
    "",
    `Terjemahan yang belum ada: ${num(needed - tOk.length)} paragraf (${pct(needed - tOk.length, needed)}), termasuk ${num(work.blocked.length)} yang terblokir.`,
    "",
    `## Kemungkinan ayat belum ditandai (${num(hints.length)})`,
    "",
    "Paragraf yang belum lolos karena model menulis placeholder ayat yang tidak ada di teks bertanda: model mengenali kutipan Qur'an yang luput dari pencocok (ejaan lain, lafaz berulang, ≤3 kata). Rujukan di sini tebakan model, **bukan** rujukan terverifikasi; bahan perbaikan pencocok (ADR-042) di sesi berikut.",
    "",
    ...(hints.length === 0
      ? ["Tidak ada."]
      : [
          "| Paragraf | Permalink | Placeholder tebakan model |",
          "|---|---|---|",
          ...hints.map(
            (h) => `| ${h.passageId} | \`${link.passage(h.passageId)}\` | ${h.refs.join(" ")} |`,
          ),
        ]),
    "",
    "## Biaya aktual (tarif batch, dari `usage`)",
    "",
    "| Batch | Request | Lolos / ditolak / gagal API | Input | Baca cache | Tulis cache | Keluaran | Biaya |",
    "|---|---|---|---|---|---|---|---|",
    ...batches.map(
      (b) =>
        `| ${b.name} (\`${b.id}\`) | ${num(b.requests)} | ${b.outcome === null ? "belum" : `${num(b.outcome.accepted)} / ${num(b.outcome.invalid)} / ${num(b.outcome.failed)}`} | ${num(b.usage?.input_tokens ?? 0)} | ${num(b.usage?.cache_read_input_tokens ?? 0)} | ${num(b.usage?.cache_creation_input_tokens ?? 0)} | ${num(b.usage?.output_tokens ?? 0)} | ${usd(b.usage?.costUsd ?? 0)} |`,
    ),
    `| **Total** | ${num(batches.reduce((a, b) => a + b.requests, 0))} | | ${num(total.input_tokens)} | ${num(total.cache_read_input_tokens)} | ${num(total.cache_creation_input_tokens)} | ${num(total.output_tokens)} | **${usd(total.costUsd)}** |`,
    "",
    `Biaya yang disetujui pemilik: ±$6 (batas berhenti $7,20). Estimasi rencana TERAKHIR (sisa yang dikirim saat itu; cache 95% / 50% / 0%): putaran 1 ${est1 === null ? "–" : ["0.95", "0.5", "0"].map((k) => usd(est1[k] ?? 0)).join(" / ")}; putaran 2 ${est2 === null ? "–" : ["0.95", "0.5", "0"].map((k) => usd(est2[k] ?? 0)).join(" / ")}.`,
    "",
    `## QA terjemahan: ${QA_SIZE} sampel acak (T-17 tahap 2)`,
    "",
    "Dinilai pemilik atau ustadz: **B**enar / **K**urang / **S**alah. Teks dan terjemahan ada di halaman nilai lokal (`data/build/llm/qa/review-batch.html`, tidak di-commit).",
    "",
    "| # | Paragraf | Permalink | Model | Nilai | Catatan |",
    "|---|---|---|---|---|---|",
    ...sample.map(
      (u, i) =>
        `| ${i + 1} | ${u.passageId} | \`${link.passage(u.passageId)}\` | ${acc.translations.get(u.passageId)?.model ?? ""} | | |`,
    ),
    "",
  ];
  writeText(join(ctx.repo, "data/reports/ihya-9472-terjemahan.md"), lines.join("\n"));

  const passages = new Map(rows.passage.map((p) => [p.id, p]));
  const items: ReviewItem[] = sample.map((u, i) => {
    const a = acc.translations.get(u.passageId);
    return {
      kind: "passage",
      no: i + 1,
      passageId: u.passageId,
      permalink: link.passage(u.passageId),
      heading: u.heading,
      arabic: passages.get(u.passageId)?.text_raw ?? "",
      translation: a?.text ?? "",
      model: a?.model ?? "",
      problems: [],
      note: u.masked.slots.length > 0 ? `${u.masked.slots.length} kutipan ayat` : "",
    };
  });
  // Contoh ringkasan (tidak dinilai skor T-17): rub' pertama (putaran 2, dari ±150 ringkasan) dan
  // empat simpul acak (seed tetap).
  const roots = rows.toc_node.filter((n) => n.parent_id === null).toSorted((a, b) => a.ord - b.ord);
  const others = work.nodes.filter((n) => !roots.some((r) => r.id === n.tocNodeId));
  const pickNodes = new Set(
    samplePages(
      others.map((n) => n.tocNodeId),
      4,
      QA_SEED,
    ),
  );
  const shown = [
    ...work.nodes.filter((n) => n.tocNodeId === roots[1]?.id),
    ...others.filter((n) => pickNodes.has(n.tocNodeId)),
  ];
  shown.forEach((n, i) => {
    const sid = acc.final.get(`${n.tocNodeId}-id`);
    const sen = acc.final.get(`${n.tocNodeId}-en`);
    items.push({
      kind: "summary",
      no: sample.length + i + 1,
      tocNodeId: n.tocNodeId,
      permalink: link.section(n.tocNodeId),
      heading: n.heading,
      chars: n.subtree.reduce((a, c) => a + c.text.length, 0),
      id: sid?.text ?? "",
      en: sen?.text ?? "",
      problems: [],
    });
  });
  if (items.length > 0) {
    writeText(
      join(dir, "qa", "review-batch.html"),
      reviewHtml(
        `QA terjemahan AI (T-17 tahap 2) · ${TRANSLATE_PROMPT.id}`,
        `${sample.length} paragraf acak dari hasil batch penuh (dinilai) dan ${items.length - sample.length} contoh ringkasan (tidak dinilai). Kotak hijau = terjemahan ayat Kemenag (bukan buatan AI). Beri nilai tiap nomor paragraf: <b>Benar</b>, <b>Kurang</b>, atau <b>Salah</b>, dengan catatan singkat.`,
        items,
        kemenagLookup(rows.quran_translation),
        SITE,
      ),
    );
  }
  console.info(
    `Laporan: data/reports/ihya-9472-terjemahan.md · terjemahan ${pct(tOk.length, needed)}, ringkasan ID ${pct(finalOk("id"), nodes)}, EN ${pct(finalOk("en"), nodes)} · biaya ${usd(total.costUsd)}`,
  );
  return 0;
}
