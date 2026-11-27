// Teks badan karya penyunting modern yang TIDAK dimuat (ADR-150, perluasan ADR-138): mukadimah,
// tambahan, dan kata penutup pentahqiq yang ikut tercetak di badan edisi. Daftarnya eksplisit per
// kitab di `data/patches/<kitab>-<id shamela>-pentahqiq.yaml` (di-commit, tanpa teks kitab): judul
// daftar isi, kunci paragraf (`<page.id>:<kunci>`, sama dengan peta ID), dan halaman yang dibuang,
// plus daftar `paragraf_id` yang wajib sama persis dengan hasil hitungan kode.
//
// Pembuangan terjadi SESUDAH baris dibangun: ID tetap dialokasikan dari peta (tidak ada yang
// bergeser) dan QA matan OpenITI tetap membandingkan halaman sumber utuh. `text_raw` paragraf lain
// tidak disentuh. Entri yang tidak ditemukan di sumber, atau `paragraf_id` yang berbeda dari hasil
// hitungan, membuat ingest gagal; gerbang stabilitas ID (ADR-059) hanya menerima hilangnya ID yang
// tercantum di berkas ini.
import { pageId, passageId, tocNodeId } from "@surau/db";
import { z } from "zod";

import type { IdAllocator } from "./ids.ts";
import { readStrictYaml } from "./patch.ts";
import type { CorpusRows } from "./rows.ts";
import type { ParsedPage } from "./shamela/page.ts";
import type { TocBuild } from "./toc.ts";

const positive = z.number().int().positive();
/** Satu ID, atau rentang inklusif `[dari, sampai]`. */
const idOrRange = z.union([positive, z.tuple([positive, positive])]);

export const editorTextFile = z.strictObject({
  /** Kitab Shamela; dicek sama dengan konfigurasi. */
  shamela_book: positive,
  bagian: z
    .array(
      z
        .strictObject({
          /** Nama bagian (Latin), untuk laporan. */
          nama: z.string().min(1).max(120),
          /** Alasan singkat bagian ini bukan teks penulis. */
          alasan: z.string().min(1).max(400),
          /** `title.id` Shamela: node dan SEMUA paragraf di bawahnya dibuang. Anak wajib ikut disebut. */
          judul: z.array(positive).default([]),
          /** Kunci paragraf `<page.id>:<kunci di halaman>` (sama dengan kunci peta ID). */
          kunci: z
            .array(z.string().regex(/^\d+:[bft]\d+(?:\.1)?$/, "bentuk <page.id>:<kunci>"))
            .default([]),
          /** `page.id` Shamela yang baris halamannya ikut dibuang (wajib tanpa paragraf tersisa). */
          halaman: z.array(positive).default([]),
          /** `passage.id` yang dibuang bagian ini; wajib sama persis dengan hasil hitungan kode. */
          paragraf_id: z.array(idOrRange).min(1),
        })
        .refine((b) => b.judul.length + b.kunci.length > 0, "isi `judul` atau `kunci`"),
    )
    .min(1),
});
export type EditorTextFile = z.infer<typeof editorTextFile>;

export function readEditorText(path: string): EditorTextFile {
  return readStrictYaml(path, editorTextFile);
}

/** Hasil rencana pembuangan untuk satu kitab. */
export interface EditorExclusion {
  passages: Set<number>;
  tocNodes: Set<number>;
  pages: Set<number>;
  sections: { nama: string; alasan: string; passageIds: number[]; tocIds: number[] }[];
}

function expandIds(list: readonly (number | readonly [number, number])[], where: string): number[] {
  const out: number[] = [];
  for (const item of list) {
    if (typeof item === "number") {
      out.push(item);
      continue;
    }
    const [from, to] = item;
    if (to < from || to - from > 10_000)
      throw new Error(`${where}: rentang [${from}, ${to}] tidak sah`);
    for (let id = from; id <= to; id++) out.push(id);
  }
  return out;
}

const sorted = (ids: Iterable<number>): number[] => [...ids].sort((a, b) => a - b);

