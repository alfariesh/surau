// `pnpm konten`: berkas draf konten turunan `surau-konten/1` (X22, ADR-123, docs/09-konten.md).
//   pnpm konten cek <berkas…>          → cek kode lengkap (skema, bahasa, korpus) + kesiapan
//   pnpm konten cek --luring <berkas…> → tanpa korpus: skema, bahasa, cap, kesiapan (dipakai CI)
//   pnpm konten impor <berkas…>        → cek lengkap, lalu salin ke data/konten/<jenis>/ (status draf)
//   pnpm konten daftar                 → semua unit di data/konten beserta status dan pemeriksaannya
//   pnpm konten calon <section_id>     → paragraf calon Faedah (layak saja; --semua: dengan alasan)
//   --korpus produksi|staging          → korpus remote yang dibaca (bawaan produksi, sama dengan MCP)
//   --ganti                            → impor boleh menimpa unit yang ada bila versinya lebih tinggi
//   --cap                              → cek: tulis cap kode baru ke periksa.kode berkas di data/konten
//                                        yang lolos (sesudah perbaikan kecil; status kembali draf)
// Korpus dibaca lewat binding D1 remote (`getPlatformProxy`) dengan pagar hanya-SELECT; checkout
// pemilik tidak punya korpus lokal yang segar. Tidak ada LLM dan tidak ada tulisan ke D1.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  CONTENT_KINDS,
  checkContentDraft,
  contentDraft,
  listFaedahCandidates,
  contentDraftSha256,
  lintContent,
  readinessIssues,
} from "@surau/core";
import type { ContentCheck, ContentDraft, ContentIssue } from "@surau/core";
import type { D1Db } from "@surau/db";
import { z } from "zod";

import { selectOnly } from "../llm/digest-staging.ts";

const repo = resolve(import.meta.dirname, "../../../..");
export const CONTENT_DIR = join(repo, "data/konten");

/** Jalur kanonis satu unit di repo: data/konten/<jenis>/<section_id | slug>.json. */
export function canonicalPath(d: ContentDraft): string {
  const id = d.jenis === "jalur" ? d.isi.slug : String(d.section_id);
  return join(CONTENT_DIR, d.jenis, `${id}.json`);
}

/** Isi berkas JSON (tanpa memeriksa bentuk). */
export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

/** Semua berkas unit di data/konten (urut jalur). */
export function listContentFiles(dir = CONTENT_DIR): string[] {
  if (!existsSync(dir)) return [];
  return CONTENT_KINDS.flatMap((kind) => {
    const sub = join(dir, kind);
    if (!existsSync(sub)) return [];
    return readdirSync(sub)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => join(sub, f));
  });
}

export interface OfflineResult {
  ok: boolean;
  draft: ContentDraft | null;
  errors: ContentIssue[];
  warnings: ContentIssue[];
}

/** Cek tanpa korpus: skema, bahasa (lint), cap kode, dan kesiapan status. Dipakai CI. */
export async function checkOffline(input: unknown): Promise<OfflineResult> {
  const parsed = contentDraft.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      draft: null,
      errors: parsed.error.issues.map((i) => ({
        code: "schema",
        path: i.path.join("."),
        message: i.message,
      })),
      warnings: [],
    };
  }
  const lint = lintContent(parsed.data);
  const errors = [...lint.errors, ...(await readinessIssues(parsed.data))];
  return { ok: errors.length === 0, draft: parsed.data, errors, warnings: lint.warnings };
}

const korpus = z.enum(["produksi", "staging"]);

