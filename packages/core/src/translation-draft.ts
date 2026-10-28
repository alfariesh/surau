// Bahan dan cek kode draf terjemahan `surau-terjemah/1` (X27, ADR-132) untuk plugin `surau-redaksi`
// (skill `terjemah-inggris`). `listTranslationUnits` memberi paragraf badan sebuah bagian dengan
// kutipan ayat sudah diganti placeholder (`maskAyat`), persis bahan batch API (`translationUnits` di
// tools/ingest). `checkTranslationDraft` menerapkan pemeriksa batch yang sama
// (`checkPassageTranslation`, bahasa "en") lalu memberi cap. Hanya membaca D1; tanpa LLM.
import {
  getFootnoteRefs,
  getSectionPassages,
  getTocNode,
  getTranslations,
  listTocNodes,
} from "@surau/db";
import type { D1Db, FootnoteRefRow, PassageWithPageRow, TocNodeRow } from "@surau/db";

import { maskAyat } from "./ayah-placeholder.ts";
import type { MaskedPassage } from "./ayah-placeholder.ts";
import { loadCiteContext } from "./citation.ts";
import { CONTENT_SECTION_MAX_PASSAGES, Issues, canonicalJson, pathOf } from "./content-check.ts";
import type { ContentIssue } from "./content-schema.ts";
import { NotFound, parseInput } from "./errors.ts";
import { loadAyahRefs } from "./quran.ts";
import { checkPassageTranslation } from "./translation-check.ts";
import { textSha256 } from "./translation-revision.ts";
import {
  TRANSLATION_DRAFT_LANG,
  TRANSLATION_RULES,
  translationDraft,
  translationUnitsInput,
} from "./translation-schema.ts";
import type {
  TranslationDraft,
  TranslationDraftCheck,
  TranslationUnits,
  TranslationUnitsInput,
} from "./translation-schema.ts";

/** Pemisah jalur judul, sama dengan bahan batch (`HEADING_SEPARATOR`, tools/ingest). */
const HEADING_SEPARATOR = " › ";

interface Unit {
  passage: PassageWithPageRow;
  masked: MaskedPassage;
  markers: string[];
  blocked: string | null;
}

function headingPaths(
  nodes: readonly { id: number; parent_id: number | null; title_ar: string }[],
) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<number, string>();
  const path = (nodeId: number): string => {
    const known = out.get(nodeId);
    if (known !== undefined) return known;
    const n = byId.get(nodeId);
    if (n === undefined) throw new Error(`simpul daftar isi ${nodeId} tidak ada`);
    const p =
      n.parent_id === null ? n.title_ar : `${path(n.parent_id)}${HEADING_SEPARATOR}${n.title_ar}`;
    out.set(nodeId, p);
    return p;
  };
  return path;
}

const toFootnote = (r: FootnoteRefRow) => ({
  marker: r.marker,
  char_start: r.char_start,
  char_end: r.char_end,
  footnote_id: r.footnote_passage_id,
});

/** Bagian sebesar ini (paragraf + catatan kaki) terlalu besar untuk satu bahan; pilih sub-bagiannya. */
export class SectionTooLarge extends Error {}

/**
 * Paragraf badan bagian (dan sub-bagiannya) dalam urutan baca. Bagian yang melewati batas baca
 * (mis. satu Rub') ditolak, bukan dipotong diam-diam: potongan membuat `total` keliru dan paragraf
 * sah di ujung bagian ditolak sebagai `outside_section` (peninjau X27).
 */
async function sectionBody(db: D1Db, node: TocNodeRow): Promise<PassageWithPageRow[]> {
  const rows = await getSectionPassages(db, node.id, null, CONTENT_SECTION_MAX_PASSAGES);
  if (rows.length === CONTENT_SECTION_MAX_PASSAGES) {
    throw new SectionTooLarge(
      `Section ${node.id} is too large for translation units; choose one of its sub-sections (Kitab or below)`,
    );
  }
  return rows.filter((p) => p.kind === "body");
}

/** Bertanda ayat; paragraf yang rujukan ayatnya tidak bisa ditandai semua diblokir (aturan batch). */
async function maskUnits(
  db: D1Db,
  passages: readonly PassageWithPageRow[],
): Promise<Map<number, Unit>> {
  const ids = passages.map((p) => p.id);
  const [ayat, notes] = await Promise.all([loadAyahRefs(db, ids), getFootnoteRefs(db, ids)]);
  if (ayat === null) throw new Error("korpus belum punya rujukan ayat (skema lama)");
  const out = new Map<number, Unit>();
  for (const p of passages) {
    const refs = ayat.get(p.id) ?? [];
    const foot = notes
      .filter((n) => n.passage_id === p.id)
      .toSorted((a, b) => a.char_start - b.char_start);
    const masked = maskAyat(p.text_raw, refs, foot.map(toFootnote));
    out.set(p.id, {
      passage: p,
      masked,
      markers: foot.map((f) => f.marker),
      blocked:
        masked.slots.length === refs.length
          ? null
          : `${refs.length - masked.slots.length} of ${refs.length} ayah references cannot be masked`,
    });
  }
  return out;
}

