// Cek kode draf konten (lapis 1 gerbang terbit, X23, ADR-125): skema `surau-konten/1`, lint teks,
// lalu cek terhadap korpus: bagian dan tingkatnya, paragraf dasar di dalam bagian, kutipan sebagai
// rentang `text_raw` yang utuh per kata (tanpa ayat dan tanpa riwayat terlarang), istilah di
// glosarium, syarat Faedah (terjemahan berlabel, tanpa ayat/hadits, pendapat penulis), dan Intisari
// tiap hari Jalur. Hanya membaca; tidak memanggil LLM. Dipakai MCP `/redaksi` dan CLI `konten`.
import {
  getDigest,
  getDigestHeaders,
  getFootnoteRefs,
  getNeedsReview,
  getPassagesByIds,
  getSectionPassages,
  getTocChildren,
  getTocNode,
  getTranslations,
  listGlossaryTermKeys,
  listTocNodes,
  passageAnchor,
} from "@surau/db";
import type {
  D1Db,
  PassageWithPageRow,
  TocNodeRow,
  TocNodeWithStartRow,
  TranslationRow,
} from "@surau/db";

import { isQuoteSpan } from "@surau/text";

import { loadCiteContext } from "./citation.ts";

import { digestTierOf, leafPointRange, readingMinutes } from "./digest.ts";
import { NotFound, parseInput } from "./errors.ts";
import {
  CONTENT_LIMITS,
  CONTENT_RULES,
  faedahCandidatesInput,
  contentDraft,
} from "./content-schema.ts";
import type {
  FaedahCandidates,
  FaedahCandidatesInput,
  ContentCheck,
  ContentDraft,
  ContentIssue,
} from "./content-schema.ts";
import { reviewersFor, translationView } from "./page.ts";
import { lintContent, wordCount } from "./content-lint.ts";
import { sectionPermalink } from "./permalink.ts";
import { loadAyahRefs } from "./quran.ts";
import { quoteInspector } from "./quote-inspect.ts";
import { hasArabicLetters } from "./translation-text.ts";
import { textSha256 } from "./translation-revision.ts";

/** Bahasa konten turunan yang dibuat sekarang. */
export const CONTENT_LANG = "id";
/** Paling banyak paragraf (badan + catatan kaki) satu bagian yang dibaca; Kitab al-'Ilm ±1.500. */
export const CONTENT_SECTION_MAX_PASSAGES = 6_000;
/** Paragraf lebih pendek dari ini kemungkinan judul atau subjudul, bukan isi. */
export const CONTENT_SHORT_PASSAGE = 40;

/** JSON dengan kunci terurut (sidik draf tidak bergantung urutan kunci). */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Sidik isi draf: format, jenis, edisi, bagian, versi, dan isi (tanpa status, asal, periksa). */
export function contentDraftSha256(d: ContentDraft): Promise<string> {
  const { format, jenis, edition_id, section_id, versi, isi } = d;
  return textSha256(canonicalJson({ format, jenis, edition_id, section_id, versi, isi }));
}

const pathOf = (path: readonly PropertyKey[]): string =>
  path.reduce<string>(
    (out, key) =>
      typeof key === "number"
        ? `${out}[${key}]`
        : out === ""
          ? String(key)
          : `${out}.${String(key)}`,
    "",
  );

class Issues {
  errors: ContentIssue[] = [];
  warnings: ContentIssue[] = [];
  error(code: string, path: string, message: string): void {
    this.errors.push({ code, path, message });
  }
  warn(code: string, path: string, message: string): void {
    this.warnings.push({ code, path, message });
  }
}

/** Jumlah gagasan Intisari Bab: bab induk 3–7, selain itu menurut panjang teks (`leafPointRange`). */
function pointRange(bodyChars: number, hasChildren: boolean): readonly [number, number] {
  if (hasChildren) return [3, 7];
  const r = leafPointRange(bodyChars);
  return [r.min, r.max];
}

