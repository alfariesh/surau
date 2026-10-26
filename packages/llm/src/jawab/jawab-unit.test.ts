// Tes unit Jawab tanpa D1 (project "node"). Teks Arab di sini BUATAN (bukan teks kitab).
import type { CitationContentBlockLocation, Message } from "@anthropic-ai/sdk/resources/messages";
import { takhrijLabel } from "@surau/core";
import type { AnswerPassage, AnswerTocNode } from "@surau/core";
import {
  FTS_MAX_TOKENS,
  LATIN_MAX_TERMS,
  TAKHRIJ_TERMS_VERSION,
  planFtsQuery,
  planLatinQuery,
} from "@surau/text";
import { describe, expect, test } from "vite-plus/test";

import { ANSWER_HADITH_PREFIX, ANSWER_NOT_FOUND } from "../../prompts/answer-v1.ts";
import { ANSWER_FALSE_PREMISE } from "../../prompts/answer-v3.ts";
import { buildAnswerRequest, fitDocs, orderBySection } from "./answer.ts";
import { ROUTE_PROMPT_TOKENS_MAX, jawabReserveUsd, retryReserveUsd } from "./budget.ts";
import {
  SPAN_MAX_CHARS,
  ayahGlossSuspects,
  citationSpans,
  hadithStatements,
  isNotFound,
  pipelineTerms,
  refusalKind,
  repeatedSentences,
  stripArabic,
  stripCiteTags,
  translationCopies,
  uncitedGradings,
} from "./citations.ts";
import { buildDoc, docContext, sectionPath, segmentText, toDocumentBlock } from "./documents.ts";
import {
  MAX_SEARCHES,
  QUESTION_WEIGHT,
  SECTION_LIMIT,
  SEMANTIC_FOOTNOTE_LIMIT,
  SEMANTIC_FOOTNOTE_QUERY,
  SEMANTIC_LIMIT,
  SEMANTIC_QUERY,
  SEMANTIC_WEIGHT,
  fuse,
  questionQuery,
  routePlans,
  semanticList,
  semanticLists,
  summaryPlans,
  withPairs,
} from "./retrieve.ts";
import { HADITH_NOT_CITED, HADITH_UNKNOWN, hadithCheck, hadithClaims } from "./pipeline.ts";
import { buildRouteRequest, parseRoute, tocText } from "./route.ts";

const SENT = "هذه جملة تجريبية طويلة لاختبار التقسيم. ";
const NO_PUNCT = "كلمة تجريبية بلا علامة ";
// Takhrij BUATAN (bukan teks kitab), cukup pendek untuk rentang sitasi 0–12 di tes: "رواه" membuka
// takhrij, "وضعفه" → label "dinilai lemah".
const FOOT = "رواه وضعفه";
const LABEL = takhrijLabel(FOOT).text;
/** Teks label di jawaban: status + lokasi hadits (fixture `passage`: j. 1, h. 55). */
const IN_TEXT = `${LABEL} (hadits di Ihya j. 1, h. 55)`;
/** Label tanpa awalan "Status hadits:" (butir daftar) dibuka huruf kapital. */
const cap = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

function passage(id: number, text: string, over: Partial<AnswerPassage> = {}): AnswerPassage {
  return {
    id,
    edition_id: 1,
    page_id: 100001,
    kind: "body",
    toc_node_id: null,
    ord: 1,
    text_raw: text,
    location: {
      juz: 1,
      page_no: 55,
      permalink: `/kitab/ihya/1/55#p${id % 1000}`,
      label: "Ihya, j. 1, h. 55",
    },
    translation: null,
    footnote_ids: [],
    referenced_by: [],
    ayah_labels: [],
    ...over,
  };
}

function covers(text: string, segs: { start: number; end: number }[]) {
  expect(segs[0]?.start).toBe(0);
  expect(segs.at(-1)?.end).toBe(text.length);
  for (let i = 1; i < segs.length; i++) expect(segs[i]?.start).toBe(segs[i - 1]?.end);
  for (const s of segs) expect(text.slice(s.start, s.end).trim()).not.toBe("");
}

describe("segmentText", () => {
  test("paragraf pendek = satu blok", () => {
    expect(segmentText(SENT)).toEqual([{ start: 0, end: SENT.length }]);
  });

  test("paragraf panjang dipotong di akhir kalimat, bersambung, menutup seluruh teks", () => {
    const text = SENT.repeat(40);
    const segs = segmentText(text);
    expect(segs.length).toBeGreaterThan(3);
    covers(text, segs);
    for (const s of segs.slice(0, -1)) {
      expect(text.slice(s.start, s.end)).toMatch(/\.\s+$/u);
      expect(s.end - s.start).toBeLessThanOrEqual(520);
    }
  });

  test("tanpa tanda baca: dipotong di spasi, tidak di tengah kata", () => {
    const text = NO_PUNCT.repeat(60).trim();
    const segs = segmentText(text);
    covers(text, segs);
    for (const s of segs.slice(0, -1)) expect(text[s.end - 1]).toBe(" ");
  });
});

