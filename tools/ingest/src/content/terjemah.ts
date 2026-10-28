// `pnpm terjemah`: berkas draf terjemahan Inggris per paragraf `surau-terjemah/1` (X27, ADR-132),
// ditulis di chat lewat skill `terjemah-inggris` plugin `surau-redaksi` (langganan, Sonnet).
//   pnpm terjemah cek [berkas…]          → cek lengkap (korpus) + kesiapan; tanpa berkas = semua
//   pnpm terjemah cek --luring [berkas…] → tanpa korpus: skema + cap + kesiapan (dipakai tes)
//   pnpm terjemah impor <berkas…>        → cek lengkap, lalu salin ke data/terjemah/en/ (status draf)
//   pnpm terjemah daftar                 → semua berkas beserta status, jumlah paragraf, pemeriksaan
//   --korpus produksi|staging            → korpus remote yang dibaca (bawaan produksi, sama dengan MCP)
//   --cap                                → cek: tulis cap baru ke berkas di data/terjemah/en yang lolos
//                                          (sesudah perbaikan; periksa independen dikosongkan, status draf)
//   --ganti                              → impor boleh menimpa berkas yang sudah ada
// Korpus dibaca lewat binding D1 remote hanya-SELECT (sama dengan `pnpm konten`). Tanpa LLM.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";

import {
  TRANSLATION_DRAFT_LANG,
  checkTranslationDraft,
  translationDraft,
  translationDraftSha256,
  translationReadinessIssues,
} from "@surau/core";
import type { ContentIssue, TranslationDraft, TranslationDraftCheck } from "@surau/core";
import type { z } from "zod";

import { korpus, openRemoteCorpus, readJson } from "./cli.ts";

const repo = resolve(import.meta.dirname, "../../../..");
export const TRANSLATION_DIR = join(repo, "data/terjemah", TRANSLATION_DRAFT_LANG);

/** Jalur kanonis: data/terjemah/en/<section_id>-<passage_id pertama>.json. */
export function translationPath(d: TranslationDraft): string {
  const first = Math.min(...d.butir.map((b) => b.passage_id));
  return join(TRANSLATION_DIR, `${d.section_id}-${first}.json`);
}

export function listTranslationFiles(dir = TRANSLATION_DIR): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => join(dir, f));
}

/** Cek tanpa korpus: skema, cap kode, dan kesiapan status. */
export async function checkTranslationOffline(input: unknown) {
  const parsed = translationDraft.safeParse(input);
  if (!parsed.success) {
    const errors: ContentIssue[] = parsed.error.issues.map((i) => ({
      code: "schema",
      path: i.path.join("."),
      message: i.message,
    }));
    return { ok: false, draft: null, errors };
  }
  const errors = await translationReadinessIssues(parsed.data);
  return { ok: errors.length === 0, draft: parsed.data, errors };
}

function printIssues(label: string, issues: readonly ContentIssue[]): void {
  for (const i of issues) console.log(`    ${label} ${i.code} · ${i.path}: ${i.message}`);
}

function printCheck(file: string, r: TranslationDraftCheck, ready: readonly ContentIssue[]) {
  const errors = [...r.errors, ...ready];
  const ok = errors.length === 0;
  console.log(
    `${ok ? "✓" : "✗"} ${file} (bagian ${r.section?.id ?? "?"}, ${r.facts?.items ?? 0} paragraf)`,
  );
  printIssues("galat", errors);
  printIssues("peringatan", r.warnings);
  return ok;
}

/** Cap kode di berkas dibuat dari teks sumber yang lain dari korpus sekarang: terjemahan basi. */
function staleSource(d: TranslationDraft, r: TranslationDraftCheck): ContentIssue[] {
  const stamped = d.periksa.kode?.sumber_sha256;
  if (stamped === undefined || r.facts === null || stamped === r.facts.source_sha256) return [];
  return [
    {
      code: "source_stale",
      path: "periksa.kode.sumber_sha256",
      message:
        "teks sumber di korpus berubah sesudah dicek; periksa ulang terjemahannya lalu cap ulang",
    },
  ];
}