/**
 * Hitung paragraf, node, dan halaman yang dibuang, sambil memvalidasi berkas terhadap sumber.
 * Dipanggil sesudah `buildRows`, jadi setiap kunci paragraf/judul sumber sudah punya seq di `ids`
 * (memanggil `seq` lagi tidak mengalokasikan apa pun).
 */
export function planEditorExclusion(
  file: EditorTextFile,
  input: {
    shamelaBook: number;
    editionId: number;
    pages: readonly ParsedPage[];
    toc: TocBuild;
    ids: IdAllocator;
    /** Nama berkas untuk pesan galat. */
    where: string;
  },
): EditorExclusion {
  const { pages, toc, ids, editionId: ed, where } = input;
  if (file.shamela_book !== input.shamelaBook)
    throw new Error(`${where}: untuk kitab ${file.shamela_book}, bukan ${input.shamelaBook}`);
  const problems: string[] = [];
  const pageIndex = new Map(pages.map((p, i) => [p.source.id, i]));
  const nodeKeys = new Set(toc.nodes.map((n) => n.key));
  const seen = new Set<number>();
  const plan: EditorExclusion = {
    passages: new Set(),
    tocNodes: new Set(),
    pages: new Set(),
    sections: [],
  };
  const droppedTitleKeys = new Set<string>();

  for (const b of file.bagian) {
    const keys = new Set<string>();
    const titleKeys = new Set<string>();
    for (const t of b.judul) {
      if (!nodeKeys.has(`t${t}`)) problems.push(`${b.nama}: judul ${t} tidak ada di daftar isi`);
      else titleKeys.add(`t${t}`);
    }
    for (const k of b.kunci) {
      const [pid, key] = k.split(":") as [string, string];
      const pi = pageIndex.get(Number(pid));
      const page = pi === undefined ? undefined : pages[pi];
      if (page === undefined || ![...page.body, ...page.foot].some((d) => d.key === key))
        problems.push(`${b.nama}: paragraf ${k} tidak ada di sumber`);
      else keys.add(k);
    }
    // Paragraf di bawah judul yang dibuang (badan dan catatan kaki).
    pages.forEach((p, pi) => {
      p.body.forEach((d, i) => {
        if (titleKeys.has(toc.body[pi]?.[i] ?? "")) keys.add(`${p.source.id}:${d.key}`);
      });
      p.foot.forEach((d, i) => {
        if (titleKeys.has(toc.foot[pi]?.[i] ?? "")) keys.add(`${p.source.id}:${d.key}`);
      });
    });
    for (const h of b.halaman) {
      if (!pageIndex.has(h)) problems.push(`${b.nama}: halaman ${h} tidak ada di sumber`);
      else plan.pages.add(pageId(ed, ids.seq("page", String(h))));
    }
    const computed = sorted([...keys].map((k) => passageId(ed, ids.seq("passage", k))));
    const declared = sorted(new Set(expandIds(b.paragraf_id, `${where} ${b.nama}`)));
    const extra = declared.filter((id) => !computed.includes(id));
    const unlisted = computed.filter((id) => !declared.includes(id));
    if (extra.length > 0 || unlisted.length > 0)
      problems.push(
        `${b.nama}: paragraf_id tidak sama dengan hitungan kode (tercantum tetapi tidak dibuang: ${extra.join(", ") || "-"}; dibuang tetapi tidak tercantum: ${unlisted.join(", ") || "-"})`,
      );
    for (const id of computed) {
      if (seen.has(id)) problems.push(`${b.nama}: paragraf ${id} sudah disebut bagian lain`);
      seen.add(id);
      plan.passages.add(id);
    }
    const tocIds = sorted([...titleKeys].map((k) => tocNodeId(ed, ids.seq("toc", k))));
    for (const id of tocIds) plan.tocNodes.add(id);
    for (const k of titleKeys) droppedTitleKeys.add(k);
    plan.sections.push({ nama: b.nama, alasan: b.alasan, passageIds: computed, tocIds });
  }

  // Anak node yang dibuang wajib ikut disebut, supaya tidak ada bagian yang hilang tanpa tertulis.
  for (const n of toc.nodes) {
    if (n.parentKey !== null && droppedTitleKeys.has(n.parentKey) && !droppedTitleKeys.has(n.key))
      problems.push(`node ${n.key} anak dari ${n.parentKey} yang dibuang, tetapi tidak disebut`);
  }
  // Per halaman: halaman yang dibuang tidak boleh menyisakan paragraf atau awal node; halaman yang
  // SEMUA paragrafnya dibuang wajib ikut disebut (kalau tidak, tampil kosong di pembaca); badan dan
  // catatan kaki yang saling bertaut dibuang bersama (kalau tidak, ada catatan yatim atau penanda
  // tanpa catatan).
  pages.forEach((p, pi) => {
    const pid = pageId(ed, ids.seq("page", String(p.source.id)));
    const dropped = (key: string) =>
      plan.passages.has(passageId(ed, ids.seq("passage", `${p.source.id}:${key}`)));
    const all = [...p.body, ...p.foot];
    const left = all.filter((d) => !dropped(d.key));
    for (const l of p.links) {
      const body = p.body[l.body]?.key ?? "";
      const foot = p.foot[l.foot]?.key ?? "";
      if (dropped(body) !== dropped(foot))
        problems.push(
          `halaman ${p.source.id}: ${body} dan catatannya ${foot} harus dibuang bersama atau tidak sama sekali`,
        );
    }
    if (!plan.pages.has(pid)) {
      if (all.length > 0 && left.length === 0)
        problems.push(`halaman ${p.source.id}: semua paragrafnya dibuang, sebut di \`halaman\``);
      return;
    }
    if (left.length > 0)
      problems.push(`halaman ${p.source.id} dibuang tetapi ${left.length} paragrafnya tidak`);
    for (const n of toc.nodes)
      if (n.pageIndex === pi && !droppedTitleKeys.has(n.key))
        problems.push(`halaman ${p.source.id} dibuang tetapi node ${n.key} mulai di sana`);
  });
  if (problems.length > 0)
    throw new Error(`${where}: ${problems.length} masalah\n${problems.join("\n")}`);
  return plan;
}