interface Section {
  node: TocNodeRow;
  hasChildren: boolean;
  passages: PassageWithPageRow[];
  byId: Map<number, PassageWithPageRow>;
  body: PassageWithPageRow[];
}

async function loadSection(db: D1Db, node: TocNodeRow, issues: Issues): Promise<Section> {
  const [children, passages] = await Promise.all([
    getTocChildren(db, node.edition_id, node.id),
    getSectionPassages(db, node.id, null, CONTENT_SECTION_MAX_PASSAGES),
  ]);
  if (passages.length === CONTENT_SECTION_MAX_PASSAGES) {
    issues.warn("section_truncated", "section_id", "bagian sangat panjang; hanya sebagian dibaca");
  }
  return {
    node,
    hasChildren: children.length > 0,
    passages,
    byId: new Map(passages.map((p) => [p.id, p])),
    body: passages.filter((p) => p.kind === "body"),
  };
}

/** Paragraf dasar: harus paragraf badan di bagian ini atau sub-bagiannya. */
function checkBasis(s: Section, ids: readonly number[], path: string, issues: Issues): void {
  ids.forEach((pid, j) => {
    const p = s.byId.get(pid);
    if (p === undefined) {
      issues.error("outside_section", `${path}[${j}]`, `paragraf ${pid} tidak ada di bagian ini`);
    } else if (p.kind !== "body") {
      issues.error("not_body", `${path}[${j}]`, `paragraf ${pid} catatan kaki, bukan teks badan`);
    } else if (p.text_raw.length < CONTENT_SHORT_PASSAGE) {
      issues.warn("short_basis", `${path}[${j}]`, `paragraf ${pid} sangat pendek (judul?)`);
    }
  });
}

interface QuoteRef {
  gagasan: number;
  passage_id: number;
  char_start: number;
  char_end: number;
}

async function checkQuotes(
  db: D1Db,
  s: Section,
  quotes: readonly QuoteRef[],
  basisOf: (point: number) => readonly number[],
  issues: Issues,
): Promise<void> {
  if (quotes.length === 0) return;
  const ids = [...new Set(quotes.map((q) => q.passage_id))];
  // Pemeriksa kutipan yang sama dengan build (`quoteInspector`): penanda di dalam atau sesudah
  // kutipan, termasuk penanda pertama di paragraf berikutnya bagian ini (riwayat panjang).
  const bodyIds = s.body.map((p) => p.id);
  const [ayat, refs] = await Promise.all([loadAyahRefs(db, ids), getFootnoteRefs(db, bodyIds)]);
  const missing = [...new Set(refs.map((r) => r.footnote_passage_id))].filter(
    (id) => !s.byId.has(id),
  );
  const extraFeet = await getPassagesByIds(db, missing);
  const passages = [...s.passages, ...extraFeet];
  const pages = new Map(
    passages.map((p) => [p.page_id, { id: p.page_id, juz: p.juz, page_no: p.page_no }]),
  );
  const inspect = quoteInspector({
    passage: passages,
    footnote_ref: refs,
    page: [...pages.values()],
  });
  quotes.forEach((q, i) => {
    const at = `isi.kutipan[${i}]`;
    const p = s.byId.get(q.passage_id);
    if (p === undefined) {
      issues.error(
        "outside_section",
        `${at}.passage_id`,
        `paragraf ${q.passage_id} tidak ada di bagian ini`,
      );
      return;
    }
    if (p.kind !== "body") {
      issues.error("not_body", `${at}.passage_id`, "kutipan hanya dari teks badan");
      return;
    }
    if (q.char_end > p.text_raw.length || q.char_start >= q.char_end) {
      issues.error("quote_range", at, `rentang di luar teks (panjang ${p.text_raw.length})`);
      return;
    }
    if (!isQuoteSpan(p.text_raw, q.char_start, q.char_end)) {
      issues.error("quote_boundary", at, "rentang memotong kata; pakai offset dari verify_quote");
    }
    const touches = (ayat?.get(p.id) ?? []).some(
      (r) => q.char_start < r.char_end && r.char_start < q.char_end,
    );
    if (touches)
      issues.error("quote_ayah", at, "kutipan menyentuh ayat; ayat hanya tampil dari Tanzil");
    const verdict = inspect({ passageId: q.passage_id, start: q.char_start, end: q.char_end });
    if (verdict.banned !== null) {
      issues.error("quote_weak_report", at, `riwayat tidak boleh dikutip (${verdict.banned})`);
    }
    if (!basisOf(q.gagasan).includes(q.passage_id)) {
      issues.warn("quote_outside_basis", at, "paragraf kutipan tidak ada di dasar gagasannya");
    }
  });
}

