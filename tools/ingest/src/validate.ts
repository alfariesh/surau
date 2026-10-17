// Validasi otomatis hasil ingest (S07 langkah 5). Invarian struktural yang dilanggar membuat ingest
// GAGAL; sisanya angka untuk laporan. Laporan tidak memuat teks kitab: hanya angka, ID, dan rujukan
// juz/halaman.
import { normalizeArabic } from "@surau/text";

import type { MatanCheck, TakhrijCheck } from "./openiti/verify.ts";
import { MATAN_THRESHOLD } from "./openiti/verify.ts";
import { EXACT_RATIO_MIN, NUMBERING_MISMATCH_MAX } from "./quran/rows.ts";
import type { AyatBuild } from "./quran/rows.ts";
import type { CorpusRows } from "./rows.ts";
import type { ParsedPage } from "./shamela/page.ts";
import type { ShamelaSource } from "./shamela/source.ts";
import { MAX_STATEMENT_BYTES } from "./sql.ts";
import type { TocBuild } from "./toc.ts";
import type { WorkConfig } from "./works/ihya.ts";
import type { LlmStats } from "./llm/attach.ts";

export interface Invariant {
  name: string;
  ok: boolean;
  detail: string;
}

export interface LengthStats {
  count: number;
  min: number;
  p50: number;
  p90: number;
  p99: number;
  max: number;
}

export interface Validation {
  ok: boolean;
  invariants: Invariant[];
  toc: {
    nodes: number;
    patched: number;
    rub: { title: number; at: string; kitab: number }[];
    spanless: string[];
    pageMismatch: number[];
    midParagraph: number;
  };
  passages: {
    body: LengthStats;
    foot: LengthStats;
    footFromSection: number;
    footInline: number;
    multiLineFoot: number;
  };
  footnotes: {
    refs: number;
    linked: number;
    orphanRefs: string[];
    orphanNotes: number;
    orphanNotesInInline: number;
    /** Penanda di dalam takhrij menempel (tidak ditautkan). */
    inlineMarkers: number;
  };
  inline: {
    pages: number;
    after: number;
    before: number;
    unsplit: string[];
    longAfter: string[];
  };
  review: { reason: string; passages: number }[];
  reviewPassages: number;
  unknownTags: string[];
}

/** Rujukan halaman cetak untuk laporan. */
export const cite = (p: ParsedPage): string => `j${p.source.juz} h${p.source.pageNo}`;

/** Potongan takhrij "sesudah //" sepanjang ini kemungkinan ikut membawa matan lanjutan. */
export const LONG_INLINE_CHARS = 400;

export function lengthStats(lengths: readonly number[]): LengthStats {
  const s = [...lengths].sort((a, b) => a - b);
  const at = (q: number): number => s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? 0;
  return {
    count: s.length,
    min: s[0] ?? 0,
    p50: at(0.5),
    p90: at(0.9),
    p99: at(0.99),
    max: s.at(-1) ?? 0,
  };
}

export interface ValidateInput {
  config: WorkConfig;
  source: ShamelaSource;
  pages: readonly ParsedPage[];
  toc: TocBuild;
  matan: MatanCheck;
  takhrij: TakhrijCheck;
  rows: CorpusRows;
  ayat: AyatBuild;
  /** Hasil batch LLM yang dimuat (S13); null = korpus dibangun tanpa path hasil LLM. */
  llm: LlmStats | null;
}

