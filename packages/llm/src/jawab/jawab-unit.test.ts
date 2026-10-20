// Tes unit Jawab tanpa D1 (project "node"). Teks Arab di sini BUATAN (bukan teks kitab).
import type { CitationContentBlockLocation, Message } from "@anthropic-ai/sdk/resources/messages";
import type { AnswerPassage, AnswerTocNode } from "@surau/core";
import { describe, expect, test } from "vite-plus/test";

import { ANSWER_HADITH_PREFIX, ANSWER_NOT_FOUND } from "../../prompts/answer-v1.ts";
import { ANSWER_FALSE_PREMISE } from "../../prompts/answer-v3.ts";
import { buildAnswerRequest, fitDocs } from "./answer.ts";
import { ROUTE_PROMPT_TOKENS_MAX, jawabReserveUsd, retryReserveUsd } from "./budget.ts";
import {
  SPAN_MAX_CHARS,
  citationSpans,
  hadithStatements,
  isNotFound,
  refusalKind,
  stripArabic,
  stripCiteTags,
} from "./citations.ts";
import { buildDoc, docContext, segmentText, toDocumentBlock } from "./documents.ts";
import { fuse, questionQuery, withPairs } from "./retrieve.ts";
import { HADITH_UNKNOWN, hadithCheck, hadithClaims } from "./pipeline.ts";
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