/** Binding D1 remote hanya-baca ke korpus produksi (DB yang dipakai MCP) atau staging. */
async function openRemoteCorpus(which: z.infer<typeof korpus>) {
  const { getPlatformProxy } = await import("wrangler");
  let configPath = join(repo, "tools/ingest/wrangler.staging.jsonc");
  let tmp: string | null = null;
  if (which === "produksi") {
    // DB produksi = binding CORPUS_DB di apps/mcp/wrangler.jsonc (diperbarui corpus:promote).
    const config = readFileSync(join(repo, "apps/mcp/wrangler.jsonc"), "utf8");
    const name = /"database_name":\s*"(surau-corpus-[^"]+)"/u.exec(config)?.[1];
    const id = /"database_id":\s*"([0-9a-f-]{36})"/u.exec(config)?.[1];
    if (name === undefined || id === undefined) {
      throw new Error("DB produksi tidak ditemukan di apps/mcp/wrangler.jsonc");
    }
    tmp = mkdtempSync(join(tmpdir(), "surau-konten-"));
    configPath = join(tmp, "wrangler.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        name: "surau-konten-read",
        compatibility_date: "2026-10-14",
        d1_databases: [{ binding: "CORPUS", database_name: name, database_id: id, remote: true }],
      }),
    );
  }
  const proxy = await getPlatformProxy<{ CORPUS: D1Db }>({ configPath, remoteBindings: true });
  return {
    db: selectOnly(proxy.env.CORPUS),
    dispose: async () => {
      await proxy.dispose();
      if (tmp !== null) rmSync(tmp, { recursive: true, force: true });
    },
  };
}

function printIssues(label: string, issues: readonly ContentIssue[]): void {
  for (const i of issues) console.log(`    ${label} ${i.code} · ${i.path}: ${i.message}`);
}

function printCheck(file: string, r: ContentCheck, ready: readonly ContentIssue[]): boolean {
  const errors = [...r.errors, ...ready];
  const ok = errors.length === 0;
  const facts = r.facts;
  const extra =
    facts === null || r.kind === "faedah" || r.kind === "jalur"
      ? ""
      : ` · cakupan ${facts.coverage === null ? "-" : `${Math.round(facts.coverage * 100)}%`}` +
        ` · ${facts.reading_minutes ?? "-"} menit`;
  console.log(`${ok ? "✓" : "✗"} ${file} (${r.kind ?? "?"} ${r.section?.id ?? ""})${extra}`);
  printIssues("galat", errors);
  printIssues("peringatan", r.warnings);
  if (ok && r.stamp !== null) {
    console.log(`    cap: ${JSON.stringify(r.stamp)}`);
  }
  return ok;
}

