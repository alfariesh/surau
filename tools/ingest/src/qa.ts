// QA otomatis korpus D1 (S10 langkah 3): N halaman acak (seed tetap) dibandingkan byte demi byte
// dengan baris yang dibangun ulang dari sumber Shamela oleh pipeline ingest (pembersihan
// deterministik @surau/text), termasuk catatan kaki, tautan penanda, dan tanda perlu ditinjau.
//   pnpm run corpus:qa <versi>      DB surau-corpus-<versi> (remote, hanya baca) → laporan di data/reports/
//   pnpm run corpus:qa staging      surau-corpus-staging (hanya ke layar)
// Opsi: --n 30 · --seed 9472 · --human 10 (daftar QA manusia T-15, sekali tulis) · --surau <url dasar>
// Butuh drive Shamela (T-09) dan unduhan OpenITI (data/SOURCES.md).
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { footnoteRefRow, pageRow, passageNeedsReviewRow, passageRow } from "@surau/db";
import type { PageRow } from "@surau/db";

import { STAGING, query, remoteByName, repo, wrangler } from "./d1.ts";
import type { D1Target } from "./d1.ts";
import { expectedRows } from "./pipeline.ts";
import {
  bundlePages,
  comparePage,
  pickForHuman,
  samplePages,
  scanUrl,
  summarize,
} from "./qa-sample.ts";
import type { PageSummary, RowSet } from "./qa-sample.ts";
import { IHYA } from "./works/ihya.ts";

/** Pembaca yang bisa dibuka sebelum rilis Fase 1 (Preview tetap `pembaca`, data = build yang sama). */
const DEFAULT_SURAU = "https://pembaca-surau-web.alfarieshsalman.workers.dev";

function readRemote(target: D1Target, pageIds: readonly number[]): RowSet {
  const ids = pageIds.map((id) => String(Math.trunc(id))).join(", ");
  const inPages = `IN (${ids})`;
  return {
    page: query(
      target,
      `SELECT id, edition_id, seq, juz, page_no, source_page_id FROM page WHERE id ${inPages}`,
    ).map((r) => pageRow.parse(r)),
    passage: query(
      target,
      `SELECT id, edition_id, page_id, toc_node_id, kind, ord, text_raw FROM passage WHERE page_id ${inPages}`,
    ).map((r) => passageRow.parse(r)),
    footnote_ref: query(
      target,
      `SELECT f.passage_id, f.char_start, f.char_end, f.marker, f.footnote_passage_id
       FROM footnote_ref f JOIN passage p ON p.id = f.passage_id WHERE p.page_id ${inPages}`,
    ).map((r) => footnoteRefRow.parse(r)),
    passage_needs_review: query(
      target,
      `SELECT r.passage_id, r.reason
       FROM passage_needs_review r JOIN passage p ON p.id = r.passage_id WHERE p.page_id ${inPages}`,
    ).map((r) => passageNeedsReviewRow.parse(r)),
  };
}

interface Checked {
  page: PageRow;
  summary: PageSummary;
  diffs: string[];
}