async function checkTerms(db: D1Db, keys: readonly string[], issues: Issues): Promise<void> {
  if (keys.length === 0) return;
  const known = new Set(await listGlossaryTermKeys(db, CONTENT_LANG));
  keys.forEach((k, i) => {
    if (!known.has(k))
      issues.error("unknown_term", `isi.istilah[${i}]`, `istilah "${k}" tidak ada di glosarium`);
  });
}

/** Turunan node (tanpa node itu sendiri) dan anak langsung, dari seluruh daftar isi edisi. */
function subtreeOf(nodes: readonly TocNodeWithStartRow[], rootId: number) {
  const kids = new Map<number, number[]>();
  for (const n of nodes) {
    if (n.parent_id === null) continue;
    kids.set(n.parent_id, [...(kids.get(n.parent_id) ?? []), n.id]);
  }
  const owner = new Map<number, number>(); // turunan → anak langsung root pemiliknya
  const walk = (id: number, top: number) => {
    for (const k of kids.get(id) ?? []) {
      owner.set(k, top);
      walk(k, top);
    }
  };
  for (const child of kids.get(rootId) ?? []) {
    owner.set(child, child);
    walk(child, child);
  }
  return { owner, children: kids.get(rootId) ?? [] };
}

/** Urutan baca daftar isi (pre-order menurut `ord`). */
function readingOrder(nodes: readonly TocNodeWithStartRow[]): Map<number, number> {
  const kids = new Map<number | null, TocNodeWithStartRow[]>();
  for (const n of nodes) kids.set(n.parent_id, [...(kids.get(n.parent_id) ?? []), n]);
  const order = new Map<number, number>();
  const walk = (parent: number | null) => {
    for (const n of (kids.get(parent) ?? []).toSorted((a, b) => a.ord - b.ord)) {
      order.set(n.id, order.size);
      walk(n.id);
    }
  };
  walk(null);
  return order;
}

async function sourceSha(passages: readonly PassageWithPageRow[]): Promise<string> {
  const parts = [...passages].sort((a, b) => a.id - b.id).map((p) => `${p.id}\n${p.text_raw}\n`);
  return textSha256(parts.join(""));
}

const aiChars = (texts: readonly string[]) => texts.reduce((n, t) => n + t.length, 0);

interface IntisariContent {
  inti: string;
  ringkasan: string;
  gagasan: readonly { judul: string; isi: string; dasar: readonly number[] }[];
  kutipan: readonly QuoteRef[];
  istilah: readonly string[];
}

/** Bagian bersama Intisari Bab dan Kitab: dasar, kutipan, istilah, cakupan jangkar. */
async function checkIntisari(db: D1Db, s: Section, isi: IntisariContent, issues: Issues) {
  isi.gagasan.forEach((g, i) => checkBasis(s, g.dasar, `isi.gagasan[${i}].dasar`, issues));
  await checkQuotes(db, s, isi.kutipan, (k) => isi.gagasan[k - 1]?.dasar ?? [], issues);
  await checkTerms(db, isi.istilah, issues);
  const content = s.body.filter((p) => p.text_raw.length >= CONTENT_SHORT_PASSAGE);
  const anchoredIds = new Set(isi.gagasan.flatMap((g) => g.dasar));
  const anchored = content.filter((p) => anchoredIds.has(p.id)).length;
  const bodyCount = content.length;
  return {
    anchored,
    bodyCount,
    coverage: bodyCount === 0 ? null : Math.round((anchored / bodyCount) * 1000) / 1000,
    texts: [isi.inti, isi.ringkasan, ...isi.gagasan.flatMap((g) => [g.judul, g.isi])],
  };
}