const placeholdersOf = (m: MaskedPassage) => m.slots.map((s) => s.placeholder);

export async function listTranslationUnits(
  db: D1Db,
  input: TranslationUnitsInput,
): Promise<TranslationUnits> {
  const args = parseInput(translationUnitsInput, input);
  const node = await getTocNode(db, args.section_id);
  if (node === null) throw new NotFound(`Section not found: ${args.section_id}`);
  const [cite, nodes, body] = await Promise.all([
    loadCiteContext(db, node.edition_id),
    listTocNodes(db, node.edition_id),
    sectionBody(db, node),
  ]);
  const heading = headingPaths(nodes);
  const pageStart = args.offset;
  const page = body.slice(pageStart, pageStart + args.limit);
  // Paragraf sebelumnya ikut ditandai supaya konteksnya juga tanpa ayat (aturan batch).
  const before = pageStart > 0 ? body[pageStart - 1] : undefined;
  const units = await maskUnits(db, before === undefined ? page : [before, ...page]);
  const translated = new Set(
    (
      await getTranslations(
        db,
        page.map((p) => p.id),
        TRANSLATION_DRAFT_LANG,
      )
    ).map((t) => t.passage_id),
  );
  const next = pageStart + page.length;
  let prev = before === undefined ? null : (units.get(before.id) ?? null);
  return {
    section: { id: node.id, title_ar: node.title_ar, level: node.level },
    total: body.length,
    offset: pageStart,
    next_offset: next < body.length ? next : null,
    units: page.map((p) => {
      const u = units.get(p.id);
      if (u === undefined) throw new Error(`paragraf ${p.id} tidak ditandai`);
      const sameNode =
        prev !== null && prev.blocked === null && prev.passage.toc_node_id === p.toc_node_id;
      const view = {
        passage_id: p.id,
        location: cite.location(p.juz, p.page_no, p.id),
        heading: p.toc_node_id === null ? "" : heading(p.toc_node_id),
        previous: sameNode && prev !== null ? prev.masked.text : null,
        source: u.masked.text,
        placeholders: placeholdersOf(u.masked),
        markers: u.markers,
        blocked: u.blocked,
        translated_en: translated.has(p.id),
      };
      prev = u;
      return view;
    }),
  };
}

/** Sidik draf: format, bahasa, edisi, bagian, dan butir (tanpa status, asal, periksa). */
export function translationDraftSha256(d: TranslationDraft): Promise<string> {
  const { format, lang, edition_id, section_id, butir } = d;
  return textSha256(canonicalJson({ format, lang, edition_id, section_id, butir }));
}

/** Masalah pemeriksa yang hanya peringatan: rasio panjang Inggris belum dikalibrasi (ADR-132). */
const WARN_ONLY = new Set(["length_ratio"]);

const PROBLEM_MESSAGE: Readonly<Record<string, string>> = {
  empty: "terjemahan kosong",
  placeholders: "placeholder ayat harus sama persis dengan sumber, masing-masing sekali",
  markers_extra: "penanda catatan kaki yang tidak ada di sumber",
  ayah_refill: "isi ayat ditulis ulang di dekat placeholder (transliterasi berdiakritik)",
  arabic: "memuat huruf Arab; tulis nama dan istilah dalam huruf Latin",
  length_ratio:
    "panjang terjemahan tidak wajar dibanding sumber; pastikan tidak ada yang hilang atau ditambah",
  markdown: "memuat Markdown",
  preamble: "dibuka kalimat pengantar (Here is …)",
  meta: "memuat komentar penerjemah atau kurung kurawal",
};