describe("dokumen dan request", () => {
  const toc = new Map<number, AnswerTocNode>([
    [100001, { id: 100001, parent_id: null, level: 1, title_ar: "ربع تجريبي", juz: 1, page_no: 1 }],
    [
      100002,
      { id: 100002, parent_id: 100001, level: 2, title_ar: "كتاب تجريبي", juz: 1, page_no: 2 },
    ],
  ]);

  test("konteks memuat jenis, bagian, ayat, terjemahan AI berlabel; catatan kaki = takhrij", () => {
    const body = passage(10000001, SENT, {
      toc_node_id: 100002,
      ayah_labels: ["QS 2:153"],
      translation: {
        label: "ai_translation",
        lang: "id",
        model: "m",
        prompt_version: "p",
        created_at: "2026-10-17",
        review_status: "ai_generated",
        human_review: null,
        text: "Kalimat uji.",
      },
    });
    const foot = passage(10000002, "(١) حاشية", { kind: "foot", referenced_by: [10000001] });
    const labels = new Map([[10000001, "Ihya j. 1, h. 55"]]);
    const ctx = docContext(body, toc, labels);
    expect(ctx).toContain("matan Ihya");
    expect(ctx).toContain("ربع تجريبي › كتاب تجريبي");
    expect(ctx).toContain("QS 2:153");
    expect(ctx).toContain("Terjemahan AI");
    expect(docContext(foot, toc, labels)).toContain(
      "takhrij hadits oleh al-'Iraqi untuk hadits di paragraf Ihya j. 1, h. 55",
    );
  });

  test("bagian yang dalam tetap menyebut kitabnya (penilaian agent 2026-10-26)", () => {
    const deep = new Map(toc);
    const node = (id: number, parent: number, level: number, title_ar: string) =>
      deep.set(id, { id, parent_id: parent, level, title_ar, juz: 1, page_no: 3 });
    node(100003, 100002, 3, "باب أول");
    node(100004, 100003, 4, "فصل أول");
    node(100005, 100004, 5, "بيان أول");
    expect(sectionPath(100003, deep)).toBe("كتاب تجريبي › باب أول");
    expect(sectionPath(100004, deep)).toBe("كتاب تجريبي › باب أول › فصل أول");
    expect(sectionPath(100005, deep)).toBe("كتاب تجريبي › … › فصل أول › بيان أول");
    expect(sectionPath(null, deep)).toBe("");
  });

  test("blok dokumen = potongan text_raw persis; citations aktif", () => {
    const text = SENT.repeat(40);
    const doc = buildDoc(passage(10000001, text), "Jenis: matan.");
    const block = toDocumentBlock(doc);
    expect(block.citations).toEqual({ enabled: true });
    expect(block.source.type).toBe("content");
    const parts =
      block.source.type === "content" && Array.isArray(block.source.content)
        ? block.source.content
        : [];
    expect(parts.map((p) => (p.type === "text" ? p.text : "")).join("")).toBe(text);
  });

  test("catatan kaki ≤2.000 karakter tetap satu blok", () => {
    const foot = buildDoc(passage(10000002, SENT.repeat(30), { kind: "foot" }), "");
    expect(foot.segments).toHaveLength(1);
  });

  test("request jawaban: effort low, tanpa sampling/format, sistem di-cache, pertanyaan terakhir", () => {
    const doc = buildDoc(passage(10000001, SENT), "");
    const req = buildAnswerRequest([doc], "Apa itu sabar?");
    expect(req.output_config).toEqual({ effort: "low" });
    expect(req).not.toHaveProperty("temperature");
    expect(req).not.toHaveProperty("top_p");
    expect(req).not.toHaveProperty("thinking");
    const system = Array.isArray(req.system) ? req.system : [];
    expect(system[0]?.cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
    const content = req.messages[0]?.content;
    expect(Array.isArray(content) ? content.at(-1) : null).toEqual({
      type: "text",
      text: "<pertanyaan>Apa itu sabar?</pertanyaan>",
    });
    expect(req.messages).toHaveLength(1);
  });

  test("fitDocs: berurutan dalam anggaran, dokumen pertama selalu ikut", () => {
    const docs = [1, 2, 3].map((i) => ({ ...buildDoc(passage(i, SENT), ""), tokens: 100 * i }));
    expect(fitDocs(docs, 350).map((d) => d.passage.id)).toEqual([1, 2]);
    expect(fitDocs(docs, 10).map((d) => d.passage.id)).toEqual([1]);
  });

  test("orderBySection: per bagian (urut peringkat terbaik), di dalam bagian urut kitab", () => {
    const doc = (id: number, page: number, ord: number, over: Partial<AnswerPassage> = {}) =>
      buildDoc(
        passage(id, SENT, {
          ord,
          location: { juz: 1, page_no: page, permalink: `/kitab/ihya/1/${page}`, label: "-" },
          ...over,
        }),
        "",
      );
    // Urutan masukan = peringkat (RRF + pasangan). Kelompok urut kemunculan pertama: bagian 7,
    // bagian 9, tanpa bagian per halaman (page_id 5, lalu 6), bagian 11. Di dalam kelompok urut
    // halaman, badan sebelum catatan kaki, lalu `ord` — bukan ID: paragraf 60 (ID besar, mis.
    // hasil patch) ber-ord 1 sehingga paling depan (ADR-029).
    const docs = [
      doc(25, 56, 3, { toc_node_id: 7 }),
      doc(11, 40, 2, { toc_node_id: 9 }),
      doc(21, 56, 2, { toc_node_id: 7 }),
      doc(30, 70, 2, { page_id: 5 }),
      // Catatan kaki ikut perujuk pertama yang ada di dokumen (99 tidak ada → 11, bagian 9).
      doc(13, 40, 1, { kind: "foot", toc_node_id: 8, referenced_by: [99, 11] }),
      doc(10, 40, 1, { toc_node_id: 9 }),
      doc(31, 71, 1, { page_id: 6 }),
      doc(29, 70, 1, { page_id: 5 }),
      // Perujuk tidak ada di dokumen → tetap di bagiannya sendiri.
      doc(40, 57, 1, { kind: "foot", toc_node_id: 7, referenced_by: [39] }),
      doc(60, 56, 1, { toc_node_id: 7 }),
      // Catatan kaki berperingkat lebih tinggi daripada perujuknya di bagian lain: kelompok
      // perujuk (bagian 11) dibuka di posisi catatan kaki, dan perujuknya tetap didahulukan.
      doc(50, 80, 1, { kind: "foot", toc_node_id: 12, referenced_by: [51] }),
      doc(51, 80, 1, { toc_node_id: 11 }),
    ];
    const ordered = orderBySection(docs);
    expect(ordered.map((d) => d.passage.id)).toEqual([
      60, 21, 25, 40, 10, 11, 13, 29, 30, 31, 51, 50,
    ]);
    // Hanya urutan yang berubah: himpunan dan objek dokumen sama (terjemahan tidak dipindah).
    expect(new Set(ordered)).toEqual(new Set(docs));
    expect(orderBySection([])).toEqual([]);
    expect(orderBySection([docs[0]!])).toEqual([docs[0]]);
  });

  test("request routing: JSON terstruktur, daftar isi di-cache, pertanyaan sebagai data", () => {
    const req = buildRouteRequest(tocText([...toc.values()]), "Apa itu sabar?");
    expect(req.output_config?.format?.type).toBe("json_schema");
    const system = Array.isArray(req.system) ? req.system : [];
    expect(system[1]?.text).toContain("100002   كتاب تجريبي (j1 h2)");
    expect(system[1]?.cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
    expect(req.messages[0]?.content).toBe("<pertanyaan>Apa itu sabar?</pertanyaan>");
  });
});

describe("parseRoute", () => {
  const msg = (text: string, stop: Message["stop_reason"] = "end_turn") =>
    ({
      content: [{ type: "text", text, citations: null }],
      stop_reason: stop,
    }) as unknown as Message;
  const valid = new Set([100001, 100002, 100003, 100004, 100005]);

  test("ID asing dibuang, kueri unik dan dipangkas, batas jumlah", () => {
    const r = parseRoute(
      msg(
        JSON.stringify({
          sections: [100002, 999, 100002, 100001, 100003, 100004, 100005],
          queries: [" sabar ", "sabar", "", "الصبر", "x".repeat(300), "a", "b"],
          hadith: false,
        }),
      ),
      valid,
    );
    expect(r?.sections).toEqual([100002, 100001, 100003, 100004]);
    expect(r?.queries).toEqual(["sabar", "الصبر", "x".repeat(200), "a", "b"]);
  });

  test("refusal, terpotong, atau JSON rusak → null", () => {
    expect(parseRoute(msg("{}", "refusal"), valid)).toBeNull();
    expect(parseRoute(msg('{"sections": [', "max_tokens"), valid)).toBeNull();
    expect(parseRoute(msg("bukan json"), valid)).toBeNull();
    expect(parseRoute(msg('{"sections": "x", "queries": [], "hadith": 1}'), valid)).toBeNull();
  });
});

describe("citationSpans", () => {
  const text = SENT.repeat(80);
  const doc = buildDoc(passage(10000001, text), "");
  const cite = (start: number, end: number, cited?: string): CitationContentBlockLocation => ({
    type: "content_block_location",
    cited_text: cited ?? text.slice(doc.segments[start]!.start, doc.segments[end - 1]!.end),
    document_index: 0,
    document_title: null,
    file_id: null,
    start_block_index: start,
    end_block_index: end,
  });

  test("indeks blok → passage_id + offset UTF-16, spasi tepi dipangkas", () => {
    const [span] = citationSpans(cite(1, 3), [doc]) ?? [];
    expect(span?.passage_id).toBe(10000001);
    expect(span?.matches_cited_text).toBe(true);
    const raw = text.slice(span!.char_start, span!.char_end);
    expect(raw).toBe(raw.trim());
    expect(raw).toBe(text.slice(doc.segments[1]!.start, doc.segments[2]!.end).trim());
  });

  test("di luar dokumen, indeks terbalik, atau jenis lokasi lain → null", () => {
    expect(citationSpans({ ...cite(0, 1), document_index: 5 }, [doc])).toBeNull();
    expect(
      citationSpans({ ...cite(0, 1), start_block_index: 2, end_block_index: 2 }, [doc]),
    ).toBeNull();
    expect(citationSpans({ ...cite(0, 1), end_block_index: 999 }, [doc])).toBeNull();
    expect(
      citationSpans(
        {
          type: "char_location",
          cited_text: "x",
          document_index: 0,
          document_title: null,
          file_id: null,
          start_char_index: 0,
          end_char_index: 1,
        },
        [doc],
      ),
    ).toBeNull();
  });

  test("cited_text yang tidak sama dengan teks DB ditandai (dibuang pipeline)", () => {
    expect(citationSpans(cite(0, 1, "teks lain"), [doc])?.[0]?.matches_cited_text).toBe(false);
  });

  test("rentang panjang dipecah ≤2.000 karakter di batas segmen", () => {
    const spans = citationSpans(cite(0, doc.segments.length), [doc]) ?? [];
    expect(spans.length).toBeGreaterThan(1);
    for (const s of spans) expect(s.char_end - s.char_start).toBeLessThanOrEqual(SPAN_MAX_CHARS);
    expect(spans[0]?.char_start).toBe(0);
  });
});

describe("teks model", () => {
  test("huruf Arab buatan model dibuang dan dihitung; teks Latin utuh", () => {
    const r = stripArabic("Al-Ghazali menyebut sabar (الصبر) sebagai separuh iman (١).");
    expect(r.text).not.toMatch(/\p{Script=Arabic}/u);
    expect(r.text).toBe("Al-Ghazali menyebut sabar … sebagai separuh iman ….");
    expect(r.removed).toBeGreaterThan(0);
    expect(stripArabic("Tanpa huruf Arab.")).toEqual({ text: "Tanpa huruf Arab.", removed: 0 });
  });

  test("harakat (Script=Inherited) ikut terbuang bersama hurufnya", () => {
    // Fathatan U+064B dan sukun U+0652 sesudah huruf; teks buatan untuk tes.
    const r = stripArabic("Lafaz \u0639\u0650\u0644\u0652\u0645\u064b dibahas.");
    expect(r.text).toBe("Lafaz … dibahas.");
    expect(r.text).not.toMatch(/[\u064B-\u065F]/u);
  });

  test("penolakan baku hanya di awal jawaban", () => {
    expect(isNotFound(`${ANSWER_NOT_FOUND} Dokumen membahas hal lain.`)).toBe(true);
    expect(isNotFound(`  **${ANSWER_NOT_FOUND}**`)).toBe(true);
    expect(isNotFound(`Menurut al-Ghazali ...\n\n${ANSWER_NOT_FOUND}`)).toBe(false);
    // Satu kalimat pengantar di paragraf pertama masih dihitung penolakan.
    expect(isNotFound(`Pertanyaan ini keliru. ${ANSWER_NOT_FOUND}`)).toBe(true);
  });

  test("dua jenis penolakan baku: tidak ditemukan dan premis keliru", () => {
    expect(refusalKind(`${ANSWER_NOT_FOUND} Lain.`)).toBe("not_found");
    expect(refusalKind(`${ANSWER_FALSE_PREMISE} Justru sebaliknya.`)).toBe("false_premise");
    expect(isNotFound(ANSWER_FALSE_PREMISE)).toBe(true);
    expect(refusalKind("Menurut al-Ghazali, ...")).toBeNull();
  });

  test("kalimat status hadits diambil sampai akhir kalimat", () => {
    const text = `Hadits itu dinukil al-Ghazali. ${ANSWER_HADITH_PREFIX} sanadnya lemah menurut al-'Iraqi. Lainnya.`;
    const [st] = hadithStatements(text);
    expect(st?.status).toBe("sanadnya lemah menurut al-'Iraqi");
    expect(text.slice(st!.start, st!.end)).toBe(
      `${ANSWER_HADITH_PREFIX} sanadnya lemah menurut al-'Iraqi.`,
    );
    expect(hadithStatements("Tanpa status.")).toEqual([]);
  });
});

describe("kandidat", () => {
  test("RRF: paragraf yang muncul di banyak daftar naik", () => {
    const lists = [
      { query: "a", section_id: null, passage_ids: [1, 2, 3] },
      { query: "b", section_id: null, passage_ids: [3, 4] },
    ];
    expect(fuse(lists)).toEqual([3, 1, 2, 4]);
  });

  test("pasangan: badan diikuti takhrijnya; catatan kaki didahului badan yang merujuknya", () => {
    const map = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, SENT, { kind: "foot", referenced_by: [1] })],
      [3, passage(3, SENT)],
      [4, passage(4, SENT, { kind: "foot", referenced_by: [3] })],
    ]);
    expect(withPairs([1, 4, 99], map)).toEqual([1, 2, 3, 4]);
  });

  test("RRF berbobot: daftar berbobot 3 mengalahkan paragraf yang muncul di dua daftar", () => {
    const lists = [
      { query: "pertanyaan", section_id: null, passage_ids: [9, 1], weight: QUESTION_WEIGHT },
      { query: "a", section_id: 7, passage_ids: [1, 2] },
      { query: "b", section_id: 7, passage_ids: [2, 1] },
    ];
    // 9: 3/61; 1: 3/62 + 1/61 + 1/62; 2: 1/62 + 1/61.
    expect(fuse(lists)).toEqual([1, 9, 2]);
    expect(fuse(lists.map((l) => ({ ...l, weight: 1 })))).toEqual([1, 2, 9]);
  });

  test("daftar makna (X13): unik, dipotong k, berbobot; bobot 1 tanpa field; kosong = tanpa daftar", () => {
    const ids = Array.from({ length: 50 }, (_, i) => i + 1);
    const list = semanticList([3, 3, ...ids]);
    expect(list).toEqual({
      query: SEMANTIC_QUERY,
      section_id: null,
      passage_ids: [3, ...ids.filter((i) => i !== 3)].slice(0, SEMANTIC_LIMIT),
      weight: SEMANTIC_WEIGHT,
    });
    expect(semanticList([1, 2, 3], 2, 1)).toEqual({
      query: SEMANTIC_QUERY,
      section_id: null,
      passage_ids: [1, 2],
    });
    expect(semanticList([])).toBeNull();
    expect(semanticList([1], 0)).toBeNull();
    // Daftar makna yang digabung hanya menambah skor; tanpa daftar makna, RRF tidak berubah.
    const lists = [{ query: "a", section_id: null, passage_ids: [1, 2] }];
    expect(fuse([...lists, semanticList([5, 2], 20, 1)!])).toEqual([2, 1, 5]);
    expect(fuse(lists)).toEqual([1, 2]);
  });

  test("daftar makna takhrij (ADR-094) hanya untuk soal hadits menurut routing", () => {
    const foot = Array.from({ length: 30 }, (_, i) => 100 + i);
    const input = { ids: [1, 2], footnotes: foot };
    const hadith = { sections: [], queries: [], hadith: true };
    expect(semanticLists(hadith, input).map((l) => [l.query, l.passage_ids.length])).toEqual([
      [SEMANTIC_QUERY, 2],
      [SEMANTIC_FOOTNOTE_QUERY, SEMANTIC_FOOTNOTE_LIMIT],
    ]);
    expect(semanticLists({ ...hadith, hadith: false }, input).map((l) => l.query)).toEqual([
      SEMANTIC_QUERY,
    ]);
    expect(semanticLists(null, input).map((l) => l.query)).toEqual([SEMANTIC_QUERY]);
    expect(semanticLists(hadith, { ids: [] })).toEqual([]);
  });

  test("pertanyaan panjang dipotong di batas kata ≤200 karakter", () => {
    const q = questionQuery(`${"kata ".repeat(60)}akhir`);
    expect(q.length).toBeLessThanOrEqual(200);
    expect(q.endsWith("kata")).toBe(true);
  });

  test("pertanyaan dengan kata isi melebihi batas searchText dipotong dari belakang", () => {
    // 18 kata isi Indonesia sesudah kata fungsi dibuang (batas 16): dulu InvalidQuery, sehingga
    // semua daftar pertanyaan hilang diam-diam.
    const long =
      "Saya ingin memahami hubungan antara niat tulus, keikhlasan hati, amal perbuatan " +
      "sehari-hari seorang murid ketika belajar kepada guru, serta adab murid terhadap guru " +
      "menurut kitab ini";
    expect(() => planLatinQuery(long)).toThrow(RangeError);
    const q = questionQuery(long);
    expect(long.startsWith(q)).toBe(true);
    expect(planLatinQuery(q)?.words.length).toBe(LATIN_MAX_TERMS);
    expect(questionQuery("sabar")).toBe("sabar");
    expect(questionQuery("  sabar \n  syukur ")).toBe("sabar syukur");
  });

  test("yang dipotong kata terakhir dari aksara yang meluap: kutipan Arab panjang tidak menghabiskan kata Indonesia", () => {
    // 40 token Arab (batas 32), total < 200 karakter: yang meluap hanya jumlah token Arab.
    const arabic = Array.from({ length: 40 }, () => "علم").join(" ");
    const q = questionQuery(`${arabic} artinya sabar`);
    expect(q.endsWith("artinya sabar")).toBe(true);
    const arabicPart = q.replace(/[\p{Script=Latin}]+/gu, " ");
    expect(() => planFtsQuery(arabicPart)).not.toThrow();
    expect(planFtsQuery(arabicPart)?.stems.length).toBe(FTS_MAX_TOKENS);
  });
});