async function cek(
  files: readonly string[],
  offline: boolean,
  which: z.infer<typeof korpus>,
  stamp = false,
) {
  if (files.length === 0) {
    console.log("tidak ada berkas terjemahan untuk dicek");
    return 0;
  }
  let failed = 0;
  if (offline) {
    for (const file of files) {
      const r = await checkTranslationOffline(readJson(file));
      console.log(`${r.ok ? "✓" : "✗"} ${file} (luring)`);
      printIssues("galat", r.errors);
      if (!r.ok) failed++;
    }
    return failed;
  }
  const corpus = await openRemoteCorpus(which);
  try {
    for (const file of files) {
      const input = readJson(file);
      const r = await checkTranslationDraft(corpus.db, input);
      const parsed = translationDraft.safeParse(input);
      if (
        stamp &&
        parsed.success &&
        r.ok &&
        r.stamp !== null &&
        file.startsWith(TRANSLATION_DIR + sep)
      ) {
        // Isi atau sumber berubah sesudah cap lama: cap baru, periksa independen wajib diulang.
        const out: TranslationDraft = {
          ...parsed.data,
          status: "draf",
          periksa: { ...parsed.data.periksa, independen: null, kode: r.stamp },
        };
        writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
        printCheck(file, r, []);
        console.log("    → cap baru ditulis (status draf; ulangi periksa independen)");
        continue;
      }
      const ready = parsed.success
        ? [...(await translationReadinessIssues(parsed.data)), ...staleSource(parsed.data, r)]
        : [];
      if (!printCheck(file, r, ready)) failed++;
    }
  } finally {
    await corpus.dispose();
  }
  return failed;
}

async function impor(files: readonly string[], which: z.infer<typeof korpus>, replace: boolean) {
  let failed = 0;
  const corpus = await openRemoteCorpus(which);
  try {
    for (const file of files) {
      const input = readJson(file);
      const r = await checkTranslationDraft(corpus.db, input);
      const parsed = translationDraft.safeParse(input);
      if (!printCheck(file, r, []) || !parsed.success || r.stamp === null) {
        failed++;
        continue;
      }
      const d = parsed.data;
      const salah = d.periksa.mandiri.filter((n) => n.nilai === "salah");
      if (d.periksa.mandiri.length === 0 || salah.length > 0) {
        console.log("    galat periksa_mandiri · periksa.mandiri: kosong atau ada Salah");
        failed++;
        continue;
      }
      const target = translationPath(d);
      if (existsSync(target) && !replace) {
        console.log(
          `    galat exists · ${relative(repo, target)} sudah ada; pakai --ganti untuk menimpa`,
        );
        failed++;
        continue;
      }
      // Cap dari cek ini; status draf sampai periksa independen lolos.
      const out: TranslationDraft = {
        ...d,
        status: "draf",
        periksa: { ...d.periksa, independen: null, kode: r.stamp },
      };
      mkdirSync(TRANSLATION_DIR, { recursive: true });
      writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`);
      console.log(`    → ${relative(repo, target)} (draf; lanjut: periksa independen)`);
    }
  } finally {
    await corpus.dispose();
  }
  return failed;
}

async function daftar() {
  const files = listTranslationFiles();
  if (files.length === 0) {
    console.log("data/terjemah/en kosong");
    return 0;
  }
  let ready = 0;
  for (const file of files) {
    const d = translationDraft.safeParse(readJson(file));
    if (!d.success) {
      console.log(`✗ ${relative(repo, file)}: skema tidak sah`);
      continue;
    }
    const v = d.data;
    const qa = v.periksa.independen?.nilai ?? [];
    const count = (n: string) => qa.filter((x) => x.nilai === n).length;
    const stamp =
      v.periksa.kode?.draf_sha256 === (await translationDraftSha256(v))
        ? "cap cocok"
        : "cap basi/kosong";
    if (v.status === "siap") ready += v.butir.length;
    console.log(
      `${v.status.padEnd(7)} ${relative(repo, file)} · ${v.butir.length} paragraf · ${v.asal.model ?? "manusia"} · ` +
        `${stamp} · independen ${qa.length === 0 ? "-" : `B${count("benar")}/K${count("kurang")}/S${count("salah")}`}`,
    );
  }
  console.log(`paragraf siap: ${ready}`);
  return 0;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      luring: { type: "boolean", default: false },
      korpus: { type: "string", default: "produksi" },
      cap: { type: "boolean", default: false },
      ganti: { type: "boolean", default: false },
    },
  });
  const [command, ...rest] = positionals;
  const which = korpus.parse(values.korpus);
  const files = rest.map((f) => resolve(f));
  for (const f of files) if (!existsSync(f)) throw new Error(`berkas tidak ada: ${f}`);
  let failed = 0;
  switch (command) {
    case "cek":
      failed = await cek(
        files.length > 0 ? files : listTranslationFiles(),
        values.luring,
        which,
        values.cap,
      );
      break;
    case "impor":
      if (files.length === 0) throw new Error("pnpm terjemah impor <berkas…>");
      failed = await impor(files, which, values.ganti);
      break;
    case "daftar":
      failed = await daftar();
      break;
    default:
      console.log(
        `Perintah: cek | impor | daftar (lihat komentar di ${basename(import.meta.filename)})`,
      );
      process.exitCode = 2;
      return;
  }
  if (failed > 0) {
    console.log(`${failed} berkas gagal`);
    process.exitCode = 1;
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
