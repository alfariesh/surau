// `pnpm ayat:patch` (X29): susun dan uji patch ayat `data/patches/ihya-9472-ayat.yaml` terhadap teks
// korpus remote (hanya SELECT) dan Tanzil simple-clean lokal, tanpa build dan tanpa LLM.
//   pnpm ayat:patch buat --vonis <tsv> [--sumber audit-2026-10-29] → tambah entri berjenis kutipan
//     (kolom vonis: jenis, passage_id, char_start, char_end, surah, ayah_from, ayah_to, utuh, catatan);
//     letak dihitung kode, nomor vonis hanya memilih di antara letak berlafaz sama. Yang tidak
//     terselesaikan dicetak, tidak ditulis.
//   pnpm ayat:patch cek → semua entri dicocokkan ulang persis seperti ingest (`applyAyahPatch`).
//   pnpm ayat:patch cek --terkena → plus tabel paragraf terkena (terjemahan id, berkas Inggris).
// Opsi bersama: --korpus produksi|staging, --quran <dir> (bawaan data/raw, berkas Tanzil yang dipin).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

import { stringify } from "yaml";

import { korpus, openRemoteCorpus } from "../content/cli.ts";
import { translatedPassages } from "../content/terjemah.ts";
import { readStrictYaml } from "../patch.ts";
import { IHYA } from "../works/ihya.ts";
import { applyAyahPatch, ayahCandidates, ayahPatch, spanSha256 } from "./ayah-patch.ts";
import type { AyahPatch, PatchPassage } from "./ayah-patch.ts";
import { buildQuranIndex } from "./matcher.ts";
import { parseTanzilXml, QURAN_FILES, readPinned } from "./source.ts";
import type { QuranIndex } from "./matcher.ts";

const repo = resolve(import.meta.dirname, "../../../..");
const PATCH = join(repo, IHYA.ayahPatch ?? "data/patches/ihya-9472-ayat.yaml");

/** Sel TSV yang dibungkus kutip gaya CSV ("…", "" = ") dibuka. */
const unquote = (cell: string): string =>
  /^".*"$/su.test(cell) ? cell.slice(1, -1).replaceAll('""', '"') : cell;

/** Indeks mushaf dari berkas Tanzil simple-clean yang dipin, persis seperti ingest (`loadQuran`). */
export function tanzilIndex(root: string): QuranIndex {
  const { text } = readPinned(root, QURAN_FILES.tanzilSimpleClean);
  return buildQuranIndex(parseTanzilXml(text).ayat);
}

function readPatch(): AyahPatch {
  return existsSync(PATCH)
    ? readStrictYaml(PATCH, ayahPatch)
    : { shamela_book: IHYA.shamelaBook, ayat: [] };
}

function writePatch(p: AyahPatch): void {
  p.ayat.sort((a, b) => a.passage_id - b.passage_id || a.char_start - b.char_start);
  const head = [
    "# Patch ayat Ihya (X29, ADR-133): kutipan Al-Qur'an yang terlewat pencocok, terverifikasi.",
    "# Tanpa teks kitab. Dibuat/diuji dengan `pnpm ayat:patch`; ingest mencocokkan ulang setiap entri.",
  ];
  writeFileSync(PATCH, `${head.join("\n")}\n${stringify(p, { lineWidth: 0 })}`);
}

/**
 * Paragraf yang mendapat rujukan baru: terjemahan AI Indonesia yang tayang (akan usang di build
 * berikutnya karena hash unit berubah) dan berkas terjemahan Inggris di repo yang memuatnya.
 */