/** Intisari Kitab: setiap `bab` di dalam Kitab, dan setiap anak langsung Kitab dirujuk. */
async function checkKitabChapters(
  db: D1Db,
  kitab: TocNodeRow,
  gagasan: readonly { bab: readonly number[] }[],
  issues: Issues,
): Promise<void> {
  const { owner, children } = subtreeOf(await listTocNodes(db, kitab.edition_id), kitab.id);
  const covered = new Set<number>();
  gagasan.forEach((g, i) => {
    g.bab.forEach((b, j) => {
      const top = owner.get(b);
      if (top === undefined) {
        issues.error(
          "outside_kitab",
          `isi.gagasan[${i}].bab[${j}]`,
          `bab ${b} bukan bagian Kitab ini`,
        );
      } else {
        covered.add(top);
      }
    });
  });
  const missing = children.filter((c) => !covered.has(c));
  if (missing.length > 0) {
    issues.error(
      "uncovered_chapter",
      "isi.gagasan",
      `bab berikut belum dirujuk gagasan mana pun: ${missing.join(", ")}`,
    );
  }
}

/**
 * Periksa satu draf (masukan bebas: hasil `JSON.parse` berkas atau argumen tool). Tidak pernah
 * melempar untuk draf buruk: semua masalah kembali sebagai `errors` (gagal) atau `warnings`.
 */