describe("klaim hadits", () => {
  test("kalimat status wajib menyitasi takhrij SENDIRI; takhrij kalimat sebelumnya tidak dipinjam", () => {
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
    // Bersitasi sendiri (sesuai prompt): dipasangkan.
    const own = [
      { text: "Al-Ghazali menukil hadits itu.", citations: [1] },
      { text: " Status hadits: sanad lemah", citations: [2] },
      { text: ".", citations: [] },
    ];
    expect(hadithClaims(own, citations, passages)).toEqual([
      {
        passage_id: 1,
        footnote: { passage_id: 2, char_start: 0, char_end: 12 },
        status: "sanad lemah",
        label: "ai_extracted",
      },
    ]);
    // Takhrij hanya disitasi kalimat sebelumnya: tidak dipinjam, kalimatnya diganti.
    const borrowed = [
      { text: "Al-Ghazali menukil hadits itu.", citations: [1] },
      { text: " Al-'Iraqi menilainya.", citations: [2] },
      { text: " Status hadits: sanad lemah.", citations: [] },
    ];
    const checked = hadithCheck(borrowed, citations, passages);
    expect(checked.claims).toEqual([]);
    expect(checked.unsupported).toBe(1);
    expect(checked.unresolved).toBe(false);
    const text = checked.blocks.map((b) => b.text).join("");
    expect(text).not.toContain("sanad lemah");
    expect(text.endsWith(HADITH_UNKNOWN)).toBe(true);
  });

  test("takhrij yang disitasi kalimat SESUDAH status juga tidak dipakai; sisa baris ikut diganti", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, SENT, { kind: "foot", referenced_by: [1] })],
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
    expect(checked.claims).toEqual([]);
    expect(checked.blocks.map((b) => b.text).join("")).toBe(HADITH_UNKNOWN);
    expect(checked.citations).toEqual([]);
  });

  test("paragraf dua hadits: status hadits pertama tidak menempel ke takhrij hadits kedua", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [] })],
      [3, passage(3, SENT, { footnote_ids: [4] })],
      [4, passage(4, SENT, { kind: "foot", referenced_by: [3] })],
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
    expect(checked.claims).toEqual([]);
    expect(checked.blocks.map((b) => b.text).join("")).toContain(HADITH_UNKNOWN);
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

  test("status tanpa takhrij di tengah blok bersitasi: diganti sampai akhir baris", () => {
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

  test("status tak didukung: seluruh sisa baris diganti, baris berikutnya tetap", () => {
    const passages = new Map([[1, passage(1, SENT)]]);
    const blocks = [
      {
        text: "Pembuka.\n**Status hadits**: dlm. riwayat lain hadits ini palsu. Kalimat lain.\nBaris berikut.",
        citations: [],
      },
    ];
    const checked = hadithCheck(blocks, [], passages);
    const text = checked.blocks.map((b) => b.text).join("");
    expect(text).toBe(`Pembuka.\n${HADITH_UNKNOWN}\nBaris berikut.`);
    expect(text).not.toContain("palsu");
  });

  test("paragraf badan dengan dua catatan kaki: status tanpa sitasi sendiri tidak dipasangkan", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2, 5] })],
      [2, passage(2, SENT, { kind: "foot", referenced_by: [1] })],
      [5, passage(5, SENT, { kind: "foot", referenced_by: [1] })],
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
    expect(checked.claims).toEqual([]);
    expect(checked.blocks.map((b) => b.text).join("")).not.toContain("palsu");
  });

  test("butir daftar beda baris tidak saling meminjam takhrij", () => {
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
    expect(checked.claims).toEqual([]);
    expect(checked.blocks.map((b) => b.text).join("")).not.toContain("palsu");
  });

  test("dua kalimat status di satu baris: yang tanpa sitasi tidak meminjam takhrij yang lain", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, SENT, { kind: "foot", referenced_by: [1] })],
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
    expect(checked.claims.map((c) => c.status)).toEqual(["lemah"]);
    const text = checked.blocks.map((b) => b.text).join("");
    expect(text).not.toContain("palsu");
    expect(text).toContain("lemah");
  });

  test("daftar sesudah awalan: butir tanpa takhrij sendiri diganti, butir bersitasi dipasangkan", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, SENT, { kind: "foot", referenced_by: [1] })],
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
    expect(checked.claims.map((c) => c.status)).toEqual(["Hadits A: dha'if"]);
    const text = checked.blocks.map((b) => b.text).join("");
    expect(text).not.toContain("palsu");
    expect(text).toContain(HADITH_UNKNOWN);
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
      [2, passage(2, SENT, { kind: "foot", referenced_by: [1] })],
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
    expect(checked.claims).toEqual([]);
    expect(checked.blocks.map((b) => b.text).join("")).toContain(HADITH_UNKNOWN);
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
      [2, passage(2, SENT, { kind: "foot", referenced_by: [1] })],
    ]);
    const citations = [FOOT1];
    const blocks = [
      { text: "Status hadits: sebagai berikut.\n- Hadits A: sahih", citations: [1] },
      { text: "\n- Hadits B: palsu.\n\nPenutup.", citations: [] },
    ];
    const checked = hadithCheck(blocks, citations, passages);
    expect(checked.claims.map((c) => c.status)).toEqual(["Hadits A: sahih"]);
    const text = checked.blocks.map((b) => b.text).join("");
    expect(text).not.toContain("palsu");
    // Penanda daftar tetap; isi butir B diganti.
    expect(text).toContain(`\n- ${HADITH_UNKNOWN}`);
    expect(text.endsWith("\n\nPenutup.")).toBe(true);
  });

  test("baris dengan beberapa takhrij: kalimat status tanpa sitasi sendiri tidak meminjam (peninjau S21)", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, SENT, { kind: "foot", referenced_by: [1] })],
      [3, passage(3, SENT, { footnote_ids: [4] })],
      [4, passage(4, SENT, { kind: "foot", referenced_by: [3] })],
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
    expect(checked.claims).toEqual([]);
    expect(checked.blocks.map((b) => b.text).join("")).toContain(HADITH_UNKNOWN);
  });

  test("singkatan di akhir kalimat status (saw.) tidak menyedot takhrij kalimat berikutnya", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2] })],
      [2, passage(2, SENT, { kind: "foot", referenced_by: [1] })],
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
    expect(checked.claims).toEqual([]);
    expect(checked.blocks.map((b) => b.text).join("")).not.toContain("tidak berasal");
    // "HR. Muslim" bukan akhir kalimat: takhrij sesudahnya tetap milik pernyataan.
    const hr = [
      { text: "Status hadits: sahih, HR. ", citations: [] },
      { text: "Muslim", citations: [1] },
      { text: ".", citations: [] },
    ];
    expect(hadithCheck(hr, [FOOT1], passages).claims.map((c) => c.status)).toEqual([
      "sahih, HR. Muslim",
    ]);
  });

  test("blok bersitasi yang menyentuh dua pernyataan ambigu; satu takhrij satu klaim; satu pernyataan boleh dua takhrij", () => {
    const passages = new Map([
      [1, passage(1, SENT, { footnote_ids: [2, 4] })],
      [2, passage(2, SENT, { kind: "foot", referenced_by: [1] })],
      [4, passage(4, SENT, { kind: "foot", referenced_by: [1] })],
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
    expect(amb.claims).toEqual([]);
    expect(amb.blocks.map((b) => b.text).join("")).not.toMatch(/sahih|palsu/u);
    // Dua pernyataan menyitasi takhrij yang sama: yang kedua tidak didukung.
    const same = hadithCheck(
      [
        { text: "Status hadits: lemah", citations: [1] },
        { text: ".\nStatus hadits: palsu", citations: [1] },
        { text: ".", citations: [] },
      ],
      citations,
      passages,
    );
    expect(same.claims.map((c) => c.status)).toEqual(["lemah"]);
    expect(same.blocks.map((b) => b.text).join("")).not.toContain("palsu");
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
      ["keduanya lemah", 2],
      ["keduanya lemah", 4],
    ]);
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
