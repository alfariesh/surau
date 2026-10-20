// Tes unit Jawab tanpa D1 (project "node"). Teks Arab di sini BUATAN (bukan teks kitab).
import type { CitationContentBlockLocation, Message } from "@anthropic-ai/sdk/resources/messages";
import type { AnswerPassage, AnswerTocNode } from "@surau/core";
import { describe, expect, test } from "vite-plus/test";

import { ANSWER_HADITH_PREFIX, ANSWER_NOT_FOUND } from "../../prompts/answer-v1.ts";
import { ANSWER_FALSE_PREMISE } from "../../prompts/answer-v3.ts";
import { buildAnswerRequest, fitDocs } from "./answer.ts";
import {
  SPAN_MAX_CHARS,
  citationSpans,
  hadithStatements,
  isNotFound,
  refusalKind,
  stripArabic,
} from "./citations.ts";
import { buildDoc, docContext, segmentText, toDocumentBlock } from "./documents.ts";
import { fuse, questionQuery, withPairs } from "./retrieve.ts";
import { hadithClaims } from "./pipeline.ts";
import { buildRouteRequest, parseRoute, tocText } from "./route.ts";

const SENT = "هذه جملة تجريبية طويلة لاختبار التقسيم. ";
const NO_PUNCT = "كلمة تجريبية بلا علامة ";

function passage(id: number, text: string, over: Partial<AnswerPassage> = {}): AnswerPassage {
  return {
    id,
    edition_id: 1,
    page_id: 100001,
    kind: "body",
    toc_node_id: null,
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
    expect(text.slice(st!.start, st!.end + 1)).toBe(
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

  test("pertanyaan panjang dipotong di batas kata ≤200 karakter", () => {
    const q = questionQuery(`${"kata ".repeat(60)}akhir`);
    expect(q.length).toBeLessThanOrEqual(200);
    expect(q.endsWith("kata")).toBe(true);
  });
});

describe("kunci cache", () => {
  test("perapian huruf kecil, spasi, tanda baca akhir; versi ikut kunci", async () => {
    const { answerCacheKey, tidyQuestion } = await import("./cache-key.ts");
    expect(tidyQuestion("  Apa itu   SABAR?? ")).toBe("apa itu sabar");
    const a = await answerCacheKey("Apa itu sabar?", "ihya-v6", "answer@1");
    expect(a).toMatch(/^[a-f0-9]{64}$/u);
    expect(await answerCacheKey("apa itu  sabar", "ihya-v6", "answer@1")).toBe(a);
    expect(await answerCacheKey("Apa itu sabar?", "ihya-v7", "answer@1")).not.toBe(a);
    expect(await answerCacheKey("Apa itu sabar?", "ihya-v6", "answer@2")).not.toBe(a);
  });
});

describe("klaim hadits", () => {
  test("kalimat status tanpa sitasi sendiri memakai takhrij yang disitasi sebelumnya", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, SENT, { kind: "foot", referenced_by: [1] })],
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
    const blocks = [
      { text: "Al-Ghazali menukil hadits itu.", citations: [1] },
      { text: " Al-'Iraqi menilainya.", citations: [2] },
      { text: " Status hadits: sanad lemah.", citations: [] },
    ];
    expect(hadithClaims(blocks, citations, passages)).toEqual([
      {
        passage_id: 1,
        footnote: { passage_id: 2, char_start: 0, char_end: 12 },
        status: "sanad lemah",
        label: "ai_extracted",
      },
    ]);
    // Paragraf berbeda: tidak dipasangkan.
    const far = [
      blocks[0]!,
      blocks[1]!,
      { text: "\n\nStatus hadits: sanad lemah.", citations: [] },
    ];
    expect(hadithClaims(far, citations, passages)).toEqual([]);
  });
});