describe("rencana pencarian", () => {
  const route = (sections: number[], queries: string[]) => ({ sections, queries, hadith: false });

  test("routing: pertanyaan global berbobot, kueri routing global, lalu per bagian 3 halaman", () => {
    const plans = routePlans("guru murid", route([7, 8], ["المعلم", "adab"]));
    expect(plans[0]).toEqual({
      query: "guru murid",
      section_id: null,
      limit: 10,
      weight: QUESTION_WEIGHT,
    });
    expect(plans.slice(1, 3).map((p) => [p.query, p.section_id, p.weight])).toEqual([
      ["المعلم", null, 1],
      ["adab", null, 1],
    ]);
    expect(plans.filter((p) => p.section_id === 7).map((p) => p.query)).toEqual([
      "guru murid",
      "المعلم",
      "adab",
    ]);
    expect(plans.filter((p) => p.section_id !== null).every((p) => p.limit === SECTION_LIMIT)).toBe(
      true,
    );
    expect(plans).toHaveLength(9);
  });

  test("routing: unik, kueri kosong dilewati, rute null = pertanyaan saja, batas 20", () => {
    expect(routePlans("sabar", null)).toHaveLength(1);
    expect(routePlans("", route([7], ["sabar"])).map((p) => p.query)).toEqual(["sabar", "sabar"]);
    expect(routePlans("sabar", route([], ["sabar", " ", "sabar"]))).toHaveLength(1);
    const full = routePlans("q", route([1, 2, 3, 4], ["a", "b", "c", "d", "e", "f"]));
    expect(full).toHaveLength(MAX_SEARCHES);
    // Bagian terakhir terpotong jatah: 1 + 6 global + 3 × 4 = 19, sisa 1 untuk bagian 4.
    expect(full.at(-1)).toMatchObject({ query: "q", section_id: 4 });
  });

  test("ringkasan: bukan bagian routing, unik, ≤3, hanya sisa jatah; pertanyaan kosong = tanpa", () => {
    const r = route([7], ["a"]);
    expect(summaryPlans("sabar", [7, 9, 9, 10, 11, 12], r, 3)).toEqual(
      [9, 10, 11].map((s) => ({ query: "sabar", section_id: s, limit: SECTION_LIMIT, weight: 1 })),
    );
    expect(
      summaryPlans("sabar", [9, 10, 11], r, MAX_SEARCHES - 1).map((p) => p.section_id),
    ).toEqual([9]);
    expect(summaryPlans("sabar", [9, 10], r, MAX_SEARCHES)).toEqual([]);
    expect(summaryPlans("", [9], null, 1)).toEqual([]);
    expect(summaryPlans("sabar", [9], null, 1)).toHaveLength(1);
  });
});

