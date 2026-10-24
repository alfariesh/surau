// `pnpm subjudul`: bangun `data/patches/ihya-9472-subjudul.json` dari korpus build lokal (read-only)
// dan keputusan kurasi `data/patches/ihya-9472-subjudul.yaml` (X04 W4). Lihat subheadings.ts.
//   pnpm subjudul                 → tulis JSON (gagal bila ada keputusan yang tidak bisa diterapkan)
//   pnpm subjudul --periksa       → cetak setiap keputusan beserta teksnya untuk ditinjau (tidak menulis)
//   pnpm subjudul --cek           → keluar 1 bila JSON di repo berbeda dari hasil bangun ulang
//   --db <path>                   → .sqlite korpus (bawaan: satu-satunya data/build/surau-corpus-*.sqlite)
// Mode --periksa mencetak teks Arab dari DB ke terminal untuk peninjau; tidak ada yang disimpan.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { parseDocument } from "yaml";
import { z } from "zod";

import { assertWritable, openReadOnly } from "./sqlite.ts";
import {
  buildSubheadings,
  subheadingDecisions,
  type SubPassage,
  type SubTocNode,
} from "./subheadings.ts";

const repo = resolve(import.meta.dirname, "../../..");
const DECISIONS = join(repo, "data/patches/ihya-9472-subjudul.yaml");
const OUTPUT = join(repo, "data/patches/ihya-9472-subjudul.json");
/** Ihya edisi Dar al-Ma'rifah (edition.id 1); jangkar #pN = passage.id − 1·10⁷. */
const EDITION = 1;

const sha16 = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 16);

function defaultDb(): string {
  const dir = join(repo, "data/build");
  const found = readdirSync(dir).filter((f) => /^surau-corpus-.+\.sqlite$/.test(f));
  if (found.length !== 1) {
    throw new Error(
      `Pakai --db: data/build berisi ${found.length} korpus .sqlite (${found.join(", ")})`,
    );
  }
  return join(dir, found[0]!);
}