function autoReport(args: {
  label: string;
  uuid: string;
  meta: Record<string, string>;
  seed: number;
  total: number;
  checked: Checked[];
  commit: string;
}): string {
  const ok = args.checked.filter((c) => c.diffs.length === 0).length;
  const lines = [
    `# QA otomatis korpus D1: Ihya' 'Ulum ad-Din (Shamela 9472)`,
    "",
    `> Dibuat oleh \`pnpm run corpus:qa\` (S10, \`tools/ingest/src/qa.ts\`). Tanpa teks kitab: hanya ID, jumlah, byte, dan sha256.`,
    "",
    `- DB: \`${args.label}\` (\`${args.uuid}\`) · korpus \`${args.meta.corpus_version ?? "?"}\` · built_at ${args.meta.built_at ?? "?"} · schema ${args.meta.schema_version ?? "?"} · NORM_VERSION ${args.meta.norm_version ?? "?"}`,
    `- Pembanding: sumber Shamela \`${args.meta.source_hash ?? "?"}\` diparse ulang oleh pipeline ingest pada commit \`${args.commit}\` (pembersihan deterministik \`@surau/text\`, peta ID \`data/ids/ihya-9472.json\`).`,
    `- Sampel: ${args.checked.length} dari ${args.total} halaman, acak dengan seed **${args.seed}** (mulberry32, Fisher–Yates parsial atas page.id terurut).`,
    "- Diperiksa per halaman: baris `page` (juz, halaman, `source_page_id`), setiap paragraf (id, jenis, urutan, node daftar isi, `text_raw` **byte demi byte** UTF-8), `footnote_ref` (offset, penanda, paragraf tujuan), dan `passage_needs_review`.",
    `- Dijalankan: ${new Date().toISOString().slice(0, 10)}`,
    "",
    `## Hasil: ${ok}/${args.checked.length} halaman cocok`,
    "",
    "| # | Juz | Hal. | page.id | Shamela | Badan | Cat. kaki | Penanda | Ditinjau | Byte | sha256 (12) | Hasil |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...args.checked.map(
      (c, i) =>
        `| ${i + 1} | ${c.page.juz} | ${c.page.page_no} | ${c.page.id} | ${c.page.source_page_id ?? "–"} | ${c.summary.body} | ${c.summary.foot} | ${c.summary.refs} | ${c.summary.review} | ${c.summary.bytes} | \`${c.summary.sha256.slice(0, 12)}\` | ${c.diffs.length === 0 ? "✓" : `✗ ${c.diffs.join("; ")}`} |`,
    ),
    "",
  ];
  return lines.join("\n");
}

function humanList(pages: Checked[], surau: string, seed: number): string {
  const lines = [
    "# QA manusia (T-15): 10 halaman Ihya dibandingkan dengan edisi cetak",
    "",
    `> Dibuat oleh \`pnpm run corpus:qa --human\` (S10) dari sampel QA otomatis (seed ${seed}); hanya halaman yang punya catatan kaki, bergiliran per jilid. Kolom **Hasil** diisi agent dari jawaban pemilik/ustadz.`,
    "",
    "Cara mencocokkan (±3 menit per halaman):",
    "",
    "1. Buka tautan **Surau** dan **Pindaian** (edisi cetak Dar al-Ma'rifah di archive.org) berdampingan. Bila pindaian meleset satu-dua halaman, geser dengan tombol panah; nomor halaman tercetak di pojok atas.",
    "2. Cocokkan teks utama (matan) dan catatan kaki takhrij (ketuk penanda (١) di Surau). Cukup periksa sekilas: ada kalimat yang hilang, terpotong, atau tertukar?",
    "3. Tautan **Shamela** adalah halaman yang sama di sumber digital; dipakai bila ragu apakah selisihnya dari Shamela atau dari Surau.",
    '4. Tulis "cocok" atau catatan singkat per nomor, lalu kirim ke agent.',
    "",
    "| # | Jilid/hal. | Surau | Shamela | Pindaian | Cat. kaki | Hasil |",
    "|---|---|---|---|---|---|---|",
    ...pages.map((c, i) => {
      const scan = scanUrl(IHYA, c.page.juz, c.page.page_no);
      return `| ${i + 1} | j${c.page.juz} h${c.page.page_no} | [buka](${surau}/kitab/ihya/${c.page.juz}/${c.page.page_no}) | [${c.page.source_page_id ?? "–"}](https://shamela.ws/book/${IHYA.shamelaBook}/${c.page.source_page_id ?? ""}) | ${scan === null ? "–" : `[jilid ${c.page.juz}](${scan})`} | ${c.summary.foot} | |`;
    }),
    "",
  ];
  return lines.join("\n");
}