describe("kunci cache", () => {
  test("perapian huruf kecil, spasi, tanda baca akhir; versi ikut kunci", async () => {
    const { answerCacheKey, tidyQuestion } = await import("./cache-key.ts");
    const hmac = (secret: string) =>
      crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
    const key = await hmac("kunci-uji-pertama-0123456789abcdef");
    expect(tidyQuestion("  Apa itu   SABAR?? ")).toBe("apa itu sabar");
    const a = await answerCacheKey("Apa itu sabar?", "ihya-v6", "answer@1", key);
    expect(a).toMatch(/^[a-f0-9]{64}$/u);
    expect(await answerCacheKey("apa itu  sabar", "ihya-v6", "answer@1", key)).toBe(a);
    expect(await answerCacheKey("Apa itu sabar?", "ihya-v7", "answer@1", key)).not.toBe(a);
    expect(await answerCacheKey("Apa itu sabar?", "ihya-v6", "answer@2", key)).not.toBe(a);
    // Kunci lain (secret lain) = hash lain: tanpa secret, pertanyaan tebakan tidak bisa dicocokkan.
    const other = await hmac("kunci-uji-kedua-0123456789abcdef00");
    expect(await answerCacheKey("Apa itu sabar?", "ihya-v6", "answer@1", other)).not.toBe(a);
    // Bukan SHA-256 polos (S19) dari masukan yang sama.
    const plain = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("ihya-v6\nanswer@1\napa itu sabar"),
    );
    const plainHex = Array.from(new Uint8Array(plain), (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    expect(a).not.toBe(plainHex);
  });
});

/** Catatan kaki takhrij uji: n 1 → paragraf 2 (dirujuk paragraf badan 1). */
const FOOT1 = {
  n: 1,
  passage_id: 2,
  char_start: 0,
  char_end: 10,
  kind: "foot" as const,
  label: "",
  permalink: "",
};

/**
 * Klaim X06 = struktur: tepat satu per catatan kaki takhrij yang disitasi blok akhir, dipasangkan
 * ke paragraf badan yang merujuknya (bukan ke hadits lain), terlepas dari kalimat status mana pun.
 */
function expectStructural(
  checked: ReturnType<typeof hadithCheck>,
  passages: ReadonlyMap<number, AnswerPassage>,
) {
  const feet = [
    ...new Set(checked.citations.filter((c) => c.kind === "foot").map((c) => c.passage_id)),
  ].filter((id) => (passages.get(id)?.referenced_by.length ?? 0) > 0);
  const byId = (a: number, b: number) => a - b;
  expect(checked.claims.map((c) => c.footnote.passage_id).toSorted(byId)).toEqual(
    feet.toSorted(byId),
  );
  for (const c of checked.claims)
    expect(c.passage_id).toBe(passages.get(c.footnote.passage_id)!.referenced_by[0]);
}

describe("diagnostik mutu jawaban (pipeline@8)", () => {
  test("istilah pipeline yang bocor dihitung", () => {
    expect(pipelineTerms("Dokumen yang dilampirkan tidak memuat takhrij lain.")).toBe(2);
    expect(pipelineTerms("Dalam terjemahan AI yang disertakan, …")).toBe(1);
    expect(pipelineTerms("Konteks yang diberikan tidak memuatnya.")).toBe(1);
    expect(
      pipelineTerms("Menurut al-Ghazali dalam Ihya (j. 1, h. 55), guru menyayangi murid."),
    ).toBe(0);
  });

  test("calon parafrase ayat: rujukan QS + penanda makna di kalimat yang sama (j019)", () => {
    const j019 =
      "Menurut al-Ghazali dalam Ihya (j. 4, h. 376), ikhlas berarti menjadikan agama ini semata-mata untuk Allah (lihat QS 98:5 dan QS 18:110).";
    expect(ayahGlossSuspects(j019)).toBe(1);
    expect(
      ayahGlossSuspects(
        'Ia berdalil dengan QS Al-Bayyinah [98]: 5, yang artinya "supaya menyembah Allah".',
      ),
    ).toBe(1);
    expect(
      ayahGlossSuspects(
        "Al-Ghazali berdalil dengan QS 98:5. Ikhlas berarti amal bersih dari campuran.",
      ),
    ).toBe(0);
    expect(ayahGlossSuspects("Ia menyebut QS 2:153 sebagai dalil sabar.")).toBe(0);
    // Format rujukan lain (peninjau ADR-106): "QS." tidak memenggal kalimat.
    for (const ref of [
      "QS. 98:5",
      "QS Ali 'Imran [3]: 7",
      "QS Al-Baqarah (2): 153",
      "QS Al-Baqarah: 153",
    ])
      expect(ayahGlossSuspects(`Ayat ${ref} berarti menyembah Allah dengan ikhlas.`), ref).toBe(1);
    expect(ayahGlossSuspects("Ikhlas berarti murni (j. 4, h. 376; QS 98:5).")).toBe(1);
  });
});

describe("diagnostik bahasa (pipeline@9)", () => {
  test("isi berulang dalam satu paragraf dihitung; rumus atribusi tidak (x07 j008, j019)", () => {
    expect(
      repeatedSentences(
        "Menurut al-Ghazali dalam Ihya (j. 1, h. 234), puasa khusus al-khusus adalah puasa hati. Puasa khusus al-khusus adalah puasa hati dari cita-cita rendah.",
      ),
    ).toBe(1);
    expect(
      repeatedSentences(
        "Menurut al-Ghazali dalam Ihya (j. 3, h. 305), ikhlas itu cukup. Menurut al-Ghazali dalam Ihya (j. 3, h. 310), riya itu tersembunyi.",
      ),
    ).toBe(0);
    // Paragraf berbeda tidak dibandingkan.
    expect(
      repeatedSentences(
        "Puasa khusus al-khusus adalah puasa hati.\n\nPuasa khusus al-khusus adalah puasa hati.",
      ),
    ).toBe(0);
  });

  test("baris label status buatan kode tidak dihitung berulang (peninjau ADR-110)", () => {
    const label =
      "Status hadits: dinilai lemah, menurut takhrij al-'Iraqi (hadits di Ihya j. 1, h. 2).";
    expect(repeatedSentences(`${label} ${label.replace("h. 2", "h. 5")}`)).toBe(0);
  });

  test("penilaian hadits tulisan model tanpa sitasi takhrij dihitung per blok", () => {
    const isFoot = (n: number) => n === 9;
    expect(
      uncitedGradings(
        [
          { text: "Menurut al-'Iraqi, hadits ini sanadnya lemah", citations: [1] },
          { text: "Menurut al-'Iraqi, riwayat ini lemah", citations: [9] },
          { text: "Status hadits: dinilai lemah, menurut takhrij al-'Iraqi.", citations: [] },
          { text: "Guru menyayangi murid", citations: [1] },
        ],
        isFoot,
      ),
    ).toBe(1);
  });

  test("salinan ≥ 8 kata persis dari terjemahan AI dihitung per kalimat (x07 j010)", () => {
    const tr = [
      "Ketahuilah bahwa batasan ghibah adalah engkau menyebut saudaramu dengan hal yang ia benci.",
    ];
    expect(
      translationCopies(
        "Menurut al-Ghazali, gibah dirumuskan singkat. Ketahuilah bahwa batasan ghibah adalah engkau menyebut saudaramu dengan hal yang ia benci.",
        tr,
      ),
    ).toBe(1);
    expect(translationCopies("Gibah adalah menyebut saudara dengan hal yang ia benci.", tr)).toBe(
      0,
    );
    expect(translationCopies("Apa saja.", [])).toBe(0);
  });
});

describe("klaim hadits", () => {
  test("X06: butir daftar diganti label + lokasi hadits; sitasi paragraf hadits itu tetap; label tanpa kata penilaian stabil", () => {
    // Takhrij BUATAN: "أخرجه مسلم" → label "riwayat Muslim" (tanpa kata penilaian).
    const MUSLIM = "أخرجه مسلم";
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
      [3, passage(3, SENT, { footnote_ids: [4] })],
      [4, passage(4, MUSLIM, { kind: "foot", referenced_by: [3] })],
    ]);
    const cite = (n: number, passage_id: number, kind: "body" | "foot") => ({
      n,
      passage_id,
      char_start: 0,
      char_end: 10,
      kind,
      label: "",
      permalink: "",
    });
    const checked = hadithCheck(
      [
        { text: "Status hadits:\n- Hadits A ", citations: [] },
        { text: "dinukil", citations: [1] },
        { text: ": dha'if ", citations: [] },
        { text: "menurut takhrij", citations: [2] },
        { text: ".\n- Hadits B: ", citations: [] },
        { text: "sahih", citations: [4] },
        { text: ".", citations: [] },
      ],
      [cite(1, 1, "body"), cite(2, 2, "foot"), cite(4, 4, "foot")],
      passages,
    );
    expect(checked.unresolved).toBe(false);
    const text = checked.blocks.map((b) => b.text).join("");
    expect(text).toBe(
      `Status hadits:\n- ${cap(IN_TEXT)}.\n- ${cap(takhrijLabel(MUSLIM).text)} (hadits di Ihya j. 1, h. 55).`,
    );
    expect(text).not.toContain("dha'if");
    expect(text).not.toContain("sahih");
    // Blok label butir A membawa sitasi takhrijnya DAN sitasi paragraf hadits A yang ada di kalimat itu.
    expect(checked.blocks.find((b) => b.text.startsWith(cap(IN_TEXT)))?.citations).toEqual([2, 1]);
    expect(checked.claims.map((c) => [c.passage_id, c.footnote.passage_id, c.status])).toEqual([
      [1, 2, LABEL],
      [3, 4, "diriwayatkan Muslim, menurut takhrij al-'Iraqi"],
    ]);
    // Stabil: pemeriksaan ulang atas hasilnya tidak mengubah apa pun.
    const again = hadithCheck(
      checked.blocks,
      [cite(1, 1, "body"), cite(2, 2, "foot"), cite(4, 4, "foot")],
      passages,
    );
    expect(again.blocks).toEqual(checked.blocks);
    expect(again.labeled).toBe(0);
  });

  test("X07: label tertinjau menggantikan label kode di klaim dan baris status; sitasi sebagian tetap label kode", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const blocks = [
      { text: "Status hadits: ", citations: [] },
      { text: "dha'if", citations: [1] },
      { text: ".", citations: [] },
    ];
    const at = (start: number, end: number) => [{ ...FOOT1, char_start: start, char_end: end }];
    const corrected = new Map([
      [2, { decision: "corrected" as const, kinds: ["mursal" as const], reviewed_at: "x" }],
    ]);
    const checked = hadithCheck(blocks, at(0, FOOT.length), passages, corrected);
    // Jenis tambahan penilai tidak pernah disebut sebagai isi takhrij.
    expect(checked.blocks.map((b) => b.text).join("")).toBe(
      "Status hadits: diriwayatkan mursal, menurut peninjau (hadits di Ihya j. 1, h. 55).",
    );
    expect(checked.claims).toMatchObject([
      {
        label: "ustadz_corrected",
        status: "diriwayatkan mursal, menurut peninjau",
        terms: [],
        added_terms: [{ kind: "mursal", gloss: "diriwayatkan mursal" }],
      },
    ]);
    const approved = new Map([
      [2, { decision: "approved" as const, kinds: ["daif" as const], reviewed_at: "x" }],
    ]);
    expect(hadithCheck(blocks, at(0, FOOT.length), passages, approved).claims).toMatchObject([
      { label: "ustadz_reviewed", status: LABEL },
    ]);
    // Sitasi sebagian: tinjauan diterapkan pada istilah di bagian itu ("وضعفه" di luar bagian).
    expect(hadithCheck(blocks, at(0, 4), passages, approved).claims).toMatchObject([
      {
        label: "ustadz_reviewed",
        status: "bagian takhrij yang dikutip tidak memuat istilah penilaian",
      },
    ]);
    // Istilah yang ditolak penilai tidak muncul lagi di sitasi sebagian.
    const rejected = new Map([
      [2, { decision: "corrected" as const, kinds: [], reviewed_at: "x" }],
    ]);
    expect(hadithCheck(blocks, at(4, FOOT.length), passages, rejected).claims).toMatchObject([
      { label: "ustadz_corrected", terms: [], added_terms: [] },
    ]);
    expect(
      hadithCheck(blocks, at(4, FOOT.length), passages, rejected).claims[0]?.status,
    ).not.toContain("lemah");
    // Tanpa tinjauan = perilaku X06.
    expect(hadithCheck(blocks, at(0, FOOT.length), passages).claims).toMatchObject([
      { label: "rule_extracted", status: LABEL, added_terms: [] },
    ]);
  });

  test("X06: dua hadits — butir tanpa takhrij sendiri mendapat pemberitahuan yang tidak mengaitkan takhrij hadits lain", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
      [3, passage(3, SENT)],
    ]);
    const checked = hadithCheck(
      [
        { text: "Status hadits:\n- Hadits A: ", citations: [] },
        { text: "lemah", citations: [1] },
        { text: ".\n- Hadits B: sahih.", citations: [] },
      ],
      [
        {
          n: 1,
          passage_id: 2,
          char_start: 0,
          char_end: 12,
          kind: "foot" as const,
          label: "",
          permalink: "",
        },
      ],
      passages,
    );
    const text = checked.blocks.map((b) => b.text).join("");
    // Butir A: label + lokasi hadits A. Butir B: menunjuk bagian "Status hadits", tanpa menunjuk
    // status hadits A dan tanpa "tidak dipastikan" (pipeline@8). Butir tidak dibuang.
    expect(text).toBe(`Status hadits:\n- ${cap(IN_TEXT)}.\n- ${HADITH_NOT_CITED}`);
    expect(HADITH_NOT_CITED).not.toContain("tidak dipastikan");
    expect(checked.claims.map((c) => c.passage_id)).toEqual([1]);
  });

  test("X06: catatan kaki yang bukan takhrij tidak mendukung status dan tidak menjadi klaim", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, SENT, { kind: "foot", referenced_by: [1] })],
    ]);
    const checked = hadithCheck(
      [
        { text: "Status hadits: lemah", citations: [1] },
        { text: ".", citations: [] },
      ],
      [
        {
          n: 1,
          passage_id: 2,
          char_start: 0,
          char_end: 12,
          kind: "foot" as const,
          label: "",
          permalink: "",
        },
      ],
      passages,
    );
    expect(checked.claims).toEqual([]);
    // Tanpa takhrij sungguhan yang tersitasi: "belum diketahui".
    expect(checked.blocks.map((b) => b.text).join("")).toBe(HADITH_UNKNOWN);
  });

  test("X06: penilaian bebas bersitasi takhrij + baris status tanpa sitasi → klaim struktur berlabel, baris diganti netral", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
      // Catatan kaki yang bukan takhrij (teks tanpa penanda takhrij): tanpa klaim.
      [5, passage(5, SENT, { footnote_ids: [6] })],
      [6, passage(6, SENT, { kind: "foot", referenced_by: [5] })],
    ]);
    const citations = [
      {
        n: 1,
        passage_id: 2,
        char_start: 0,
        char_end: 12,
        kind: "foot" as const,
        label: "",
        permalink: "",
      },
      {
        n: 2,
        passage_id: 6,
        char_start: 0,
        char_end: 12,
        kind: "foot" as const,
        label: "",
        permalink: "",
      },
    ];
    const checked = hadithCheck(
      [
        { text: "Menurut takhrij, ", citations: [] },
        { text: "hadits ini diriwayatkan dengan sanad lemah", citations: [1] },
        { text: ". Catatan lain ", citations: [] },
        { text: "menjelaskan kata", citations: [2] },
        { text: ".\n\nStatus hadits: sahih.", citations: [] },
      ],
      citations,
      passages,
    );
    expect(checked.claims).toMatchObject([
      { passage_id: 1, footnote: { passage_id: 2 }, status: LABEL, label: "rule_extracted" },
    ]);
    const text = checked.blocks.map((b) => b.text).join("");
    // Baris status tidak meminjam takhrij kalimat lain; tulisan model "sahih" tidak tampil. Tanpa
    // baris label bersitasi, pemberitahuan tetap ada (takhrij tersitasi bisa milik hadits lain).
    expect(text.endsWith(HADITH_NOT_CITED)).toBe(true);
    expect(text).not.toContain("sahih");
  });

  test("pipeline@8: pemberitahuan berdiri sendiri dibuang hanya bila ada baris label bersitasi (j025)", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const citations = [
      {
        n: 1,
        passage_id: 2,
        char_start: 0,
        char_end: 12,
        kind: "foot" as const,
        label: "",
        permalink: "",
      },
      {
        n: 2,
        passage_id: 1,
        char_start: 0,
        char_end: 12,
        kind: "body" as const,
        label: "",
        permalink: "",
      },
    ];
    const run = (blocks: { text: string; citations: number[] }[]) => {
      const checked = hadithCheck(blocks, citations, passages);
      return { checked, text: checked.blocks.map((b) => b.text).join("") };
    };
    // Ada baris label (status bersitasi takhrij): baris kedua yang tak bersitasi dibuang beserta
    // baris kosongnya; sitasi blok lain utuh.
    const labeled = run([
      { text: "Status hadits: sanadnya lemah", citations: [1] },
      { text: ".\n\nStatus hadits: sahih.\n\n", citations: [] },
      { text: "Di tempat lain hanya ada rujukan balik", citations: [2] },
      { text: ".", citations: [] },
    ]);
    expect(labeled.text).toBe(
      `Status hadits: ${IN_TEXT}.\n\nDi tempat lain hanya ada rujukan balik.`,
    );
    expect(labeled.text).not.toContain("sahih");
    expect(labeled.checked.unsupported).toBe(1);
    expect(labeled.checked.blocks.find((b) => b.text.startsWith("Di tempat"))?.citations).toEqual([
      2,
    ]);
    // Di awal jawaban: dibuang tanpa menyisakan baris kosong di depan.
    const first = run([
      { text: "Status hadits: sahih.\n\n", citations: [] },
      { text: "Status hadits: sanadnya lemah", citations: [1] },
      { text: ".", citations: [] },
    ]);
    expect(first.text).toBe(`Status hadits: ${IN_TEXT}.`);
    // Tanpa baris label (takhrij hanya disitasi kalimat isi): pemberitahuan tetap, tanpa
    // "tidak dipastikan".
    const plain = run([
      { text: "Menurut al-'Iraqi, ", citations: [] },
      { text: "hadits ini diriwayatkan Ibnu Majah dan dilemahkan Ahmad", citations: [1] },
      { text: ".\n\nStatus hadits: lemah.\n\nLanjut.", citations: [] },
    ]);
    expect(plain.text).toContain(`\n\n${HADITH_NOT_CITED}\n\nLanjut.`);
    // Tanpa klaim sama sekali: "belum diketahui".
    const none = run([{ text: "Isi.\n\nStatus hadits: lemah.\n\nLanjut.", citations: [] }]);
    expect(none.text).toBe(`Isi.\n\n${HADITH_UNKNOWN}\n\nLanjut.`);
  });

  test("peninjau ADR-106: gabungan dengan 'belum diketahui' tetap 'belum diketahui' dan tidak dibuang", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const citations = [
      {
        n: 1,
        passage_id: 2,
        char_start: 0,
        char_end: 12,
        kind: "foot" as const,
        label: "",
        permalink: "",
      },
    ];
    const checked = hadithCheck(
      [
        { text: "Status hadits: sanadnya lemah", citations: [1] },
        { text: ".\n\nStatus hadits A: sahih. Status hadits B: belum diketahui.", citations: [] },
      ],
      citations,
      passages,
    );
    const text = checked.blocks.map((b) => b.text).join("");
    expect(text).toBe(`Status hadits: ${IN_TEXT}.\n\n${HADITH_UNKNOWN}`);
  });

  test("kalimat status wajib menyitasi takhrij SENDIRI; takhrij kalimat sebelumnya tidak dipinjam", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const citations = [
      {
        n: 1,
        passage_id: 1,
        char_start: 0,
        char_end: 10,
        kind: "body" as const,
        label: "",
        permalink: "",
      },
      {
        n: 2,
        passage_id: 2,
        char_start: 0,
        char_end: 12,
        kind: "foot" as const,
        label: "",
        permalink: "",
      },
    ];
    // Bersitasi sendiri (sesuai prompt): dipasangkan.
    const own = [
      { text: "Al-Ghazali menukil hadits itu.", citations: [1] },
      { text: " Status hadits: sanad lemah", citations: [2] },
      { text: ".", citations: [] },
    ];
    // Status = teks label dari istilah takhrij (kode, X06), bukan tulisan model.
    expect(hadithClaims(own, citations, passages)).toMatchObject([
      {
        passage_id: 1,
        footnote: { passage_id: 2, char_start: 0, char_end: 12 },
        status: LABEL,
        label: "rule_extracted",
        rules_version: TAKHRIJ_TERMS_VERSION,
        mixed: false,
      },
    ]);
    // Takhrij hanya disitasi kalimat sebelumnya: tidak dipinjam, kalimatnya diganti.
    const borrowed = [
      { text: "Al-Ghazali menukil hadits itu.", citations: [1] },
      { text: " Al-'Iraqi menilainya.", citations: [2] },
      { text: " Status hadits: sanad lemah.", citations: [] },
    ];
    const checked = hadithCheck(borrowed, citations, passages);
    expectStructural(checked, passages);
    expect(checked.unsupported).toBe(1);
    expect(checked.unresolved).toBe(false);
    const text = checked.blocks.map((b) => b.text).join("");
    expect(text).not.toContain("sanad lemah");
    // Takhrij tersitasi di kalimat lain: pemberitahuan netral, bukan "belum diketahui".
    expect(text.endsWith(HADITH_NOT_CITED)).toBe(true);
  });

  test("takhrij yang disitasi kalimat SESUDAH status tidak dipakai; kalimat takhrij itu tetap tampil", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const citations = [
      {
        n: 1,
        passage_id: 2,
        char_start: 0,
        char_end: 12,
        kind: "foot" as const,
        label: "",
        permalink: "",
      },
    ];
    const blocks = [
      { text: "Status hadits: sanad lemah.", citations: [] },
      { text: " Takhrijnya menyebut riwayat Ibnu Majah.", citations: [1] },
    ];
    const checked = hadithCheck(blocks, citations, passages);
    expect(checked.unsupported).toBe(1);
    expectStructural(checked, passages);
    expect(checked.blocks.map((b) => b.text).join("")).toBe(
      `${HADITH_NOT_CITED} Takhrijnya menyebut riwayat Ibnu Majah.`,
    );
    expect(checked.citations.map((c) => c.n)).toEqual([1]);
  });

  test("paragraf dua hadits: status hadits pertama tidak menempel ke takhrij hadits kedua", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [] })],
      [3, passage(3, SENT, { footnote_ids: [4] })],
      [4, passage(4, FOOT, { kind: "foot", referenced_by: [3] })],
    ]);
    const citations = [
      {
        n: 1,
        passage_id: 1,
        char_start: 0,
        char_end: 10,
        kind: "body" as const,
        label: "",
        permalink: "",
      },
      {
        n: 2,
        passage_id: 4,
        char_start: 0,
        char_end: 12,
        kind: "foot" as const,
        label: "",
        permalink: "",
      },
    ];
    const blocks = [
      { text: "Hadits pertama dinukil", citations: [1] },
      { text: ". Status hadits: lemah. Hadits kedua ", citations: [] },
      { text: "diriwayatkan at-Tirmidzi", citations: [2] },
    ];
    const checked = hadithCheck(blocks, citations, passages);
    expectStructural(checked, passages);
    expect(checked.blocks.map((b) => b.text).join("")).toContain(HADITH_NOT_CITED);
    expect(checked.blocks.map((b) => b.text).join("")).not.toContain("lemah");
  });

  test("Markdown tebal di depan awalan ikut diganti; blok spasi bersitasi asli tetap", () => {
    const passages = new Map([[1, passage(1, SENT)]]);
    const citations = [
      {
        n: 1,
        passage_id: 1,
        char_start: 0,
        char_end: 10,
        kind: "body" as const,
        label: "",
        permalink: "",
      },
    ];
    const blocks = [
      { text: "Teks.", citations: [] },
      { text: " ", citations: [1] },
      { text: "\n\n**Status hadits:** sahih.", citations: [] },
    ];
    const checked = hadithCheck(blocks, citations, passages);
    // Blok spasi bersitasi asli tetap; baris baru dipertahankan, "belum diketahui" tanpa sitasi.
    expect(checked.blocks[1]).toEqual({ text: " ", citations: [1] });
    expect(
      checked.blocks
        .slice(2)
        .map((b) => b.text)
        .join(""),
    ).toBe(`\n\n${HADITH_UNKNOWN}`);
    expect(checked.blocks.slice(2).every((b) => b.citations.length === 0)).toBe(true);
  });

  test("status tanpa takhrij di tengah blok bersitasi: hanya kalimatnya yang diganti", () => {
    const passages = new Map([[1, passage(1, SENT)]]);
    const citations = [
      {
        n: 1,
        passage_id: 1,
        char_start: 0,
        char_end: 10,
        kind: "body" as const,
        label: "",
        permalink: "",
      },
    ];
    const blocks = [
      { text: "Al-Ghazali menukilnya. Status hadits: sahih. Lalu ia berkata.", citations: [1] },
    ];
    const checked = hadithCheck(blocks, citations, passages);
    // "Belum diketahui" menjadi blok tersendiri TANPA sitasi (penanda [1] tidak menempel padanya).
    expect(checked.blocks).toEqual([
      { text: "Al-Ghazali menukilnya. ", citations: [1] },
      { text: HADITH_UNKNOWN, citations: [] },
      { text: " Lalu ia berkata.", citations: [1] },
    ]);
    expect(checked.citations).toHaveLength(1);
  });

  test("variasi penulisan awalan dikenali (S21)", () => {
    for (const [text, status] of [
      ["status Hadits: sahih.", "sahih"],
      ["**Status hadits**: dhaif jiddan.", "dhaif jiddan"],
      ["**Status hadits:** maudhu'.", "maudhu'"],
      ["Status hadis : sanadnya lemah.", "sanadnya lemah"],
      ["_Status Hadis_：hasan.", "hasan"],
    ] as const) {
      const [st] = hadithStatements(`Pembuka. ${text} Penutup.`);
      expect(st?.status, text).toBe(status);
    }
    expect(hadithStatements("Statusnya hadits sahih.")).toEqual([]);
  });

  test("awalan diikuti baris baru: tiap baris sesudahnya pernyataan sendiri", () => {
    const text =
      "Pembuka.\nStatus hadits:\nsanadnya lemah menurut al-'Iraqi.\n- Hadits B: palsu.\n\nParagraf lain.";
    const sts = hadithStatements(text);
    expect(sts.map((x) => x.status)).toEqual([
      "sanadnya lemah menurut al-'Iraqi",
      "Hadits B: palsu",
    ]);
    expect(text.slice(sts[1]!.end)).toBe("\n\nParagraf lain.");
    // Satu baris kosong tepat sesudah awalan dilewati.
    expect(hadithStatements("Status hadits:\n\n- A: lemah.").map((x) => x.status)).toEqual([
      "A: lemah",
    ]);
  });

  test('titik sesudah lokasi "(j. 1, h. 5)." atau angka adalah akhir kalimat; awalan kedua memotong', () => {
    const [a] = hadithStatements("Status hadits: lemah (j. 1, h. 5). Hadits kedua diriwayatkan.");
    expect(a?.status).toBe("lemah (j. 1, h. 5)");
    const sts = hadithStatements("Status hadits: dhaif menurut al-'Iraqi Status hadits: palsu.");
    expect(sts.map((x) => x.status)).toEqual(["dhaif menurut al-'Iraqi", "palsu"]);
    expect(sts[0]!.end).toBeLessThanOrEqual(sts[1]!.start);
  });

  test("varian awalan lain dikenali", () => {
    for (const text of [
      "Status hadits ini: lemah.",
      "Status hadits tersebut: lemah.",
      "Status hadist: lemah.",
      "Status hadith: lemah.",
      "Status ḥadīts: lemah.",
      "Status\u00A0hadits: lemah.",
      "Derajat hadits: lemah.",
      "Kualitas hadis: lemah.",
    ])
      expect(
        hadithStatements(text).map((x) => x.status),
        text,
      ).toEqual(["lemah"]);
  });

  test("status panjang dipotong di batas kata dengan elipsis", () => {
    const [st] = hadithStatements(`Status hadits: ${"kata ".repeat(40)}akhir.`);
    expect(st!.status.length).toBeLessThanOrEqual(121);
    expect(st!.status.endsWith("…")).toBe(true);
  });

  test("tag <cite> tiruan model dibuang, isinya tetap", () => {
    expect(
      stripCiteTags('menuntut <cite index="17-1">kerja sama</cite>. Lalu <CITE>x</CITE>'),
    ).toBe("menuntut kerja sama. Lalu x");
    expect(stripCiteTags("a < b dan c > d")).toBe("a < b dan c > d");
  });

  test("singkatan (HR., w., r.a., no.) tidak memotong kalimat status", () => {
    const [st] = hadithStatements(
      "Status hadits: HR. Abu Dawud no. 12 dari Abu Hurairah r.a. (w. 59 H), sanadnya lemah. Lanjut.",
    );
    expect(st?.status).toBe(
      "HR. Abu Dawud no. 12 dari Abu Hurairah r.a. (w. 59 H), sanadnya lemah",
    );
  });

  test("singkatan tak dikenal memenggal kalimat: kalimat sesudahnya yang memuat penilaian ikut diperiksa", () => {
    const passages = new Map([[1, passage(1, SENT)]]);
    const blocks = [
      {
        text: "Pembuka.\n**Status hadits**: dlm. riwayat lain hadits ini palsu. Kalimat lain.\nBaris berikut.",
        citations: [],
      },
    ];
    const checked = hadithCheck(blocks, [], passages);
    const text = checked.blocks.map((b) => b.text).join("");
    expect(text).toBe(`Pembuka.\n${HADITH_UNKNOWN} Kalimat lain.\nBaris berikut.`);
    expect(text).not.toContain("palsu");
  });

  test("paragraf badan dengan dua catatan kaki: status tanpa sitasi sendiri tidak dipasangkan", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2, 5] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
      [5, passage(5, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const cite = (n: number, passage_id: number, kind: "body" | "foot") => ({
      n,
      passage_id,
      char_start: 0,
      char_end: 10,
      kind,
      label: "",
      permalink: "",
    });
    const blocks = [
      { text: "Dua hadits dinukil", citations: [1] },
      { text: " dan takhrij pertama", citations: [2] },
      { text: ". Status hadits: palsu.", citations: [] },
    ];
    const checked = hadithCheck(blocks, [cite(1, 1, "body"), cite(2, 2, "foot")], passages);
    expectStructural(checked, passages);
    expect(checked.blocks.map((b) => b.text).join("")).not.toContain("palsu");
  });

  test("butir daftar beda baris tidak saling meminjam takhrij", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const citations = [
      {
        n: 1,
        passage_id: 1,
        char_start: 0,
        char_end: 10,
        kind: "body" as const,
        label: "",
        permalink: "",
      },
      {
        n: 2,
        passage_id: 2,
        char_start: 0,
        char_end: 10,
        kind: "foot" as const,
        label: "",
        permalink: "",
      },
    ];
    const blocks = [
      { text: "- Hadits A dinukil", citations: [1] },
      { text: " dan ditakhrij.", citations: [2] },
      { text: "\n- Hadits B. Status hadits: palsu.", citations: [] },
    ];
    const checked = hadithCheck(blocks, citations, passages);
    expectStructural(checked, passages);
    expect(checked.blocks.map((b) => b.text).join("")).not.toContain("palsu");
  });

  test("dua kalimat status di satu baris: yang tanpa sitasi tidak meminjam takhrij yang lain", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const citations = [
      {
        n: 1,
        passage_id: 2,
        char_start: 0,
        char_end: 10,
        kind: "foot" as const,
        label: "",
        permalink: "",
      },
    ];
    const blocks = [
      { text: "Status hadits: palsu. ", citations: [] },
      { text: "Status hadits: lemah", citations: [1] },
      { text: ".", citations: [] },
    ];
    const checked = hadithCheck(blocks, citations, passages);
    expect(checked.claims.map((c) => c.status)).toEqual([LABEL]);
    const text = checked.blocks.map((b) => b.text).join("");
    expect(text).not.toContain("palsu");
    expect(text).toContain("lemah");
  });

  test("daftar sesudah awalan: butir tanpa takhrij sendiri diganti, butir bersitasi dipasangkan", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const citations = [
      {
        n: 1,
        passage_id: 2,
        char_start: 0,
        char_end: 10,
        kind: "foot" as const,
        label: "",
        permalink: "",
      },
    ];
    const blocks = [
      { text: "Status hadits:\n- Hadits A: dha'if", citations: [1] },
      { text: ".\n- Hadits B: palsu.\n\nPenutup.", citations: [] },
    ];
    const checked = hadithCheck(blocks, citations, passages);
    expect(checked.claims.map((c) => c.status)).toEqual([LABEL]);
    const text = checked.blocks.map((b) => b.text).join("");
    expect(text).not.toContain("palsu");
    expect(text).toContain(HADITH_NOT_CITED);
    expect(text.endsWith("\n\nPenutup.")).toBe(true);
  });

  test("dua status tak didukung berdampingan: digabung jadi satu pemberitahuan, tanpa tumpang tindih", () => {
    const passages = new Map([[1, passage(1, SENT)]]);
    const checked = hadithCheck(
      [{ text: "A. Status hadits: palsu. Status hadits: lemah.\nB.", citations: [] }],
      [],
      passages,
    );
    expect(checked.blocks.map((b) => b.text).join("")).toBe(`A. ${HADITH_UNKNOWN}\nB.`);
  });

  test("paragraf yang menyitasi dua paragraf badan: status tanpa sitasi takhrij sendiri tidak dipasangkan", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
      [3, passage(3, SENT, { footnote_ids: [] })],
    ]);
    const cite = (n: number, passage_id: number, kind: "body" | "foot") => ({
      n,
      passage_id,
      char_start: 0,
      char_end: 10,
      kind,
      label: "",
      permalink: "",
    });
    const citations = [cite(1, 1, "body"), cite(2, 2, "foot"), cite(3, 3, "body")];
    const blocks = [
      { text: "Hadits pertama", citations: [1] },
      { text: " dan takhrijnya", citations: [2] },
      { text: ", lalu hadits kedua", citations: [3] },
      { text: ". Status hadits: lemah.", citations: [] },
    ];
    const checked = hadithCheck(blocks, citations, passages);
    expectStructural(checked, passages);
    expect(checked.blocks.map((b) => b.text).join("")).toContain(HADITH_NOT_CITED);
  });

  test("bentuk daftar: kalimat pengantar, daftar longgar, baris lanjutan, dan CRLF dikenali", () => {
    const statuses = (t: string) => hadithStatements(t).map((x) => x.status);
    // Pengantar tanpa istilah penilaian bukan pernyataan; butir tetap diperiksa.
    expect(
      statuses("Status hadits: sebagai berikut.\n- Hadits A: sahih.\n- Hadits B: palsu."),
    ).toEqual(["Hadits A: sahih", "Hadits B: palsu"]);
    // Status yang ditulis sebaris sebelum daftar TETAP pernyataan.
    expect(statuses("Status hadits: kedua hadits lemah:\n- A: lemah.")).toEqual([
      "kedua hadits lemah",
      "A: lemah",
    ]);
    // Daftar longgar (baris kosong di antara butir).
    expect(statuses("Status hadits:\n\n- A: lemah.\n\n- B: palsu.\n\nPenutup.")).toEqual([
      "A: lemah",
      "B: palsu",
    ]);
    // Baris lanjutan menempel ke butirnya; baris kosong lalu teks biasa mengakhiri daftar.
    expect(statuses("Status hadits:\n- A: sahih menurut\n  al-'Iraqi.\n\nPenutup.")).toEqual([
      "A: sahih menurut\n  al-'Iraqi",
    ]);
    expect(statuses("Status hadits:\r\n- A: palsu.")).toEqual(["A: palsu"]);
    // Baris kosong sesudah awalan kosong: baris isi pertama tetap pernyataan.
    expect(statuses("Status hadits:\n\nsanadnya lemah.")).toEqual(["sanadnya lemah"]);
  });

  test("varian awalan yang lebih bebas dikenali", () => {
    for (const text of [
      "Status haditsnya: palsu.",
      "Status kedua hadits: palsu.",
      "Status hadits (menurut al-'Iraqi): palsu.",
      "Status hadits menurut al-'Iraqi: palsu.",
      "Status hadits — palsu.",
      "Status hadits - palsu.",
    ])
      expect(
        hadithStatements(`Pembuka. ${text}`).map((x) => x.status),
        text,
      ).toEqual(["palsu"]);
    expect(
      hadithStatements("Status hadits-hadits tersebut:\n- A: palsu.").map((x) => x.status),
    ).toEqual(["A: palsu"]);
  });

  test("daftar dengan pengantar: butir bersitasi takhrij dipasangkan, butir lain diganti", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const citations = [FOOT1];
    const blocks = [
      { text: "Status hadits: sebagai berikut.\n- Hadits A: sahih", citations: [1] },
      { text: "\n- Hadits B: palsu.\n\nPenutup.", citations: [] },
    ];
    const checked = hadithCheck(blocks, citations, passages);
    expect(checked.claims.map((c) => c.status)).toEqual([LABEL]);
    const text = checked.blocks.map((b) => b.text).join("");
    expect(text).not.toContain("palsu");
    // Penanda daftar tetap; isi butir B diganti.
    expect(text).toContain(`\n- ${HADITH_NOT_CITED}`);
    expect(text.endsWith("\n\nPenutup.")).toBe(true);
  });

  test("baris dengan beberapa takhrij: kalimat status tanpa sitasi sendiri tidak meminjam (peninjau S21)", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
      [3, passage(3, SENT, { footnote_ids: [4] })],
      [4, passage(4, FOOT, { kind: "foot", referenced_by: [3] })],
    ]);
    const cite = (n: number, passage_id: number, kind: "body" | "foot") => ({
      n,
      passage_id,
      char_start: 0,
      char_end: 10,
      kind,
      label: "",
      permalink: "",
    });
    const citations = [cite(1, 1, "body"), cite(2, 2, "foot"), cite(3, 4, "foot")];
    const blocks = [
      { text: "Al-Ghazali menukil hadits niat", citations: [1] },
      { text: "; al-'Iraqi menyebutnya riwayat al-Bukhari", citations: [2] },
      { text: ". Ia juga menyebut hadits X yang sanadnya tidak ditemukan", citations: [3] },
      { text: ". Status hadits: tidak ditemukan sanadnya.", citations: [] },
    ];
    const checked = hadithCheck(blocks, citations, passages);
    expectStructural(checked, passages);
    expect(checked.blocks.map((b) => b.text).join("")).toContain(HADITH_NOT_CITED);
  });

  test("singkatan di akhir kalimat status (saw.) tidak menyedot takhrij kalimat berikutnya", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const blocks = [
      {
        text: "Status hadits: tidak berasal dari Nabi saw. Hadits kedua tentang ilmu ",
        citations: [],
      },
      { text: "diriwayatkan Muslim", citations: [1] },
      { text: ".", citations: [] },
    ];
    const checked = hadithCheck(blocks, [FOOT1], passages);
    expectStructural(checked, passages);
    expect(checked.blocks.map((b) => b.text).join("")).not.toContain("tidak berasal");
    // "HR. Muslim" bukan akhir kalimat: takhrij sesudahnya tetap milik pernyataan.
    const hr = [
      { text: "Status hadits: sahih, HR. ", citations: [] },
      { text: "Muslim", citations: [1] },
      { text: ".", citations: [] },
    ];
    expect(hadithCheck(hr, [FOOT1], passages).claims.map((c) => c.status)).toEqual([LABEL]);
  });

  test("blok bersitasi yang menyentuh dua pernyataan ambigu; takhrij yang diklaim dua pernyataan ditolak; satu pernyataan boleh dua takhrij", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2, 4] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
      [4, passage(4, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const footN = (n: number, pid: number) => ({
      n,
      passage_id: pid,
      char_start: 0,
      char_end: 10,
      kind: "foot" as const,
      label: "",
      permalink: "",
    });
    const citations = [footN(1, 2), footN(2, 4)];
    // Satu blok bersitasi memuat dua pernyataan: tidak jelas takhrij milik siapa → keduanya diganti.
    const amb = hadithCheck(
      [{ text: "Status hadits: A sahih. Status hadits: B palsu.", citations: [2] }],
      citations,
      passages,
    );
    expectStructural(amb, passages);
    expect(amb.blocks.map((b) => b.text).join("")).not.toMatch(/sahih|palsu/u);
    // Dua pernyataan menyitasi takhrij yang sama: paling banyak satu benar, jadi keduanya ditolak.
    const same = hadithCheck(
      [
        { text: "Status hadits: lemah", citations: [1] },
        { text: ".\nStatus hadits: palsu", citations: [1] },
        { text: ".", citations: [] },
      ],
      citations,
      passages,
    );
    expectStructural(same, passages);
    expect(same.blocks.map((b) => b.text).join("")).not.toMatch(/lemah|palsu/u);
    // Satu pernyataan, dua takhrij: dua klaim.
    const two = hadithCheck(
      [
        { text: "Status hadits: keduanya lemah", citations: [1, 2] },
        { text: ".", citations: [] },
      ],
      citations,
      passages,
    );
    expect(two.claims.map((c) => [c.status, c.footnote.passage_id])).toEqual([
      [LABEL, 2],
      [LABEL, 4],
    ]);
  });

  test("label status putaran 3: pengantar panjang, kata sisipan berstrip, baris label, koma, kutip, tanpa kata hadits", () => {
    const statuses = (t: string) => hadithStatements(t).map((x) => x.status);
    expect(
      statuses(
        "Status hadits tersebut adalah sebagai berikut:\n- Hadits niat: sahih.\n- Hadits shalat malam Jumat: palsu.",
      ),
    ).toEqual(["Hadits niat: sahih", "Hadits shalat malam Jumat: palsu"]);
    expect(
      statuses(
        "Adapun status hadits-hadits yang disebutkan di atas menurut al-'Iraqi:\n- A: palsu.",
      ),
    ).toEqual(["A: palsu"]);
    expect(statuses("Status hadits menurut takhrij al-'Iraqi (j. 1, h. 5): palsu.")).toEqual([
      "palsu",
    ]);
    expect(statuses("Status masing-masing hadits:\n- A: palsu.")).toEqual(["A: palsu"]);
    expect(statuses("**Status hadits**\n- A: palsu.")).toEqual(["A: palsu"]);
    expect(statuses("Status hadits ini, menurut al-'Iraqi: palsu.")).toEqual(["palsu"]);
    expect(statuses('Status hadits "Tuntutlah ilmu": lemah.')).toEqual(["lemah"]);
    expect(statuses("- Hadits shalat malam Jumat (j. 1, h. 200). Status: palsu.")).toEqual([
      "palsu",
    ]);
    expect(statuses("Hadits ini statusnya: palsu.")).toEqual(["palsu"]);
    expect(
      statuses("**Status hadits:**\n\nHadits A: sahih.\n\nHadits B: palsu.\n\nPenutup."),
    ).toEqual(["Hadits A: sahih", "Hadits B: palsu"]);
    // Penanda daftar "* " tidak ikut menjadi bagian label.
    const [st] = hadithStatements("* Status hadits: palsu.");
    expect(st?.start).toBe(2);
  });

  test("label = kalimat itu saja: kalimat penilaian berikutnya menjadi pernyataan sendiri", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const section = hadithCheck(
      [
        { text: "**Status hadits:**\n\n", citations: [] },
        { text: "Al-'Iraqi menyebut hadits niat muttafaq 'alaih", citations: [1] },
        { text: ". Adapun hadits shalat malam Jumat, ia palsu.", citations: [] },
      ],
      [FOOT1],
      passages,
    );
    expect(section.claims.map((c) => c.status)).toEqual([LABEL]);
    expect(section.blocks.map((b) => b.text).join("")).not.toContain("palsu");
    const inline = hadithCheck(
      [
        { text: "Status hadits: tidak berasal dari Nabi saw", citations: [1] },
        { text: ". Hadits kedua palsu.", citations: [] },
      ],
      [FOOT1],
      passages,
    );
    expect(inline.claims.map((c) => c.status)).toEqual([LABEL]);
    expect(inline.blocks.map((b) => b.text).join("")).not.toContain("palsu");
  });

  test("awalan di dalam butir daftar tidak menelan butir saudaranya; daftar biasa sesudah status tetap", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
      [3, passage(3, SENT, { footnote_ids: [4] })],
      [4, passage(4, FOOT, { kind: "foot", referenced_by: [3] })],
      [5, passage(5, SENT)],
    ]);
    const cite = (n: number, passage_id: number, kind: "body" | "foot") => ({
      n,
      passage_id,
      char_start: 0,
      char_end: 10,
      kind,
      label: "",
      permalink: "",
    });
    const citations = [
      cite(1, 1, "body"),
      cite(2, 2, "foot"),
      cite(3, 3, "body"),
      cite(4, 4, "foot"),
      cite(5, 5, "body"),
    ];
    const list = hadithCheck(
      [
        { text: "Hadits yang dinukil:\n- Hadits niat", citations: [1] },
        { text: ". Status hadits: sahih", citations: [2] },
        { text: ".\n- Hadits shalat malam Jumat", citations: [3] },
        { text: ". Status hadits: palsu", citations: [4] },
        { text: ".\n- Hadits tentang ilmu", citations: [5] },
        { text: ".", citations: [] },
      ],
      citations,
      passages,
    );
    expect(list.claims.map((c) => [c.status, c.footnote.passage_id])).toEqual([
      [LABEL, 2],
      [LABEL, 4],
    ]);
    const text = list.blocks.map((b) => b.text).join("");
    expect(text).not.toContain(HADITH_UNKNOWN);
    expect(text).toContain("- Hadits tentang ilmu.");
    const after = hadithCheck(
      [
        { text: "Al-Ghazali menukilnya", citations: [1] },
        { text: ". Status hadits: sanadnya lemah menurut al-'Iraqi", citations: [2] },
        { text: ".\n\n- Pelajaran pertama: jangan berdusta", citations: [3] },
        { text: "\n- Pelajaran kedua: bersabar", citations: [5] },
      ],
      citations,
      passages,
    );
    expect(after.claims.map((c) => c.status)).toEqual([LABEL]);
    expect(after.blocks.map((b) => b.text).join("")).toContain(
      "- Pelajaran pertama: jangan berdusta",
    );
    expect(after.unsupported).toBe(0);
  });

  test("potongan blok yang terganti tidak membawa takhrij ke pernyataan lain; irisan tanda baca diabaikan", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2, 4] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
      [4, passage(4, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const footN = (n: number, pid: number) => ({
      n,
      passage_id: pid,
      char_start: 0,
      char_end: 10,
      kind: "foot" as const,
      label: "",
      permalink: "",
    });
    const checked = hadithCheck(
      [
        { text: "Status hadits:\n- ", citations: [] },
        { text: "B: palsu.\n- C: lemah", citations: [1] },
        { text: ", sanadnya terputus", citations: [2] },
        { text: ".", citations: [] },
      ],
      [footN(1, 2), footN(2, 4)],
      passages,
    );
    // Takhrij B (paragraf 2) tidak pernah dipasangkan ke butir C.
    expect(checked.claims.map((c) => [c.status, c.footnote.passage_id])).toEqual([[LABEL, 4]]);
    expect(checked.blocks.map((b) => b.text).join("")).not.toContain("palsu");
    // Blok bersitasi yang diawali titik penutup kalimat status tidak dihitung milik kalimat itu.
    const edge = hadithCheck(
      [
        { text: "Status hadits: lemah", citations: [] },
        { text: ". Hadits kedua diriwayatkan Muslim", citations: [1] },
        { text: ".", citations: [] },
      ],
      [footN(1, 2)],
      passages,
    );
    expectStructural(edge, passages);
    expect(edge.blocks.map((b) => b.text).join("")).toBe(
      `${HADITH_NOT_CITED} Hadits kedua diriwayatkan Muslim.`,
    );
  });

  test("pemberitahuan yang langsung diikuti teks diberi spasi; tanpa takhrij sama sekali tetap 'belum diketahui'", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const glued = hadithCheck(
      [
        { text: "Status hadits: palsu.", citations: [] },
        { text: "Status hadits: lemah", citations: [1] },
        { text: ".", citations: [] },
      ],
      [FOOT1],
      passages,
    );
    expect(glued.blocks.map((b) => b.text).join("")).toBe(
      `${HADITH_NOT_CITED} Status hadits: ${IN_TEXT}.`,
    );
    const none = hadithCheck([{ text: "Status hadits: palsu.", citations: [] }], [], passages);
    expect(none.blocks.map((b) => b.text).join("")).toBe(HADITH_UNKNOWN);
  });

  test("putaran 4: 'belum diketahui' tulisan model tetap 'belum diketahui' walau takhrij hadits lain tersitasi", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    for (const status of [
      "belum diketahui dari dokumen yang tersedia.",
      "belum dapat ditentukan dari takhrij ini.",
    ]) {
      const checked = hadithCheck(
        [
          { text: "Takhrij di halaman itu untuk hadits lain: ", citations: [] },
          { text: "al-'Iraqi tidak menemukannya secara marfu'", citations: [1] },
          { text: `.\n\nStatus hadits: ${status}`, citations: [] },
        ],
        [FOOT1],
        passages,
      );
      const text = checked.blocks.map((b) => b.text).join("");
      expect(text.endsWith(HADITH_UNKNOWN), status).toBe(true);
      expect(text).not.toContain("tidak ditampilkan");
    }
  });

  test("putaran 4: dua kalimat satu kelompok yang menyitasi takhrij yang sama didukung (satu klaim)", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, FOOT, { kind: "foot", referenced_by: [1] })],
    ]);
    const split = hadithCheck(
      [
        { text: "Status hadits: sanadnya lemah", citations: [1] },
        { text: ". Al-'Iraqi tidak menemukan jalur lain", citations: [1] },
        { text: ".", citations: [] },
      ],
      [FOOT1],
      passages,
    );
    expect(split.claims.map((c) => c.status)).toEqual([LABEL]);
    expect(split.unsupported).toBe(0);
    // Kalimat pertama diganti teks label; kalimat lanjutan untuk takhrij yang sama dibuang (X06).
    expect(split.blocks.map((b) => b.text).join("")).toBe(`Status hadits: ${IN_TEXT}.`);
    expect(split.labeled).toBe(2);
    // Satu blok bersitasi yang mencakup dua kalimat dari kelompok yang sama: tidak ambigu.
    const one = hadithCheck(
      [
        {
          text: "Status hadits: sanadnya lemah. Al-'Iraqi tidak menemukan jalur lain",
          citations: [1],
        },
        { text: ".", citations: [] },
      ],
      [FOOT1],
      passages,
    );
    expect(one.claims.map((c) => c.status)).toEqual([LABEL]);
    expect(one.unsupported).toBe(0);
  });

  test("putaran 4: label tanpa pemisah hanya di awal baris; 'berstatus:' bukan label; baris pemberitahuan tidak memutus bagian", () => {
    const statuses = (t: string) => hadithStatements(t).map((x) => x.status);
    expect(
      statuses(
        "- Al-'Iraqi menjelaskan derajat hadits tersebut dalam catatan kaki\n- Butir kedua tentang adab.",
      ),
    ).toEqual([]);
    expect(statuses("Status hadits ini\n- A: palsu.")).toEqual(["A: palsu"]);
    expect(statuses("Riwayat itu berstatus: palsu.")).toEqual([]);
    expect(
      statuses(`Status hadits:\n\nA: sahih.\n\n${HADITH_UNKNOWN}\n\nC: palsu.\n\nPenutup.`),
    ).toEqual(["A: sahih", "C: palsu"]);
  });

  test("blok yang seluruhnya kalimat status tak didukung dibuang beserta sitasinya", () => {
    const passages = new Map([[1, passage(1, SENT)]]);
    const citations = [
      {
        n: 1,
        passage_id: 1,
        char_start: 0,
        char_end: 10,
        kind: "body" as const,
        label: "",
        permalink: "",
      },
      {
        n: 2,
        passage_id: 1,
        char_start: 20,
        char_end: 30,
        kind: "body" as const,
        label: "",
        permalink: "",
      },
    ];
    const blocks = [
      { text: "Teks pertama.", citations: [1] },
      { text: " Status hadits: ", citations: [] },
      { text: "sahih", citations: [2] },
      { text: ".", citations: [] },
    ];
    const checked = hadithCheck(blocks, citations, passages);
    expect(checked.blocks.map((b) => b.text).join("")).toBe(`Teks pertama. ${HADITH_UNKNOWN}`);
    expect(checked.citations.map((c) => c.n)).toEqual([1]);
    expect(hadithClaims(blocks, citations, passages)).toEqual([]);
  });
});

describe("perkiraan biaya terburuk (reservasi ledger S20)", () => {
  test("routing + jawaban Haiku dan ulangan Sonnet", () => {
    // Routing 16k × $0,2/M + 2.048 × $0,5/M; jawaban 40k × $0,2/M + 8.000 × $0,5/M.
    expect(jawabReserveUsd()).toBeCloseTo(0.004224 + 0.012, 9);
    // Sonnet: 40k × $4/M (tulis cache 1 jam) + 8.000 × $10/M.
    expect(retryReserveUsd()).toBeCloseTo(0.24, 9);
  });

  test("reservasi jauh di atas biaya nyata rata-rata (±$0,0026, ADR-064)", () => {
    expect(jawabReserveUsd()).toBeGreaterThan(0.0026 * 5);
    expect(ROUTE_PROMPT_TOKENS_MAX).toBeGreaterThan(11_800 + 1_000);
  });
});