function readDecisions() {
  const doc = parseDocument(readFileSync(DECISIONS, "utf8"), {
    uniqueKeys: true,
    strict: true,
    stringKeys: true,
  });
  const problems = [...doc.errors, ...doc.warnings];
  if (problems.length > 0)
    throw new Error(`${DECISIONS}: ${problems.map((e) => e.message).join("\n")}`);
  const parsed = subheadingDecisions.safeParse(doc.toJS({ maxAliasCount: 0 }));
  if (!parsed.success) throw new Error(`${DECISIONS}: ${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

function load(path: string) {
  const db = openReadOnly(path);
  try {
    const meta = Object.fromEntries(
      db
        .prepare("SELECT key, value FROM meta")
        .all()
        .map((r) => [String(r.key), String(r.value)]),
    );
    const base = EDITION * 10_000_000;
    const locked = new Map<number, { start: number; end: number }[]>();
    for (const r of db
      .prepare(
        `SELECT passage_id, char_start, char_end FROM footnote_ref
         UNION ALL SELECT passage_id, char_start, char_end FROM passage_ayah_ref`,
      )
      .all()) {
      const id = Number(r.passage_id);
      locked.set(id, [
        ...(locked.get(id) ?? []),
        { start: Number(r.char_start), end: Number(r.char_end) },
      ]);
    }
    const passages: SubPassage[] = db
      .prepare(
        `SELECT p.id, p.page_id, p.toc_node_id, p.text_raw, t.text AS tr
         FROM passage p JOIN page pg ON pg.id = p.page_id
         LEFT JOIN translation t ON t.passage_id = p.id AND t.lang = 'id' AND t.review_status <> 'rejected'
         WHERE p.kind = 'body' AND p.edition_id = ?
         ORDER BY pg.seq, p.ord`,
      )
      .all(EDITION)
      .map((r) => ({
        seq: Number(r.id) - base,
        pageId: Number(r.page_id),
        text: String(r.text_raw),
        tocNodeId: r.toc_node_id === null ? null : Number(r.toc_node_id),
        translation: r.tr === null ? null : String(r.tr),
        locked: locked.get(Number(r.id)) ?? [],
      }));
    const nodes: SubTocNode[] = db
      .prepare("SELECT id, title_ar, start_page_id FROM toc_node WHERE edition_id = ?")
      .all(EDITION)
      .map((r) => ({
        id: Number(r.id),
        title: String(r.title_ar),
        startPageId: Number(r.start_page_id),
      }));
    return { meta, passages, nodes };
  } finally {
    db.close();
  }
}

function main(): number {
  const { values } = parseArgs({
    options: {
      db: { type: "string" },
      periksa: { type: "boolean", default: false },
      cek: { type: "boolean", default: false },
    },
  });
  const decisions = readDecisions();
  const { meta, passages, nodes } = load(values.db ?? defaultDb());
  if (meta.corpus_version !== decisions.corpus) {
    console.warn(
      `Peringatan: keputusan diperiksa di ${decisions.corpus}, korpus ini ${meta.corpus_version ?? "?"}: tinjau ulang dengan --periksa.`,
    );
  }
  const built = buildSubheadings(EDITION, passages, nodes, decisions, sha16);
  const { stats } = built;
  console.info(
    `Calon "bayan": ${stats.bayanCandidates} (dikecualikan ${stats.bayanExcluded}) → subjudul bayan ${stats.bayanHeadings}, subjudul kurasi ${stats.kurasiHeadings}, lanjutan judul ${stats.continuations}, menempel di awal ${stats.lead}, di akhir ${stats.tail}, judul node dari butir daftar ${stats.nodeTails}.`,
  );
  for (const p of built.problems) console.error(`MASALAH: ${p}`);

  if (values.periksa) {
    const bySeq = new Map(passages.map((p) => [p.seq, p]));
    for (const [key, e] of Object.entries(built.file.entries)) {
      const p = bySeq.get(Number(key))!;
      if (e.kind === "plain") {
        console.info(`p${key} butir daftar (teks biasa): ${p.text}`);
      } else if (e.kind === "heading") {
        console.info(`p${key} ${e.src}${e.of ? ` lanjutan p${e.of}` : ""}: ${p.text}`);
      } else if (e.kind === "lead") {
        console.info(
          `p${key} awal: [${p.text.slice(0, e.end)}] | ${p.text.slice(e.end, e.end + 40)}…`,
        );
        console.info(
          `    terjemahan: ${e.tr ? `[${p.translation!.slice(e.tr.start, e.tr.end)}]` : "(tidak ditebalkan)"} ${p.translation?.slice(0, 90)}`,
        );
      } else {
        console.info(
          `p${key} akhir${e.node ? ` (judul node ${e.node})` : ""}: …${p.text.slice(Math.max(0, e.start - 40), e.start)} | [${p.text.slice(e.start)}]`,
        );
        console.info(
          `    terjemahan: ${e.tr ? `[${p.translation!.slice(e.tr.start, e.tr.end)}]` : "(tidak ditebalkan)"} …${p.translation?.slice(-110)}`,
        );
      }
    }
    return built.problems.length > 0 ? 1 : 0;
  }
  if (built.problems.length > 0) return 1;
  const json = `${JSON.stringify(built.file, null, 2)}\n`;
  if (values.cek) {
    const current = readFileSync(OUTPUT, "utf8");
    if (current !== json) {
      console.error(`${OUTPUT} berbeda dari hasil bangun ulang: jalankan \`pnpm subjudul\`.`);
      return 1;
    }
    console.info("JSON subjudul sesuai korpus dan keputusan kurasi.");
    return 0;
  }
  writeFileSync(assertWritable(OUTPUT), json);
  console.info(`Ditulis: ${OUTPUT} (${Object.keys(built.file.entries).length} paragraf).`);
  return 0;
}

process.exitCode = main();