function main(argv: string[]): number {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      n: { type: "string", default: "30" },
      seed: { type: "string", default: "9472" },
      human: { type: "string" },
      surau: { type: "string", default: DEFAULT_SURAU },
      shamela: { type: "string" },
    },
  });
  const arg = positionals[0];
  if (arg === undefined || !(arg === "staging" || /^[a-z][a-z0-9]*-v\d+$/.test(arg))) {
    console.error("Pakai: pnpm run corpus:qa <versi|staging> [--n 30] [--seed 9472] [--human 10]");
    return 2;
  }
  const n = Number(values.n);
  const seed = Number(values.seed);
  const shamela = resolve(
    values.shamela ?? process.env.SURAU_SHAMELA_ROOT ?? "/Volumes/Elfariesh/database",
  );
  if (!existsSync(join(shamela, "book"))) {
    console.error(`Data Shamela tidak ditemukan di ${shamela}. Pasang drive Shamela (T-09).`);
    return 1;
  }

  let target: D1Target;
  let uuid = "ffc5ce9a-2b5a-4d09-8487-922ff0e67827";
  let dispose = (): void => {};
  if (arg === "staging") {
    target = STAGING;
  } else {
    const name = `surau-corpus-${arg}`;
    const db = (
      JSON.parse(wrangler(["d1", "list", "--json"])) as { uuid: string; name: string }[]
    ).find((d) => d.name === name);
    if (db === undefined) {
      console.error(`${name} tidak ada di akun Cloudflare.`);
      return 1;
    }
    const t = remoteByName(name, db.uuid);
    target = t;
    uuid = db.uuid;
    dispose = t.dispose;
  }

  try {
    console.info("Membangun ulang baris harapan dari sumber Shamela…");
    const expected = expectedRows(IHYA, {
      repo,
      shamela,
      openiti: join(repo, "data/raw/openiti"),
      build: join(repo, "data/build"),
      migrations: join(repo, "packages/db/migrations/corpus"),
    });
    const sample = samplePages(
      expected.page.map((p) => p.id),
      n,
      seed,
    );
    console.info(`Membaca ${sample.length} halaman dari ${target.label}…`);
    const meta = Object.fromEntries(
      query(target, "SELECT key, value FROM meta").map((r) => [String(r.key), String(r.value)]),
    );
    const exp = bundlePages(expected, sample);
    const act = bundlePages(readRemote(target, sample), sample);
    const checked: Checked[] = sample.map((id) => {
      const e = exp.get(id);
      if (e === undefined) throw new Error(`page.id ${id} hilang dari baris harapan`);
      const a = act.get(id);
      return { page: e.page, summary: summarize(a ?? e), diffs: comparePage(e, a) };
    });
    const ok = checked.filter((c) => c.diffs.length === 0).length;
    for (const c of checked) {
      if (c.diffs.length > 0)
        console.error(`✗ j${c.page.juz} h${c.page.page_no}: ${c.diffs.join("; ")}`);
    }
    console.info(
      `QA ${target.label}: ${ok}/${checked.length} halaman cocok byte demi byte (seed ${seed}).`,
    );

    if (arg !== "staging") {
      const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
        cwd: repo,
        encoding: "utf8",
      }).trim();
      const path = join(repo, `${IHYA.reportPrefix}-qa-${target.label}.md`);
      writeFileSync(
        path,
        autoReport({
          label: target.label,
          uuid,
          meta,
          seed,
          total: expected.page.length,
          checked,
          commit,
        }),
      );
      console.info(`Laporan: ${path.slice(repo.length + 1)}`);
    }
    if (values.human !== undefined) {
      const picked = new Set(pickForHuman(checked, Number(values.human)).map((p) => p.id));
      const list = humanList(
        checked.filter((c) => picked.has(c.page.id)),
        values.surau.replace(/\/$/, ""),
        seed,
      );
      const path = join(repo, `${IHYA.reportPrefix}-qa-manusia.md`);
      if (existsSync(path)) {
        console.info(
          `${path.slice(repo.length + 1)} sudah ada (hasil mungkin sudah diisi); tidak ditimpa:\n${list}`,
        );
      } else {
        writeFileSync(path, list);
        console.info(`Daftar QA manusia: ${path.slice(repo.length + 1)}`);
      }
    }
    return ok === checked.length ? 0 : 1;
  } finally {
    dispose();
  }
}

process.exitCode = main(process.argv.slice(2));