export async function checkContentDraft(
  db: D1Db,
  input: unknown,
  now: () => Date = () => new Date(),
): Promise<ContentCheck> {
  const issues = new Issues();
  const empty = (): ContentCheck => ({
    ok: false,
    rules: CONTENT_RULES,
    kind: null,
    section: null,
    errors: issues.errors,
    warnings: issues.warnings,
    facts: null,
    stamp: null,
  });
  const parsed = contentDraft.safeParse(input);
  if (!parsed.success) {
    for (const i of parsed.error.issues) issues.error("schema", pathOf(i.path), i.message);
    return empty();
  }
  const d = parsed.data;
  const lint = lintContent(d);
  issues.errors.push(...lint.errors);
  issues.warnings.push(...lint.warnings);

  const node = await getTocNode(db, d.section_id);
  if (node === null) {
    issues.error("unknown_section", "section_id", `bagian ${d.section_id} tidak ada`);
    return { ...empty(), kind: d.jenis };
  }
  if (node.edition_id !== d.edition_id) {
    issues.error(
      "edition_mismatch",
      "edition_id",
      `bagian ${node.id} milik edisi ${node.edition_id}`,
    );
  }
  const cite = await loadCiteContext(db, node.edition_id);
  const s = await loadSection(db, node, issues);
  const tier = digestTierOf(node.level, s.hasChildren);
  const wantBook = d.jenis === "intisari-kitab" || d.jenis === "jalur";
  if (d.jenis !== "faedah" && (tier === "book") !== wantBook) {
    issues.error(
      "wrong_tier",
      "section_id",
      wantBook
        ? "bagian ini bukan Kitab; pakai intisari-bab"
        : "bagian ini Kitab; pakai intisari-kitab",
    );
  }

  let jalurSource: string[] = [];
  let faedahSource: string[] = [];
  let anchored: number | null = null;
  let bodyCount: number | null = null;
  let coverage: number | null = null;
  let minutes: number | null = null;

  switch (d.jenis) {
    case "intisari-bab": {
      const r = await checkIntisari(db, s, d.isi, issues);
      ({ anchored, bodyCount, coverage } = r);
      const [lo, hi] = pointRange(aiChars(s.body.map((p) => p.text_raw)), s.hasChildren);
      if (d.isi.gagasan.length < lo || d.isi.gagasan.length > hi) {
        issues.error(
          "point_count",
          "isi.gagasan",
          `${d.isi.gagasan.length} gagasan; untuk bagian ini ${lo}–${hi}`,
        );
      }
      // Ambang 50% dikecilkan untuk bagian panjang: paling banyak gagasanMax × dasarMax paragraf
      // bisa dijangkar (bab induk 117 paragraf → ±36%), jadi ambangnya 60% dari yang mungkin.
      const possible =
        bodyCount === null || bodyCount === 0
          ? 1
          : Math.min(
              1,
              (CONTENT_LIMITS.intisariBab.gagasanMax * CONTENT_LIMITS.intisariBab.dasarMax) /
                bodyCount,
            );
      const threshold = Math.min(CONTENT_LIMITS.coverageWarn, 0.6 * possible);
      if (coverage !== null && coverage < threshold) {
        issues.warn(
          "low_coverage",
          "isi.gagasan",
          `dasar menjangkar ${anchored} dari ${bodyCount} paragraf isi; periksa bagian yang terlewat`,
        );
      }
      minutes = readingMinutes(aiChars(r.texts));
      break;
    }
    case "intisari-kitab": {
      const r = await checkIntisari(db, s, d.isi, issues);
      ({ anchored, bodyCount, coverage } = r);
      await checkKitabChapters(db, node, d.isi.gagasan, issues);
      minutes = readingMinutes(aiChars([...r.texts, d.isi.pembuka, d.isi.penutup]));
      break;
    }
    case "faedah":
      faedahSource = await checkFaedah(db, s, d.isi.butir, issues);
      break;
    case "jalur":
      jalurSource = await checkJalur(db, node, d.isi.hari, issues);
      break;
  }

  // Sidik sumber (berubah = draf basi): Intisari = seluruh paragraf badan bagian (teks berubah di
  // mana pun, ringkasannya ditinjau ulang); Faedah = paragraf + terjemahan yang disalin kode;
  // Jalur = bagian per hari + kepala Intisari-nya.
  const sourceSha256 =
    d.jenis === "jalur"
      ? await textSha256(`jalur\n${jalurSource.join("\n")}`)
      : d.jenis === "faedah"
        ? await textSha256(faedahSource.join("\n"))
        : await sourceSha(s.body);
  const draftSha256 = await contentDraftSha256(d);
  const ok = issues.errors.length === 0;
  return {
    ok,
    rules: CONTENT_RULES,
    kind: d.jenis,
    section: {
      id: node.id,
      title_ar: node.title_ar,
      level: node.level,
      permalink: sectionPermalink(cite.path, node.id),
    },
    errors: issues.errors,
    warnings: issues.warnings,
    facts: {
      source_sha256: sourceSha256,
      draft_sha256: draftSha256,
      anchored_passages: anchored,
      body_passages: bodyCount,
      coverage,
      reading_minutes: minutes,
    },
    stamp: ok
      ? {
          aturan: CONTENT_RULES,
          lolos: true,
          sumber_sha256: sourceSha256,
          draf_sha256: draftSha256,
          waktu: now().toISOString(),
        }
      : null,
  };
}

/** Terjemahan yang dibuka kata sambung atau urutan daftar: potongan, bukan gagasan utuh. */
const FRAGMENT_OPENER =
  /^(?:(?:dan|atau|lalu|kemudian|adapun|sedangkan|tetapi|namun|maka|yang\s+(?:pertama|kedua|ketiga|keempat|kelima|terakhir))\b|(?:pertama|kedua|ketiga|keempat|kelima)\s*[,:])/iu;