export async function checkTranslationDraft(
  db: D1Db,
  input: unknown,
  now: () => Date = () => new Date(),
): Promise<TranslationDraftCheck> {
  const issues = new Issues();
  const result = (
    section: TranslationDraftCheck["section"],
    facts: TranslationDraftCheck["facts"],
    stamp: TranslationDraftCheck["stamp"],
  ): TranslationDraftCheck => ({
    ok: issues.errors.length === 0,
    rules: TRANSLATION_RULES,
    section,
    errors: issues.errors,
    warnings: issues.warnings,
    facts,
    stamp,
  });
  const parsed = translationDraft.safeParse(input);
  if (!parsed.success) {
    for (const i of parsed.error.issues) issues.error("schema", pathOf(i.path), i.message);
    return result(null, null, null);
  }
  const d = parsed.data;
  const node = await getTocNode(db, d.section_id);
  if (node === null) {
    issues.error("unknown_section", "section_id", `bagian ${d.section_id} tidak ada`);
    return result(null, null, null);
  }
  if (node.edition_id !== d.edition_id) {
    issues.error(
      "edition_mismatch",
      "edition_id",
      `bagian ${node.id} milik edisi ${node.edition_id}`,
    );
  }
  const section = { id: node.id, title_ar: node.title_ar, level: node.level };
  let bodyRows: PassageWithPageRow[];
  try {
    bodyRows = await sectionBody(db, node);
  } catch (error) {
    if (!(error instanceof SectionTooLarge)) throw error;
    issues.error(
      "section_too_large",
      "section_id",
      "bagian terlalu besar; pakai sub-bagiannya (Kitab ke bawah)",
    );
    return result(section, null, null);
  }
  const body = new Map(bodyRows.map((p) => [p.id, p]));
  const seen = new Set<number>();
  const found: PassageWithPageRow[] = [];
  d.butir.forEach((b, i) => {
    const path = `butir[${i}].passage_id`;
    const p = body.get(b.passage_id);
    if (seen.has(b.passage_id)) issues.error("duplicate", path, `paragraf ${b.passage_id} ganda`);
    else if (p === undefined)
      issues.error(
        "outside_section",
        path,
        `paragraf ${b.passage_id} bukan paragraf badan bagian ini`,
      );
    else found.push(p);
    seen.add(b.passage_id);
  });
  const units = await maskUnits(db, found);
  d.butir.forEach((b, i) => {
    const u = units.get(b.passage_id);
    if (u === undefined) return;
    const path = `butir[${i}].teks`;
    if (u.blocked !== null) {
      issues.error(
        "blocked",
        `butir[${i}].passage_id`,
        "rujukan ayat paragraf ini tidak bisa ditandai; lewati",
      );
      return;
    }
    const check = checkPassageTranslation(b.teks, u, "en");
    if (check.text !== b.teks.trim()) {
      issues.error(
        "markers_latin",
        path,
        "penanda catatan kaki harus angka Arab, mis. (١), bukan (1)",
      );
    }
    for (const problem of check.problems) {
      const message = [PROBLEM_MESSAGE[problem] ?? problem, ...check.details].join("; ");
      if (WARN_ONLY.has(problem)) issues.warn(problem, path, message);
      else issues.error(problem, path, message);
    }
    if (check.markersMissing.length > 0) {
      issues.warn(
        "markers_missing",
        path,
        `penanda catatan kaki hilang: ${check.markersMissing.map((m) => `(${m})`).join(" ")}`,
      );
    }
  });
  const sourceSha256 = await textSha256(
    [...units.values()]
      .toSorted((a, b) => a.passage.id - b.passage.id)
      .map((u) => `${u.passage.id}\n${u.masked.text}\n`)
      .join(""),
  );
  const draftSha256 = await translationDraftSha256(d);
  const ok = issues.errors.length === 0;
  return result(
    section,
    { source_sha256: sourceSha256, draft_sha256: draftSha256, items: d.butir.length },
    ok
      ? {
          aturan: TRANSLATION_RULES,
          lolos: true,
          sumber_sha256: sourceSha256,
          draf_sha256: draftSha256,
          waktu: now().toISOString(),
        }
      : null,
  );
}

/** Kesiapan berkas tanpa DB: cap cocok dengan isi, dan `siap` hanya sesudah cek kode + periksa independen tanpa Salah. */
export async function translationReadinessIssues(d: TranslationDraft): Promise<ContentIssue[]> {
  const out: ContentIssue[] = [];
  const sha = await translationDraftSha256(d);
  const kode = d.periksa.kode;
  if (kode !== null && kode.draf_sha256 !== sha) {
    out.push({
      code: "stamp_mismatch",
      path: "periksa.kode.draf_sha256",
      message: "isi berubah sesudah dicek; jalankan cek ulang",
    });
  }
  const indep = d.periksa.independen;
  if (indep !== null && indep.draf_sha256 !== sha) {
    out.push({
      code: "review_stale",
      path: "periksa.independen.draf_sha256",
      message: "isi berubah sesudah periksa independen; ulangi",
    });
  }
  if (d.status === "siap") {
    if (kode === null || !kode.lolos || kode.aturan !== TRANSLATION_RULES) {
      out.push({
        code: "not_checked",
        path: "periksa.kode",
        message: `status siap butuh cap ${TRANSLATION_RULES} yang lolos`,
      });
    }
    if (indep === null || indep.nilai.length === 0) {
      out.push({
        code: "no_independent_review",
        path: "periksa.independen",
        message: "status siap butuh periksa independen",
      });
    }
    const salah = [...d.periksa.mandiri, ...(indep?.nilai ?? [])].filter(
      (n) => n.nilai === "salah",
    );
    if (salah.length > 0) {
      out.push({
        code: "review_salah",
        path: "periksa",
        message: `butir ${[...new Set(salah.map((n) => n.ke))].join(", ")} bernilai Salah`,
      });
    }
  }
  return out;
}