async function cek(
  files: readonly string[],
  offline: boolean,
  which: z.infer<typeof korpus>,
  stamp = false,
) {
  let failed = 0;
  if (files.length === 0) {
    console.log("tidak ada berkas konten untuk dicek");
    return 0;
  }
  if (offline) {
    for (const file of files) {
      const r = await checkOffline(readJson(file));
      console.log(`${r.ok ? "✓" : "✗"} ${file} (luring)`);
      printIssues("galat", r.errors);
      printIssues("peringatan", r.warnings);
      if (!r.ok) failed++;
    }
    return failed;
  }
  const corpus = await openRemoteCorpus(which);
  try {
    for (const file of files) {
      const input = readJson(file);
      const r = await checkContentDraft(corpus.db, input);
      const parsed = contentDraft.safeParse(input);
      const ready = parsed.success ? await readinessIssues(parsed.data) : [];
      if (stamp && parsed.success && r.ok && r.stamp !== null && file.startsWith(CONTENT_DIR)) {
        // Isi berubah sesudah cap lama: cap baru, dan periksa independen wajib diulang.
        const out: ContentDraft = {
          ...parsed.data,
          status: "draf",
          periksa: { ...parsed.data.periksa, independen: null, kode: r.stamp },
        };
        writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
        printCheck(file, r, []);
        console.log(`    → cap baru ditulis (status draf)`);
        continue;
      }
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
      const r = await checkContentDraft(corpus.db, input);
      const parsed = contentDraft.safeParse(input);
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
      const target = canonicalPath(d);
      if (existsSync(target)) {
        const old = contentDraft.safeParse(readJson(target));
        const newer = old.success && d.versi > old.data.versi;
        if (!replace || !newer) {
          console.log(
            `    galat exists · ${relative(repo, target)} sudah ada; naikkan versi dan pakai --ganti`,
          );
          failed++;
          continue;
        }
      }
      // Cap kode dari cek ini; status tetap draf sampai periksa independen (lapis 3) lolos.
      const out: ContentDraft = {
        ...d,
        status: "draf",
        periksa: { ...d.periksa, independen: null, kode: r.stamp },
      };
      mkdirSync(join(CONTENT_DIR, d.jenis), { recursive: true });
      writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`);
      console.log(`    → ${relative(repo, target)} (draf; lanjut: periksa independen)`);
    }
  } finally {
    await corpus.dispose();
  }
  return failed;
}

async function calon(sectionId: number, all: boolean, which: z.infer<typeof korpus>) {
  const corpus = await openRemoteCorpus(which);
  try {
    let offset: number | null = 0;
    while (offset !== null) {
      const page = await listFaedahCandidates(corpus.db, {
        section_id: sectionId,
        offset,
        limit: 60,
        include_ineligible: all,
      });
      for (const c of page.candidates) {
        const mark = c.eligible ? "✓" : "✗";
        console.log(
          `${mark} ${c.anchor} (${c.passage_id}) ${c.words ?? "-"} kata ${c.reasons.join(", ")}`,
        );
        if (c.translation !== null) console.log(`    ${c.translation.text}`);
      }
      offset = page.next_offset;
    }
  } finally {
    await corpus.dispose();
  }
  return 0;
}

async function daftar() {
  const files = listContentFiles();
  if (files.length === 0) {
    console.log("data/konten kosong");
    return 0;
  }
  for (const file of files) {
    const d = contentDraft.safeParse(readJson(file));
    if (!d.success) {
      console.log(`✗ ${relative(repo, file)}: skema tidak sah`);
      continue;
    }
    const v = d.data;
    const qa = v.periksa.independen?.nilai ?? [];
    const count = (n: string) => qa.filter((x) => x.nilai === n).length;
    const sha = await contentDraftSha256(v);
    const stamp = v.periksa.kode?.draf_sha256 === sha ? "cap cocok" : "cap basi/kosong";
    console.log(
      `${v.status.padEnd(7)} ${relative(repo, file)} v${v.versi} · ${v.asal.model ?? "manusia"} · ` +
        `${stamp} · independen ${qa.length === 0 ? "-" : `B${count("benar")}/K${count("kurang")}/S${count("salah")}`}`,
    );
  }
  return 0;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      luring: { type: "boolean", default: false },
      korpus: { type: "string", default: "produksi" },
      ganti: { type: "boolean", default: false },
      semua: { type: "boolean", default: false },
      cap: { type: "boolean", default: false },
    },
  });
  const [command, ...rest] = positionals;
  const which = korpus.parse(values.korpus);
  const files = command === "calon" ? [] : rest.map((f) => resolve(f));
  for (const f of files) if (!existsSync(f)) throw new Error(`berkas tidak ada: ${f}`);
  let failed = 0;
  switch (command) {
    case "cek":
      failed = await cek(
        files.length > 0 ? files : listContentFiles(),
        values.luring,
        which,
        values.cap,
      );
      break;
    case "impor":
      if (files.length === 0) throw new Error("pnpm konten impor <berkas…>");
      failed = await impor(files, which, values.ganti);
      break;
    case "daftar":
      failed = await daftar();
      break;
    case "calon": {
      const id = Number(rest[0]);
      if (!Number.isInteger(id) || id <= 0) throw new Error("pnpm konten calon <section_id>");
      failed = await calon(id, values.semua, which);
      break;
    }
    default:
      console.log(
        `Perintah: cek | impor | daftar | calon (lihat komentar di ${basename(import.meta.filename)})`,
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
