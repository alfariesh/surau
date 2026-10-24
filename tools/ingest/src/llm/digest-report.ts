// Laporan pilot Intisari (X15b langkah 7): data/reports/ihya-9472-intisari.md (angka saja, tanpa teks
// kitab; di-commit) dan halaman QA pemilik data/build/llm/intisari/qa/intisari-<node>.html (T-31,
// berisi teks Arab, TIDAK di-commit). Halaman QA: per gagasan Benar/Kurang/Salah + setia pada teks
// sumber, atribusi tepat, bebas nada fatwa, dan catatan; tersimpan di peramban (localStorage) dan
// disalin sebagai JSON untuk dikirim ke agent.
import { join } from "node:path";

import { costUsd, isModelId } from "@surau/llm";
import type { TranslationRow } from "@surau/db";

import { Freshness, titlesOf } from "./digest-batch.ts";
import type { DigestContext } from "./digest-batch.ts";
import {
  GLOSSARY_RUNS_FILE,
  acceptedGloss,
  GLOSSARY_FILE,
  glossaryRun,
  readDigestStore,
} from "./digest-store.ts";
import type { AcceptedDigest } from "./digest-store.ts";
import { digestCustomId, parseDigestCustomId } from "./digest-units.ts";
import type { DigestCorpus, DigestNodeUnit, DigestPlan } from "./digest-units.ts";
import { readBatches, readJsonl, writeText } from "./store.ts";
import { links } from "./work.ts";