// ── Faedah ───────────────────────────────────────────────────────────────────────────────────

/** Alasan sebuah paragraf tidak layak jadi Faedah (kosong = layak). Dipakai cek dan daftar calon. */
export interface FaedahFacts {
  ayah: boolean;
  footnote: boolean;
  needsReview: boolean;
  translation: TranslationRow | null;
  notAuthor: boolean;
  /** Paragraf dijangkar gagasan Intisari yang tampil, jadi sikap penulisnya diketahui. */
  stanceChecked: boolean;
}

export function faedahProblems(p: PassageWithPageRow, f: FaedahFacts): string[] {
  const out: string[] = [];
  if (p.kind !== "body") out.push("not_body");
  if (f.ayah) out.push("faedah_ayah");
  if (f.footnote) out.push("faedah_footnote");
  if (f.needsReview) out.push("faedah_needs_review");
  if (f.notAuthor) out.push("faedah_not_author");
  const t = f.translation;
  if (t === null || t.review_status === "rejected") {
    out.push("faedah_no_translation");
  } else {
    if (hasArabicLetters(t.text) || t.text.includes("⟦")) out.push("faedah_translation_arabic");
    const [lo, hi] = CONTENT_LIMITS.faedah.terjemahan;
    const n = wordCount(t.text);
    if (n < lo || n > hi) out.push("faedah_translation_length");
  }
  return out;
}

export const FAEDAH_PROBLEM_MESSAGE: Readonly<Record<string, string>> = {
  not_body: "bukan teks badan",
  faedah_ayah: "memuat ayat (ayat tidak boleh lewat terjemahan AI)",
  faedah_footnote: "memuat penanda catatan kaki/hadits (daftar putih v1: tanpa hadits)",
  faedah_needs_review: "paragraf ditandai perlu ditinjau",
  faedah_not_author: "Intisari menandai paragraf ini sebagai pendapat yang dinukil atau dibantah",
  faedah_no_translation: "belum ada terjemahan yang tampil",
  faedah_translation_arabic: "terjemahan memuat huruf Arab atau placeholder ayat",
  faedah_translation_length: `terjemahan di luar ${CONTENT_LIMITS.faedah.terjemahan.join("–")} kata`,
};

/** Fakta Faedah sekumpulan paragraf: ayat, catatan kaki, tanda tinjau, terjemahan, sikap Intisari. */
export async function loadFaedahFacts(
  db: D1Db,
  passages: readonly PassageWithPageRow[],
  sectionId: number,
): Promise<Map<number, FaedahFacts>> {
  const ids = passages.map((p) => p.id);
  const nodes = [...new Set([sectionId, ...passages.map((p) => p.toc_node_id ?? sectionId)])];
  const [ayat, refs, flags, translations, digests] = await Promise.all([
    loadAyahRefs(db, ids),
    getFootnoteRefs(db, ids),
    getNeedsReview(db, ids),
    getTranslations(db, ids, CONTENT_LANG),
    Promise.all(nodes.map((n) => getDigest(db, n, CONTENT_LANG))),
  ]);
  const notAuthor = new Set<number>();
  // Sikap hanya diketahui untuk paragraf yang dijangkar gagasan yang tampil; paragraf lain di
  // bagian ber-Intisari tetap "belum dicek" (peninjau X23).
  const anchored = new Set<number>();
  for (const rows of digests) {
    if (rows === null || rows.digest.review_status === "rejected") continue;
    const stance = new Map(rows.points.map((p) => [p.ord, p]));
    for (const a of rows.anchors) {
      const point = stance.get(a.point_ord);
      if (point === undefined || point.review_status === "rejected") continue;
      anchored.add(a.passage_id);
      if (point.stance !== "author") notAuthor.add(a.passage_id);
    }
  }
  const tBy = new Map(translations.map((t) => [t.passage_id, t]));
  return new Map(
    passages.map((p) => [
      p.id,
      {
        ayah: (ayat?.get(p.id) ?? []).length > 0,
        footnote: refs.some((r) => r.passage_id === p.id),
        needsReview: flags.some((f) => f.passage_id === p.id),
        translation: tBy.get(p.id) ?? null,
        notAuthor: notAuthor.has(p.id),
        stanceChecked: anchored.has(p.id),
      },
    ]),
  );
}