export function validate(input: ValidateInput): Validation {
  const { config, source, pages, toc, matan, rows, ayat, llm } = input;
  const exp = config.expect;
  const invariants: Invariant[] = [];
  const check = (name: string, ok: boolean, detail: string): void => {
    invariants.push({ name, ok, detail });
  };

  check("Jumlah halaman", pages.length === exp.pages, `${pages.length} (harapan ${exp.pages})`);
  const perJuz = exp.volumes.map((_, i) => pages.filter((p) => p.source.juz === i + 1).length);
  const juzOk =
    perJuz.join("/") === exp.volumes.join("/") &&
    perJuz.reduce((a, b) => a + b, 0) === pages.length;
  check("Halaman per juz", juzOk, `${perJuz.join("/")} (harapan ${exp.volumes.join("/")})`);
  const citations = new Set(pages.map((p) => `${p.source.juz}:${p.source.pageNo}`));
  check(
    "(juz, halaman) unik",
    citations.size === pages.length,
    `${pages.length - citations.size} ganda`,
  );
  check(
    "Jumlah judul sumber",
    source.titles.length === exp.titles,
    `${source.titles.length} (harapan ${exp.titles})`,
  );

  const childCount = (key: string): number => toc.nodes.filter((n) => n.parentKey === key).length;
  const rub = exp.rub.map((title) => {
    const node = toc.nodes.find((n) => n.key === `t${title}`);
    const page = node === undefined ? undefined : pages[node.pageIndex];
    return {
      title,
      at: page === undefined ? "-" : cite(page),
      kitab: node === undefined || node.level !== 1 ? -1 : childCount(node.key),
    };
  });
  check(
    `${exp.rub.length} rub' × ${exp.kitabPerRub} kitab setelah patch`,
    rub.every((r) => r.kitab === exp.kitabPerRub),
    rub.map((r) => `t${r.title}: ${r.kitab}`).join(", "),
  );
  const orphanIssues = toc.issues.filter((i) => !i.startsWith("urutan halaman"));
  check(
    "Daftar isi utuh (tanpa judul yatim, siklus, atau patch gagal)",
    orphanIssues.length === 0 && toc.unknownSpans.length === 0,
    orphanIssues.length + toc.unknownSpans.length === 0
      ? "0 masalah"
      : [...orphanIssues, ...toc.unknownSpans.map((id) => `span judul tak dikenal ${id}`)].join(
          "; ",
        ),
  );
  const order = toc.issues.filter((i) => i.startsWith("urutan halaman"));
  check("Urutan halaman daftar isi monoton", order.length === 0, order.join("; ") || "ya");
  const longest = rows.passage.reduce(
    (max, p) => Math.max(max, Buffer.byteLength(p.text_raw, "utf8")),
    0,
  );
  const empty = rows.passage.filter((p) => p.text_raw.trim() === "").length;
  check(
    "Paragraf tidak kosong dan muat satu statement D1",
    empty === 0 && longest < MAX_STATEMENT_BYTES,
    `${empty} kosong; terpanjang ${longest} byte (batas ${MAX_STATEMENT_BYTES})`,
  );
  // Pemisahan `//` hanya memindah potongan teks: setiap penanda (١) di teks badan utuh harus ada di
  // matan atau di takhrij menempel.
  const lost = pages.filter((p) => p.markers.total !== p.markers.body + p.markers.inline);
  check(
    "Penanda (١) tidak hilang saat takhrij dipisah",
    lost.length === 0,
    lost.length === 0 ? "ya" : lost.map(cite).join(", "),
  );
  // Integritas lintas tabel (serah terima S06): halaman dan node satu edisi dengan paragrafnya;
  // footnote_ref dari paragraf badan ke catatan kaki di halaman yang sama.
  const pageEdition = new Map(rows.page.map((p) => [p.id, p.edition_id]));
  const nodeEdition = new Map(rows.toc_node.map((n) => [n.id, n.edition_id]));
  const byId = new Map(rows.passage.map((p) => [p.id, p]));
  const crossEdition = rows.passage.filter(
    (p) =>
      pageEdition.get(p.page_id) !== p.edition_id ||
      p.toc_node_id === null ||
      nodeEdition.get(p.toc_node_id) !== p.edition_id,
  ).length;
  const badRefs = rows.footnote_ref.filter((r) => {
    const from = byId.get(r.passage_id);
    const to = byId.get(r.footnote_passage_id);
    return from?.kind !== "body" || to?.kind !== "foot" || from.page_id !== to.page_id;
  }).length;
  check(
    "Integritas lintas tabel (edisi halaman/node = edisi paragraf; penanda badan → catatan kaki halaman sama)",
    crossEdition === 0 && badRefs === 0,
    `${crossEdition} paragraf beda edisi atau tanpa node; ${badRefs} footnote_ref salah arah`,
  );
  check(
    `Matan = OpenITI (≥${String(MATAN_THRESHOLD).replace(".", ",")} per halaman)`,
    matan.passed >= exp.matanMinPages && matan.missing.length === 0,
    `${matan.passed}/${pages.length} halaman (gerbang ≥${exp.matanMinPages}); ${matan.missing.length} halaman tidak ada di OpenITI`,
  );

  // Ayat (S12): sumber Qur'an lengkap dan konsisten, rujukan menunjuk potongan teks yang sah.
  const ayahCount = rows.quran_surah.reduce((a, s) => a + s.ayah_count, 0);
  check(
    "Sumber Qur'an utuh (ayat = jumlah per surah; terjemahan + transliterasi tiap ayat; penomoran QUL = Tanzil)",
    rows.quran_ayah.length === ayahCount &&
      rows.quran_translation.length === 2 * ayahCount &&
      ayat.numberingMismatch.length <= NUMBERING_MISMATCH_MAX,
    `${rows.quran_surah.length} surah, ${rows.quran_ayah.length}/${ayahCount} ayat, ${rows.quran_translation.length} baris terjemahan/transliterasi; ${ayat.numberingMismatch.length} ayat beda teks QUL vs Tanzil (batas ${NUMBERING_MISMATCH_MAX})`,
  );
  const ayahKeys = new Set(rows.quran_ayah.map((a) => `${a.surah}:${a.ayah}`));
  let badAyahRefs = 0;
  let prev: { passage: number; end: number } | null = null;
  for (const r of rows.passage_ayah_ref) {
    const text = byId.get(r.passage_id)?.text_raw;
    const overlap = prev !== null && prev.passage === r.passage_id && r.char_start < prev.end;
    if (
      text === undefined ||
      r.char_end > text.length ||
      text.slice(r.char_start, r.char_end).trim() !== text.slice(r.char_start, r.char_end) ||
      overlap ||
      !ayahKeys.has(`${r.surah}:${r.ayah_from}`) ||
      !ayahKeys.has(`${r.surah}:${r.ayah_to}`)
    ) {
      badAyahRefs++;
    }
    prev = { passage: r.passage_id, end: r.char_end };
  }
  check(
    "Rujukan ayat sah (offset di dalam teks tanpa spasi tepi, tidak tumpang tindih, ayat ada)",
    badAyahRefs === 0,
    `${rows.passage_ayah_ref.length} rujukan; ${badAyahRefs} tidak sah`,
  );
  // Kutipan `exact` harus benar-benar ada di teks ayat rujukannya (simple-clean, setelah
  // normalisasi yang sama); ayat utuh = sama persis. Menjaga pencocok tanpa bergantung tes lokal.
  const ayahText = new Map(rows.quran_ayah.map((a) => [`${a.surah}:${a.ayah}`, a.text_index]));
  const norm = (t: string): string => ` ${normalizeArabic(t).text} `;
  let wrongExact = 0;
  for (const r of rows.passage_ayah_ref) {
    if (r.match !== "exact") continue;
    const text = byId.get(r.passage_id)?.text_raw ?? "";
    const parts: string[] = [];
    for (let a = r.ayah_from; a <= r.ayah_to; a++)
      parts.push(ayahText.get(`${r.surah}:${a}`) ?? "");
    const quote = norm(text.slice(r.char_start, r.char_end));
    const ayat = norm(parts.join(" "));
    if (r.partial === 1 ? !ayat.includes(quote) : ayat !== quote) wrongExact++;
  }
  check(
    "Kutipan exact ada di teks ayat rujukannya (ayat utuh = sama persis)",
    wrongExact === 0,
    `${rows.passage_ayah_ref.filter((r) => r.match === "exact").length} rujukan exact; ${wrongExact} tidak sesuai`,
  );
  const s = ayat.stats;
  check(
    `Kutipan {…} tervalidasi cocok persis ≥${Math.round(EXACT_RATIO_MIN * 100)}%`,
    s.exactRatio >= EXACT_RATIO_MIN,
    `${s.exact}/${s.validated} (${(s.exactRatio * 100).toFixed(1).replace(".", ",")}%); mirip ${s.similar}, tidak cocok ${s.unmatched}`,
  );

  // Terjemahan dan ringkasan AI (S13). Ayat tidak pernah diterjemahkan model: setiap rujukan ayat
  // paragraf yang diterjemahkan harus tampil sebagai segmen Kemenag utuh (`translationSegments`).
  const pctOf = (a: number, b: number) =>
    b === 0 ? "–" : `${((a / b) * 100).toFixed(2).replace(".", ",")}%`;
  const minPct = `${(exp.llmCoverage * 100).toFixed(0)}%`;
  if (llm === null) {
    check(
      "Terjemahan & ringkasan AI dimuat",
      exp.llmCoverage === 0,
      `tanpa path hasil LLM (harapan cakupan ${minPct})`,
    );
  } else {
    check(
      "Terjemahan AI: setiap kutipan ayat diisi terjemahan Kemenag (tidak diterjemahkan model)",
      llm.ayahProblems.length === 0,
      `${llm.withAyat} terjemahan berisi ayat; ${llm.ayahProblems.length} bermasalah${llm.ayahProblems.length > 0 ? `: ${llm.ayahProblems.slice(0, 5).join("; ")}` : ""}`,
    );
    check(
      `Terjemahan AI: cakupan paragraf badan ≥ ${minPct}`,
      llm.translations >= exp.llmCoverage * llm.units,
      `${llm.translations}/${llm.units} (${pctOf(llm.translations, llm.units)}); usang ${llm.staleTranslations}, tidak sah ${llm.invalidTranslations}`,
    );
    check(
      `Ringkasan AI: cakupan bagian × 2 bahasa ≥ ${minPct}`,
      llm.summaries >= exp.llmCoverage * llm.summaryTargets,
      `${llm.summaries}/${llm.summaryTargets} (${pctOf(llm.summaries, llm.summaryTargets)}); usang ${llm.staleSummaries}, tidak sah ${llm.invalidSummaries}`,
    );
  }

  const midParagraph = toc.nodes.filter((n) => {
    const d = pages[n.pageIndex]?.body[n.bodyIndex];
    return n.offset > 0 && d !== undefined && d.start !== n.offset;
  }).length;

  const bodyLens = pages.flatMap((p) => p.body.map((d) => d.text.length));
  const footLens = pages.flatMap((p) => p.foot.map((d) => d.text.length));
  const inlinePages = pages.filter((p) => p.inline.length > 0);
  const inlineAll = pages.flatMap((p) => p.inline.map((i) => ({ p, ...i })));
  const reasons = new Map<string, number>();
  for (const r of rows.passage_needs_review)
    reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);

  return {
    ok: invariants.every((i) => i.ok),
    invariants,
    toc: {
      nodes: toc.nodes.length,
      patched: toc.nodes.filter((n) => n.patched).length,
      rub,
      spanless: toc.spanless.map((id) => {
        const page = pages[toc.nodes.find((n) => n.key === `t${id}`)?.pageIndex ?? -1];
        return `t${id} (${page === undefined ? "-" : cite(page)})`;
      }),
      pageMismatch: toc.pageMismatch,
      midParagraph,
    },
    passages: {
      body: lengthStats(bodyLens),
      foot: lengthStats(footLens),
      footFromSection: pages.reduce((a, p) => a + p.foot.filter((f) => f.line < 0).length, 0),
      footInline: pages.reduce((a, p) => a + p.foot.filter((f) => f.line >= 0).length, 0),
      multiLineFoot: pages.reduce(
        (a, p) => a + p.foot.filter((f) => f.text.includes("\n")).length,
        0,
      ),
    },
    footnotes: {
      refs: pages.reduce((a, p) => a + p.links.length + p.orphanRefs.length, 0),
      linked: pages.reduce((a, p) => a + p.links.length, 0),
      orphanRefs: pages.flatMap((p) => p.orphanRefs.map((m) => `${cite(p)} (${m.number})`)),
      orphanNotes: pages.reduce((a, p) => a + p.orphanNotes, 0),
      orphanNotesInInline: pages.reduce((a, p) => a + p.orphanNotesInInline, 0),
      inlineMarkers: pages.reduce((a, p) => a + p.markers.inline, 0),
    },
    inline: {
      pages: inlinePages.length,
      after: inlineAll.filter((i) => i.direction === "after").length,
      before: inlineAll.filter((i) => i.direction === "before").length,
      unsplit: inlineAll.filter((i) => i.direction === null).map((i) => cite(i.p)),
      longAfter: inlineAll
        .filter((i) => i.direction === "after")
        .filter((i) => {
          const t = i.p.foot.find((f) => f.key === `t${i.line}`);
          return t !== undefined && t.text.length >= LONG_INLINE_CHARS;
        })
        .map((i) => cite(i.p)),
    },
    review: [...reasons.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([reason, n]) => ({ reason, passages: n })),
    reviewPassages: new Set(rows.passage_needs_review.map((r) => r.passage_id)).size,
    unknownTags: [...new Set(pages.flatMap((p) => p.unknownTags))].sort(),
  };
}