const SITE = "https://surau.org";
const STANCE: Record<string, string> = {
  author: "pendapat al-Ghazali",
  reported: "yang ia nukil",
  refuted: "yang ia bantah",
};
const QUOTE_KIND: Record<string, string> = {
  text: "perkataan",
  report: "riwayat",
  poetry: "syair",
};
const usd = (n: number) => `$${n.toFixed(4)}`;
const words = (t: string) => t.trim().split(/\s+/u).filter(Boolean).length;

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Akhir kalimat di teks Arab/Latin (sama dengan pemecah blok), boleh diikuti tanda kutip/kurung. */
const SENTENCE_END = /[.!?:؟؛]["'»”)\]]*\s*$/u;

/** Kutipan terpotong: tidak mulai di awal paragraf/kalimat atau tidak berakhir di akhir kalimat. */
export function quoteTruncated(text: string, start: number, end: number): boolean {
  const starts = start === 0 || SENTENCE_END.test(text.slice(0, start));
  const ends = end === text.length || SENTENCE_END.test(text.slice(0, end));
  return !(starts && ends);
}

/** Urutan baca node (praurut dari akar cakupan), untuk laporan dan halaman QA. */
function preorder(plan: DigestPlan, rows: Pick<DigestCorpus, "toc_node">): DigestNodeUnit[] {
  const kids = new Map<number, number[]>();
  for (const n of rows.toc_node.toSorted((a, b) => a.ord - b.ord)) {
    if (n.parent_id !== null) kids.set(n.parent_id, [...(kids.get(n.parent_id) ?? []), n.id]);
  }
  const roots = rows.toc_node
    .filter((n) => plan.scope.has(n.id) && (n.parent_id === null || !plan.scope.has(n.parent_id)))
    .map((n) => n.id);
  const out: DigestNodeUnit[] = [];
  const visit = (id: number) => {
    const u = plan.nodeById.get(id);
    if (u !== undefined) out.push(u);
    for (const c of kids.get(id) ?? []) visit(c);
  };
  for (const r of roots) visit(r);
  return out;
}

function recordCost(r: AcceptedDigest): number {
  return isModelId(r.model) ? costUsd(r.model, r.usage, { batch: true }) : 0;
}

export async function runDigestReport(ctx: DigestContext, repo: string): Promise<number> {
  const { rows, plan, source } = await ctx.load();
  const store = readDigestStore(ctx.dir);
  const fresh = new Freshness(plan, store.accepted, titlesOf(rows));
  const nodes = preorder(plan, rows);
  const passages = new Map(rows.passage.map((p) => [p.id, p]));
  const lines: string[] = [
    "# Intisari: laporan pilot (X15b)",
    "",
    `Sumber korpus: ${source} · dibuat ${new Date().toISOString()} · node dalam cakupan: ${plan.scope.size}, dengan Intisari: ${plan.nodes.length}.`,
    "",
    "| Node | Tingkat | Asal | Status | Model | Gagasan | Kutipan | Istilah | Dibuang |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const n of nodes) {
    const r = fresh.record(n.customId);
    lines.push(
      `| ${n.tocNodeId} | ${n.tier} | ${n.basis} | ${r === null ? "belum" : "lolos"} | ${r?.model ?? ""} | ${r?.points.length ?? ""} | ${r?.quotes.length ?? ""} | ${r?.terms.length ?? ""} | ${r?.dropped.length ?? ""} |`,
    );
  }
  const current = [...store.accepted.values()].filter((r) => fresh.record(r.custom_id) !== null);
  const dropped = new Map<string, number>();
  for (const r of current) {
    for (const d of r.dropped) {
      const reason = d.reason.replace(/:.*$/u, "");
      dropped.set(reason, (dropped.get(reason) ?? 0) + 1);
    }
  }
  const failures = new Map<string, number>();
  for (const f of store.failures) {
    const p = parseDigestCustomId(f.custom_id);
    if (p === null || !plan.scope.has(p.tocNodeId)) continue;
    failures.set(f.reason, (failures.get(f.reason) ?? 0) + 1);
  }
  lines.push(
    "",
    "## Butir yang dibuang validator (hasil yang berlaku)",
    "",
    ...(dropped.size === 0
      ? ["Tidak ada."]
      : [...dropped].toSorted((a, b) => b[1] - a[1]).map(([k, n]) => `- ${k}: ${n}`)),
    "",
    "## Respons yang ditolak / gagal (semua percobaan)",
    "",
    ...(failures.size === 0
      ? ["Tidak ada."]
      : [...failures].toSorted((a, b) => b[1] - a[1]).map(([k, n]) => `- ${k}: ${n}`)),
  );

  // Ukuran blok (ADR-097 "Tinjau ulang bila"): kutipan terpotong atau > 300 karakter.
  const leafQuotes = current
    .filter((r) => r.stage === "leaf")
    .flatMap((r) => r.quotes)
    .map((q) => {
      const text = passages.get(q.passage_id)?.text_raw ?? "";
      return {
        long: q.char_end - q.char_start > 300,
        cut: quoteTruncated(text, q.char_start, q.char_end),
      };
    });
  const bad = leafQuotes.filter((q) => q.long || q.cut).length;
  lines.push(
    "",
    "## Ukuran blok",
    "",
    `Kutipan tahap leaf yang lolos: ${leafQuotes.length}; terpotong ${leafQuotes.filter((q) => q.cut).length}, > 300 karakter ${leafQuotes.filter((q) => q.long).length}; bermasalah ${bad} (${leafQuotes.length === 0 ? "–" : `${((bad / leafQuotes.length) * 100).toFixed(1)}%`}; ambang cadangan ADR-097: > 10%).`,
  );

  const batches = readBatches(ctx.dir);
  const glossRuns = readJsonl(join(ctx.dir, GLOSSARY_RUNS_FILE), glossaryRun);
  const batchCost = batches.reduce((a, b) => a + (b.usage?.costUsd ?? 0), 0);
  const glossCost = glossRuns.reduce((a, r) => a + r.cost_usd, 0);
  lines.push(
    "",
    "## Biaya aktual",
    "",
    "| Batch | Jenis | Model | Request | Biaya |",
    "|---|---|---|---|---|",
    ...batches.map(
      (b) =>
        `| ${b.name} | ${b.kind} | ${b.model} | ${b.requests} | ${b.usage === null ? "belum dikumpulkan" : usd(b.usage.costUsd)} |`,
    ),
    `| glosarium (API biasa) | definisi | ${[...new Set(glossRuns.map((r) => r.model))].join(", ")} | ${glossRuns.length} | ${usd(glossCost)} |`,
    "",
    `**Total: ${usd(batchCost + glossCost)}** (batch ${usd(batchCost)} + glosarium ${usd(glossCost)}); definisi glosarium berlaku: ${new Set(readJsonl(join(ctx.dir, GLOSSARY_FILE), acceptedGloss).map((g) => g.term_key)).size}.`,
  );

  const compare = nodes.filter((n) => n.tier === "book");
  if (compare.length > 0) {
    lines.push("", "## Intisari Kitab: Sonnet 5.5 dibanding Haiku 5.5", "");
    lines.push(
      "| Node | Model | Gagasan | Kata/gagasan | Kutipan | Istilah | Dibuang | Biaya |",
      "|---|---|---|---|---|---|---|---|",
    );
    for (const n of compare) {
      for (const id of [n.customId, digestCustomId(n.tocNodeId, "book-compare")]) {
        const r = fresh.record(id);
        if (r === null) continue;
        const avg = r.points.reduce((a, p) => a + words(p.body), 0) / r.points.length;
        lines.push(
          `| ${n.tocNodeId} | ${r.model} | ${r.points.length} | ${avg.toFixed(0)} | ${r.quotes.length} | ${r.terms.length} | ${r.dropped.length} | ${usd(recordCost(r))} |`,
        );
      }
    }
  }
  const report = join(repo, "data/reports/ihya-9472-intisari.md");
  writeText(report, `${lines.join("\n")}\n`);

  const qa = join(
    ctx.dir,
    "qa",
    `intisari-${[...plan.scope].sort((a, b) => a - b)[0] ?? "semua"}.html`,
  );
  writeText(qa, qaHtml(plan, rows, fresh, nodes));
  console.info(`Laporan: ${report}\nHalaman QA (T-31, tidak di-commit): ${qa}`);
  return 0;
}

function translationOf(
  rows: { translation?: readonly TranslationRow[] },
  passageId: number,
): string | null {
  const t = rows.translation?.find((x) => x.passage_id === passageId && x.lang === "id");
  return t === undefined
    ? null
    : t.text.replaceAll(/⟦QS (\d+:\d+(?:-\d+)?)⟧/gu, "[ayat QS $1, Kemenag]");
}

function qaHtml(
  plan: DigestPlan,
  rows: DigestCorpus & { translation?: readonly TranslationRow[] },
  fresh: Freshness,
  nodes: readonly DigestNodeUnit[],
): string {
  const link = links(rows);
  const passages = new Map(rows.passage.map((p) => [p.id, p]));
  const pages = new Map(rows.page.map((p) => [p.id, p]));
  const titleAr = new Map(rows.toc_node.map((n) => [n.id, n.title_ar]));
  const titles = titlesOf(rows);
  const where = (passageId: number) => {
    const p = passages.get(passageId);
    const pg = p === undefined ? undefined : pages.get(p.page_id);
    return pg === undefined ? `${passageId}` : `j. ${pg.juz} h. ${pg.page_no}`;
  };
  const arabic = (passageId: number, start: number, end: number) =>
    esc(passages.get(passageId)?.text_raw.slice(start, end) ?? "(paragraf tidak ada)");
  const items: { id: string; label: string; node: DigestNodeUnit; record: AcceptedDigest }[] = [];
  for (const n of nodes) {
    const main = fresh.record(n.customId);
    if (main !== null) items.push({ id: n.customId, label: "", node: n, record: main });
    if (n.tier === "book") {
      const cmp = fresh.record(digestCustomId(n.tocNodeId, "book-compare"));
      if (cmp !== null) {
        items.push({ id: cmp.custom_id, label: " · PEMBANDING (Haiku)", node: n, record: cmp });
      }
    }
  }
  let total = 0;
  const sections = items.map(({ id, label, node, record: r }) => {
    const head = `<h2 id="${esc(id)}">${esc(titles.get(node.tocNodeId) ?? "")}${esc(label)}</h2>
<p class="head" dir="rtl" lang="ar">${esc(titleAr.get(node.tocNodeId) ?? "")}</p>
<p class="meta">${node.tier === "book" ? "Intisari Kitab" : "Intisari Bab"} · asal ${node.basis} · ${esc(r.model)} · ${esc(r.prompt_version)} · <a href="${esc(SITE + link.section(node.tocNodeId))}">buka bagian</a></p>`;
    const frame = [
      r.opening === null ? "" : `<p><b>Pembuka.</b> ${esc(r.opening)}</p>`,
      `<p><b>Abstrak.</b> ${esc(r.abstract)}</p>`,
      r.closing === null ? "" : `<p><b>Penutup.</b> ${esc(r.closing)}</p>`,
    ].join("\n");
    const points = r.points
      .map((p) => {
        total++;
        const key = `${id}#g${p.ord}`;
        const anchors = p.anchors
          .map((a) => {
            const tr = translationOf(rows, a.passage_id);
            return `<div class="anchor"><p class="ar" dir="rtl" lang="ar">${arabic(a.passage_id, a.char_start, a.char_end)}</p>
<p class="meta"><a href="${esc(SITE + link.passage(a.passage_id))}">${where(a.passage_id)}</a>${tr === null ? "" : ` · <details><summary>terjemahan AI paragraf utuh</summary>${esc(tr)}</details>`}</p></div>`;
          })
          .join("\n");
        return `<section class="point" data-key="${esc(key)}">
<h3>${p.ord}. ${esc(p.title)}</h3>
<p class="meta">${STANCE[p.stance] ?? p.stance}${p.kind === "advice" ? " · anjuran penulis" : ""}</p>
<p>${esc(p.body)}</p>
${p.questions.length === 0 ? "" : `<p class="meta">Pertanyaan: ${p.questions.map(esc).join(" · ")}</p>`}
<details${node.tier === "book" ? "" : " open"}><summary>Dasar teks (${p.anchors.length})</summary>${anchors}</details>
<div class="rate">
${["Benar", "Kurang", "Salah"].map((v) => `<label><input type="radio" name="${esc(key)}" value="${v}"> ${v}</label>`).join(" ")}
<label><input type="checkbox" data-c="setia"> setia pada teks sumber</label>
<label><input type="checkbox" data-c="atribusi"> atribusi tepat</label>
<label><input type="checkbox" data-c="fatwa"> bebas nada fatwa</label>
<textarea placeholder="catatan (opsional)"></textarea>
</div></section>`;
      })
      .join("\n");
    const quotes = r.quotes
      .map(
        (
          q,
        ) => `<div class="quote"><p class="ar" dir="rtl" lang="ar">${arabic(q.passage_id, q.char_start, q.char_end)}</p>
<p>${esc(q.translation)}</p>
<p class="meta">${QUOTE_KIND[q.kind] ?? q.kind} · ${where(q.passage_id)} · gagasan ${q.point_ord ?? "–"} · terjemahan ${esc(q.model)} (${esc(q.prompt_version)})</p></div>`,
      )
      .join("\n");
    return `<article>${head}\n${frame}\n${points}\n${quotes === "" ? "" : `<h3>Kutipan pilihan</h3>${quotes}`}\n<p class="meta">Istilah: ${r.terms.join(", ") || "–"}${r.dropped.length === 0 ? "" : ` · dibuang validator: ${r.dropped.map((d) => esc(`${d.item} (${d.reason})`)).join("; ")}`}</p></article>`;
  });
  const storeKey = `surau-qa-intisari-${[...plan.scope].sort((a, b) => a - b)[0] ?? "x"}`;
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>QA Intisari pilot</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic&display=swap">
<style>
:root{--bg:#fbfaf6;--fg:#1f2a1c;--muted:#5d6b57;--line:#dcd8cc;--card:#f2efe6;--accent:#4f6b2f}
@media (prefers-color-scheme:dark){:root{--bg:#161a14;--fg:#e9eee4;--muted:#9fae97;--line:#333a2f;--card:#1f241c;--accent:#9cc06b}}
body{background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,sans-serif;margin:0 auto;max-width:860px;padding:16px}
article{border-top:2px solid var(--line);padding:12px 0}
h1{font-size:1.4rem}h2{font-size:1.2rem;margin:8px 0 0}h3{font-size:1.02rem;margin:8px 0 4px}
a{color:inherit}.meta{color:var(--muted);font-size:.85rem}
.ar,.head{font-family:"Noto Naskh Arabic","Amiri",serif;line-height:2.1}.ar{font-size:1.2rem;margin:4px 0}.head{color:var(--muted);margin:0}
.point{background:var(--card);border-radius:8px;padding:8px 12px;margin:10px 0}
.anchor,.quote{border-left:3px solid var(--line);padding-left:10px;margin:6px 0}
.rate{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin-top:6px}
.rate textarea{flex-basis:100%;min-height:2.4em;font:inherit;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:6px}
#bar{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:8px 0;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
button{font:inherit;padding:4px 12px;border-radius:6px;border:1px solid var(--accent);background:transparent;color:var(--fg)}
</style></head><body>
<h1>QA Intisari pilot (T-31)</h1>
<p>Nilai setiap gagasan: <b>Benar</b>, <b>Kurang</b>, atau <b>Salah</b>, lalu centang bila gagasan itu setia pada teks sumbernya, atribusinya tepat (pendapat al-Ghazali, yang ia nukil, atau yang ia bantah), dan bebas nada fatwa. "Dasar teks" adalah paragraf yang ditunjuk Intisari; teks Arabnya disalin dari kitab. Nilai tersimpan di peramban ini. Bila selesai, tekan <b>Salin hasil</b> dan tempel ke chat agent. Gerbang: paling banyak 5% gagasan "Salah".</p>
<div id="bar"><span id="count"></span><button type="button" id="copy">Salin hasil</button><button type="button" id="save">Unduh JSON</button></div>
${sections.join("\n")}
<script>
(function(){
  var KEY=${JSON.stringify(storeKey)}, TOTAL=${total};
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}}
  function save(d){try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){}}
  var data=load();
  function collect(){
    var out={};
    document.querySelectorAll(".point").forEach(function(s){
      var k=s.dataset.key, r=s.querySelector("input[type=radio]:checked"), o={};
      if(r)o.nilai=r.value;
      s.querySelectorAll("input[type=checkbox]").forEach(function(c){if(c.checked)o[c.dataset.c]=true});
      var t=s.querySelector("textarea").value.trim(); if(t)o.catatan=t;
      if(Object.keys(o).length)out[k]=o;
    });
    return out;
  }
  function render(){
    var d=collect(), n=0, salah=0;
    Object.keys(d).forEach(function(k){if(d[k].nilai){n++; if(d[k].nilai==="Salah")salah++}});
    document.getElementById("count").textContent=n+" dari "+TOTAL+" gagasan dinilai · Salah: "+salah+(n?" ("+(100*salah/n).toFixed(1)+"%)":"");
  }
  document.querySelectorAll(".point").forEach(function(s){
    var o=data[s.dataset.key]||{};
    s.querySelectorAll("input[type=radio]").forEach(function(r){r.checked=(o.nilai===r.value)});
    s.querySelectorAll("input[type=checkbox]").forEach(function(c){c.checked=!!o[c.dataset.c]});
    s.querySelector("textarea").value=o.catatan||"";
    s.addEventListener("change",function(){data=collect();save(data);render()});
    s.querySelector("textarea").addEventListener("input",function(){data=collect();save(data)});
  });
  function payload(){return JSON.stringify({halaman:KEY,dinilai:collect()},null,1)}
  document.getElementById("copy").addEventListener("click",function(){
    var p=payload();
    if(navigator.clipboard)navigator.clipboard.writeText(p).then(function(){alert("Hasil disalin. Tempel ke chat agent.")},function(){prompt("Salin teks ini:",p)});
    else prompt("Salin teks ini:",p);
  });
  document.getElementById("save").addEventListener("click",function(){
    var a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([payload()],{type:"application/json"}));
    a.download=KEY+".json"; a.click();
  });
  render();
})();
</script>
</body></html>
`;
}