async function checkFaedah(
  db: D1Db,
  s: Section,
  butir: readonly { passage_id: number }[],
  issues: Issues,
): Promise<string[]> {
  const found: PassageWithPageRow[] = [];
  butir.forEach((b, i) => {
    const p = s.byId.get(b.passage_id);
    if (p === undefined) {
      issues.error(
        "outside_section",
        `isi.butir[${i}].passage_id`,
        `paragraf ${b.passage_id} tidak ada di bagian ini`,
      );
    } else {
      found.push(p);
    }
  });
  const facts = await loadFaedahFacts(db, found, s.node.id);
  butir.forEach((b, i) => {
    const p = s.byId.get(b.passage_id);
    const f = facts.get(b.passage_id);
    if (p === undefined || f === undefined) return;
    for (const code of faedahProblems(p, f)) {
      issues.error(code, `isi.butir[${i}].passage_id`, FAEDAH_PROBLEM_MESSAGE[code] ?? code);
    }
    const opener = f.translation?.text.trim() ?? "";
    if (FRAGMENT_OPENER.test(opener)) {
      issues.warn(
        "faedah_fragment",
        `isi.butir[${i}].passage_id`,
        "terjemahan dibuka kata sambung atau urutan daftar; pastikan utuh dibaca sendiri, atau jelaskan di konteks",
      );
    }
    if (!f.stanceChecked) {
      issues.warn(
        "stance_unchecked",
        `isi.butir[${i}].passage_id`,
        "sikap paragraf ini belum dicek Intisari mana pun; pastikan ini pendapat al-Ghazali sendiri",
      );
    }
  });
  return found
    .toSorted((a, b) => a.id - b.id)
    .map((p) => `${p.id}\n${p.text_raw}\n${facts.get(p.id)?.translation?.text ?? ""}`);
}

// ── Jalur ────────────────────────────────────────────────────────────────────────────────────

async function checkJalur(
  db: D1Db,
  kitab: TocNodeRow,
  hari: readonly { section_id: number }[],
  issues: Issues,
): Promise<string[]> {
  const nodes = await listTocNodes(db, kitab.edition_id);
  const { owner } = subtreeOf(nodes, kitab.id);
  const order = readingOrder(nodes);
  const headers = new Map(
    (
      await getDigestHeaders(
        db,
        hari.map((h) => h.section_id),
        CONTENT_LANG,
      )
    ).map((h) => [h.toc_node_id, h]),
  );
  let last = -1;
  hari.forEach((h, i) => {
    const at = `isi.hari[${i}].section_id`;
    if (!owner.has(h.section_id)) {
      issues.error("outside_kitab", at, `bagian ${h.section_id} bukan bagian Kitab ini`);
      return;
    }
    const head = headers.get(h.section_id);
    if (head === undefined || head.points === 0) {
      issues.error(
        "day_without_digest",
        at,
        `bagian ${h.section_id} belum punya Intisari yang tampil`,
      );
    }
    const pos = order.get(h.section_id) ?? -1;
    if (pos < last) issues.warn("day_out_of_order", at, "urutan hari tidak mengikuti urutan kitab");
    last = Math.max(last, pos);
  });
  return hari.map((h) => {
    const head = headers.get(h.section_id);
    return `${h.section_id}:${head?.points ?? 0}:${head?.chars ?? 0}`;
  });
}