type ExcludableTables = "page" | "toc_node" | "passage" | "footnote_ref" | "passage_needs_review";

/** Buang baris yang direncanakan; tabel lain tidak disentuh (rujukan ayat dll. dihitung sesudahnya). */
export function applyEditorExclusion<T extends Pick<CorpusRows, ExcludableTables>>(
  rows: T,
  plan: EditorExclusion,
): T {
  return {
    ...rows,
    page: rows.page.filter((r) => !plan.pages.has(r.id)),
    toc_node: rows.toc_node.filter((r) => !plan.tocNodes.has(r.id)),
    passage: rows.passage.filter((r) => !plan.passages.has(r.id)),
    footnote_ref: rows.footnote_ref.filter(
      (r) => !plan.passages.has(r.passage_id) && !plan.passages.has(r.footnote_passage_id),
    ),
    passage_needs_review: rows.passage_needs_review.filter((r) => !plan.passages.has(r.passage_id)),
  };
}

/** Bagian laporan validasi: daftar lengkap yang dibuang per bagian (ID saja, tanpa teks kitab). */
export function editorTextReport(plan: EditorExclusion): string[] {
  return [
    "## Teks badan penyunting tidak dimuat (ADR-150)",
    "",
    ...plan.sections.flatMap((s) => [
      `### ${s.nama} (${s.passageIds.length} paragraf${s.tocIds.length > 0 ? `, ${s.tocIds.length} node` : ""})`,
      "",
      s.alasan,
      "",
      `Paragraf: ${s.passageIds.join(", ")}`,
      ...(s.tocIds.length > 0 ? [`Node: ${s.tocIds.join(", ")}`] : []),
      "",
    ]),
  ];
}