async function affected(
  db: Awaited<ReturnType<typeof openRemoteCorpus>>["db"],
  ids: number[],
): Promise<string> {
  const en = translatedPassages();
  const lines = ["| passage_id | bagian | terjemahan id | berkas Inggris |", "|---|---|---|---|"];
  for (const pid of ids.toSorted((a, b) => a - b)) {
    const row = (await db
      .prepare(
        "SELECT p.toc_node_id AS toc, t.review_status AS status FROM passage p LEFT JOIN translation t ON t.passage_id = p.id AND t.lang = 'id' WHERE p.id = ?",
      )
      .bind(pid)
      .first()) as { toc: number | null; status: string | null } | null;
    const file = en.get(pid);
    lines.push(
      `| ${pid} | ${row?.toc ?? "–"} | ${row?.status ?? "tidak ada"} | ${file === undefined ? "–" : relative(repo, file)} |`,
    );
  }
  return lines.join("\n");
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      korpus: { type: "string", default: "produksi" },
      quran: { type: "string", default: join(repo, "data/raw") },
      vonis: { type: "string" },
      sumber: { type: "string", default: "audit-2026-10-29" },
      /** cek: cetak paragraf terkena (terjemahan id dan berkas Inggris) sebagai tabel Markdown. */
      terkena: { type: "boolean", default: false },
    },
  });
  const cmd = positionals[0];
  if (cmd !== "buat" && cmd !== "cek") throw new Error("Perintah: buat --vonis <tsv> | cek");
  const index = tanzilIndex(values.quran);
  const patch = readPatch();
  const rows =
    cmd === "buat"
      ? readFileSync(values.vonis ?? "", "utf8")
          .split("\n")
          .slice(1)
          .filter(Boolean)
          .map((l) => l.split("\t"))
          .filter((c) => c[0] === "kutipan")
      : [];
  const ids = [
    ...new Set([...patch.ayat.map((e) => e.passage_id), ...rows.map((c) => Number(c[1]))]),
  ];
  const corpus = await openRemoteCorpus(korpus.parse(values.korpus));
  try {
    const passages = new Map<number, PatchPassage>();
    const existing: { passage_id: number; char_start: number; char_end: number }[] = [];
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const q = chunk.map(() => "?").join(",");
      const ps = (
        await corpus.db
          .prepare(`SELECT id, kind, text_raw FROM passage WHERE id IN (${q})`)
          .bind(...chunk)
          .all()
      ).results as { id: number; kind: string; text_raw: string }[];
      for (const p of ps) passages.set(p.id, { kind: p.kind, text_raw: p.text_raw });
      const rs = (
        await corpus.db
          .prepare(
            `SELECT passage_id, char_start, char_end FROM passage_ayah_ref WHERE passage_id IN (${q})`,
          )
          .bind(...chunk)
          .all()
      ).results as { passage_id: number; char_start: number; char_end: number }[];
      existing.push(...rs);
    }
    if (cmd === "buat") {
      const have = new Set(patch.ayat.map((e) => `${e.passage_id}@${e.char_start}`));
      const unresolved: string[] = [];
      let added = 0;
      for (const c of rows) {
        const [pid, start, end] = [Number(c[1]), Number(c[2]), Number(c[3])];
        const surah = Number(c[4]) || null;
        const from = Number(c[5]) || null;
        const p = passages.get(pid);
        if (p === undefined || have.has(`${pid}@${start}`)) continue;
        const cands = ayahCandidates(index, p.text_raw, start, end);
        const named = cands.filter(
          (x) => x.surah === surah && (from === null || (x.ayahFrom <= from && from <= x.ayahTo)),
        );
        const pick = named.length === 1 ? named[0] : cands.length === 1 ? cands[0] : undefined;
        if (pick === undefined) {
          const found = cands.map((x) => `${x.surah}:${x.ayahFrom}-${x.ayahTo}`).join(", ");
          unresolved.push(
            `${pid}@${start}: vonis ${surah}:${from}; kode: ${found || "tidak cocok"}`,
          );
          continue;
        }
        const catatan = unquote(c[8] ?? "")
          .replaceAll(/\p{Script=Arabic}/gu, "")
          .trim()
          .slice(0, 300);
        patch.ayat.push({
          passage_id: pid,
          char_start: start,
          char_end: end,
          span_sha256: spanSha256(p.text_raw, start, end),
          surah: pick.surah,
          ayah_from: pick.ayahFrom,
          ayah_to: pick.ayahTo,
          sumber: values.sumber,
          ...(catatan === "" ? {} : { catatan }),
        });
        have.add(`${pid}@${start}`);
        added++;
      }
      writePatch(patch);
      console.log(JSON.stringify({ ditambah: added, total: patch.ayat.length, berkas: PATCH }));
      if (unresolved.length > 0)
        console.log(`Belum terselesaikan (${unresolved.length}):\n${unresolved.join("\n")}`);
    }
    const { refs, problems } = applyAyahPatch(index, passages, existing, readPatch());
    const exact = refs.filter((r) => r.match === "exact").length;
    console.log(
      JSON.stringify({
        entri: refs.length + problems.length,
        lolos: refs.length,
        persis: exact,
        mirip: refs.length - exact,
        paragraf: new Set(refs.map((r) => r.passage_id)).size,
        gagal: problems.length,
      }),
    );
    if (problems.length > 0) {
      console.error(problems.join("\n"));
      process.exitCode = 1;
    }
    if (values.terkena)
      console.log(await affected(corpus.db, [...new Set(refs.map((r) => r.passage_id))]));
  } finally {
    await corpus.dispose();
  }
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