/**
 * Calon Faedah satu bagian (MCP `list_faedah_candidates`): paragraf badan dalam urutan baca beserta
 * terjemahan AI berlabel yang kelak disalin kode, jumlah kata, dan alasan tidak layak. Model memilih
 * dari daftar ini; teks terjemahan tidak pernah ditulis ulang di berkas draf.
 */
export async function listFaedahCandidates(
  db: D1Db,
  input: FaedahCandidatesInput,
): Promise<FaedahCandidates> {
  const args = parseInput(faedahCandidatesInput, input);
  const node = await getTocNode(db, args.section_id);
  if (node === null) throw new NotFound(`Section not found: ${args.section_id}`);
  const cite = await loadCiteContext(db, node.edition_id);
  const body = (await getSectionPassages(db, node.id, null, CONTENT_SECTION_MAX_PASSAGES)).filter(
    (p) => p.kind === "body" && p.text_raw.length >= CONTENT_SHORT_PASSAGE,
  );
  const facts = await loadFaedahFacts(db, body, node.id);
  const all = body.map((p) => {
    const f = facts.get(p.id);
    const reasons = f === undefined ? ["faedah_no_translation"] : faedahProblems(p, f);
    return { p, f, reasons };
  });
  const listed = args.include_ineligible ? all : all.filter((c) => c.reasons.length === 0);
  const page = listed.slice(args.offset, args.offset + args.limit);
  const translations = page.flatMap((c) =>
    c.f?.translation === null || c.f === undefined ? [] : [c.f.translation],
  );
  const reviewers = await reviewersFor(db, translations, CONTENT_LANG);
  const next = args.offset + page.length;
  return {
    section: {
      id: node.id,
      title_ar: node.title_ar,
      level: node.level,
      permalink: sectionPermalink(cite.path, node.id),
    },
    total: listed.length,
    offset: args.offset,
    next_offset: next < listed.length ? next : null,
    candidates: page.map(({ p, f, reasons }) => {
      const t = f?.translation ?? null;
      return {
        passage_id: p.id,
        anchor: passageAnchor(p.id),
        location: cite.location(p.juz, p.page_no, p.id),
        words: t === null ? null : wordCount(t.text),
        eligible: reasons.length === 0,
        reasons,
        translation: t === null ? null : translationView(t, reviewers.get(p.id)),
      };
    }),
  };
}

// ── Kesiapan berkas di repo (CLI `konten`, CI) ───────────────────────────────────────────────

/**
 * Masalah kesiapan satu berkas draf tanpa membaca DB: cap cek kode harus cocok dengan isi (isi tidak
 * diubah sesudah dicek), dan status `siap` hanya sesudah tiga lapis lolos tanpa satu pun Salah.
 */
export async function readinessIssues(d: ContentDraft): Promise<ContentIssue[]> {
  const out: ContentIssue[] = [];
  const kode = d.periksa.kode;
  if (kode !== null && kode.draf_sha256 !== (await contentDraftSha256(d))) {
    out.push({
      code: "stamp_mismatch",
      path: "periksa.kode.draf_sha256",
      message: "isi berubah sesudah dicek; jalankan cek ulang",
    });
  }
  const indep = d.periksa.independen;
  if (indep !== null && indep.draf_sha256 !== (await contentDraftSha256(d))) {
    out.push({
      code: "review_stale",
      path: "periksa.independen.draf_sha256",
      message: "isi berubah sesudah periksa independen; ulangi lapis 3",
    });
  }
  if (d.status === "siap") {
    if (kode === null || !kode.lolos || kode.aturan !== CONTENT_RULES) {
      out.push({
        code: "not_checked",
        path: "periksa.kode",
        message: `status siap butuh cap cek kode ${CONTENT_RULES} yang lolos`,
      });
    }
    if (d.periksa.independen === null) {
      out.push({
        code: "no_independent_review",
        path: "periksa.independen",
        message: "status siap butuh periksa independen",
      });
    }
    const salah = [...d.periksa.mandiri, ...(d.periksa.independen?.nilai ?? [])].filter(
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
