import type { PageView, Passage } from "@surau/core";

import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { SectionNode } from "./page-model";

import { blocksText } from "./blocks";
import { buildPageModel, sectionStarts, tocHeadings } from "./page-model";
import { subheadingOf } from "./subheadings";

vi.mock("./subheadings", async (original) => ({
  ...(await original<typeof import("./subheadings")>()),
  subheadingOf: vi.fn<typeof subheadingOf>(),
}));

// Teks buatan (bukan teks kitab).
const T_HEAD = "بيان فضل"; // بيان فضل
const T_CONT = "الصبر"; // الصبر
const T_LEAD = "ليلة الخميس قال أنس"; // ليلة الخميس قال أنس
const sha16 = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 16);

function passage(seq: number, text: string, over: Partial<Passage> = {}): Passage {
  return {
    id: 10_000_000 + seq,
    anchor: `p${seq}`,
    kind: "body",
    ord: seq,
    toc_node_id: null,
    text_raw: text,
    footnote_refs: [],
    ayah_refs: [],
    needs_review: [],
    location: { juz: 1, page_no: 5, permalink: `/kitab/uji/1/5#p${seq}`, label: "" },
    translation: null,
    ...over,
  };
}

function page(body: Passage[]): PageView {
  return {
    citation: { juz: 1, page_no: 5, permalink: "/kitab/uji/1/5", label: "" },
    body,
    footnotes: [],
    prev: null,
    next: null,
    source_url: null,
    quran: null,
    summaries: [],
  } as unknown as PageView;
}

const SECTIONS: SectionNode[] = [
  { id: 1, parentId: null, level: 2, title: "باب" },
  { id: 2, parentId: 1, level: 3, title: "فصل" },
  { id: 3, parentId: null, level: 2, title: "آخر" },
];

describe("judul node dan jangkar bab (dari node yang mulai di halaman ini)", () => {
  it("judul dikenali hanya bila teks paragraf sama persis dengan judul node-nya", () => {
    const body = [
      { id: 10, toc_node_id: 2, text_raw: "فصل" },
      { id: 11, toc_node_id: 2, text_raw: "فصل" },
      { id: 12, toc_node_id: 1, text_raw: "نص" },
      { id: 13, toc_node_id: 9, text_raw: "باب" },
    ];
    expect([...tocHeadings(SECTIONS, body).keys()]).toEqual([10]);
  });

  it("judul node yang bukan paragraf pertamanya (jangkar sumber terlalu awal) tetap dikenali, sekali", () => {
    const body = [
      { id: 30, toc_node_id: 1, text_raw: "يتلوه باب" },
      { id: 31, toc_node_id: 1, text_raw: "باب" },
      { id: 32, toc_node_id: 1, text_raw: "باب" },
    ];
    expect([...tocHeadings(SECTIONS, body).keys()]).toEqual([31]);
    expect([...tocHeadings(SECTIONS, body, new Set([31])).keys()]).toEqual([32]);
  });

  it("jangkar sebelum paragraf pertama node atau turunannya; tanpa paragraf = unplaced", () => {
    const starts = sectionStarts(SECTIONS, [
      { id: 20, toc_node_id: 2 },
      { id: 21, toc_node_id: 2 },
    ]);
    expect([...starts.byPassage.entries()]).toEqual([[20, [1, 2]]]);
    expect(starts.unplaced).toEqual([3]);
  });
});

describe("buildPageModel: subjudul kurasi", () => {
  beforeEach(() => vi.mocked(subheadingOf).mockReset());

  it("subjudul utuh + lanjutannya digabung; subjudul awal memotong teks dan menebalkan terjemahan", async () => {
    const tr = (text: string) => ({
      label: "ai_translation" as const,
      lang: "id",
      model: "uji",
      prompt_version: "uji@1",
      created_at: "2026-10-21",
      review_status: "ai_generated" as const,
      text,
    });
    const head = passage(100, T_HEAD, { translation: tr("Penjelasan keutamaan") });
    const cont = passage(101, T_CONT, { translation: tr("sabar") });
    const lead = passage(102, T_LEAD, { translation: tr("Malam Kamis. Anas berkata.") });
    const leadEnd = T_LEAD.indexOf(" قال");
    vi.mocked(subheadingOf).mockImplementation((_edition, seq) => {
      if (seq === 100) return { kind: "heading", src: "bayan", sha: sha16(T_HEAD) };
      if (seq === 101) return { kind: "heading", src: "kurasi", sha: sha16(T_CONT), of: 100 };
      if (seq === 102)
        return {
          kind: "lead",
          end: leadEnd,
          sha: sha16(T_LEAD),
          tr: { start: 0, end: 12, sha: sha16("Malam Kamis. Anas berkata.") },
        };
      return undefined;
    });
    const model = await buildPageModel(page([head, cont, lead]), { editionId: 1, sections: [] });
    expect(model.body.map((p) => p.anchor)).toEqual(["p100", "p102"]);
    expect(model.body[0]!.heading).toEqual({ kind: "sub" });
    expect(model.body[0]!.continuations.map((c) => c.anchor)).toEqual(["p101"]);
    const l = model.body[1]!;
    expect(l.heading).toBeNull();
    expect(l.blocks.map((b) => b.kind)).toEqual(["subheading", "text"]);
    expect(blocksText(l.blocks)).toBe(T_LEAD);
    expect(l.translation?.bold).toEqual({ start: 0, end: 12 });
  });

  it("sidik teks berbeda (korpus berubah): entri diabaikan, paragraf tampil biasa", async () => {
    const lead = passage(102, T_LEAD, {});
    vi.mocked(subheadingOf).mockReturnValue({ kind: "lead", end: 5, sha: "0".repeat(16) });
    const model = await buildPageModel(page([lead]), { editionId: 1, sections: [] });
    expect(model.body[0]!.blocks.map((b) => b.kind)).toEqual(["text"]);
    expect(model.body[0]!.heading).toBeNull();
  });

  it("sidik terjemahan berbeda: subjudul tetap dipotong, tetapi terjemahan tidak ditebalkan", async () => {
    const lead = passage(102, T_LEAD, {
      translation: {
        label: "ai_translation",
        lang: "id",
        model: "uji",
        prompt_version: "uji@1",
        created_at: "2026-10-21",
        review_status: "ai_generated",
        text: "Terjemahan baru.",
      },
    });
    vi.mocked(subheadingOf).mockReturnValue({
      kind: "lead",
      end: T_LEAD.indexOf(" قال"),
      sha: sha16(T_LEAD),
      tr: { start: 0, end: 12, sha: sha16("Malam Kamis. Anas berkata.") },
    });
    const model = await buildPageModel(page([lead]), { editionId: 1, sections: [] });
    expect(model.body[0]!.blocks.map((b) => b.kind)).toEqual(["subheading", "text"]);
    expect(model.body[0]!.translation?.bold).toBeNull();
  });
});

describe("buildPageModel: jangkar node pindah ke paragraf judulnya", () => {
  beforeEach(() => vi.mocked(subheadingOf).mockReset());

  it("kolofon sebelum judul kitab: jangkar + ringkasan di paragraf judul, bukan di kolofon", async () => {
    const sections: SectionNode[] = [{ id: 1, parentId: null, level: 2, title: "باب" }];
    const colophon = passage(300, "يتلوه باب", { toc_node_id: 1 });
    const heading = passage(301, "باب", { toc_node_id: 1 });
    const summary = { section: { id: 1 }, review_status: "ai_generated" };
    const view = { ...page([colophon, heading]), summaries: [summary] } as unknown as PageView;
    const model = await buildPageModel(view, { editionId: 1, sections });
    expect(model.body.map((p) => [p.anchor, p.heading, p.sectionAnchors])).toEqual([
      ["p300", null, []],
      ["p301", { kind: "toc", level: 2 }, [1]],
    ]);
    expect(model.body[1]!.summaries).toEqual([summary]);
  });
});

describe("buildPageModel: judul node dari butir daftar (node_tail)", () => {
  beforeEach(() => vi.mocked(subheadingOf).mockReset());

  it("butir daftar = teks biasa; judul node di akhir paragraf berikutnya = h2 dengan jangkar + ringkasan", async () => {
    const title = "بيان حقيقة"; // judul node (buatan)
    const listText = `وبيان فضل ${title}`;
    const sections: SectionNode[] = [{ id: 7, parentId: null, level: 4, title }];
    const item = passage(200, title, { toc_node_id: 7 });
    const list = passage(201, listText, { toc_node_id: 7 });
    const body = passage(202, "نص", { toc_node_id: 7 });
    vi.mocked(subheadingOf).mockImplementation((_edition, seq) => {
      if (seq === 200) return { kind: "plain", sha: sha16(title) };
      if (seq === 201)
        return { kind: "tail", start: listText.indexOf(title), sha: sha16(listText), node: 7 };
      return undefined;
    });
    const summary = { section: { id: 7 }, review_status: "ai_generated" };
    const view = { ...page([item, list, body]), summaries: [summary] } as unknown as PageView;
    const model = await buildPageModel(view, { editionId: 1, sections });
    const [a, b, c] = model.body;
    expect(a!.heading).toBeNull();
    expect(a!.sectionAnchors).toEqual([]);
    expect(a!.summaries).toEqual([]);
    expect(b!.nodeHeading).toEqual({ id: 7, level: 4 });
    expect(b!.blocks.map((x) => x.kind)).toEqual(["text", "subheading"]);
    expect(blocksText(b!.blocks)).toBe(listText);
    expect(b!.sectionAnchors).toEqual([7]);
    expect(b!.summaries).toEqual([summary]);
    expect(c!.nodeHeading).toBeNull();
  });

  it("tanpa entri kurasi (atau sidik lain): butir tetap judul node seperti sebelumnya", async () => {
    const title = "بيان حقيقة";
    const sections: SectionNode[] = [{ id: 7, parentId: null, level: 4, title }];
    const item = passage(200, title, { toc_node_id: 7 });
    vi.mocked(subheadingOf).mockReturnValue({ kind: "plain", sha: "0".repeat(16) });
    const model = await buildPageModel(page([item]), { editionId: 1, sections });
    expect(model.body[0]!.heading).toEqual({ kind: "toc", level: 4 });
    expect(model.body[0]!.sectionAnchors).toEqual([7]);
  });
});

describe("buildPageModel: syair dan placeholder ayat", () => {
  beforeEach(() => vi.mocked(subheadingOf).mockReset());
  const aiTr = (text: string) => ({
    label: "ai_translation" as const,
    lang: "id",
    model: "uji",
    prompt_version: "uji@1",
    created_at: "2026-10-21",
    review_status: "ai_generated" as const,
    text,
  });

  it("syair (` ... `) ditata per syatr hanya di paragraf badan; catatan kaki tetap satu teks", async () => {
    const verse = `${T_CONT} ... ${T_HEAD}`;
    const body = passage(200, verse);
    const foot = passage(201, verse, { kind: "foot" });
    const model = await buildPageModel({ ...page([body]), footnotes: [foot] } as PageView, {
      editionId: 1,
      sections: [],
    });
    expect(model.body[0]!.blocks.map((b) => b.kind)).toContain("syatr");
    expect(model.footnotes[0]!.blocks.map((b) => b.kind)).toEqual(["text"]);
    // Teks tidak berubah: gabungan blok = text_raw, di badan maupun catatan kaki.
    expect(blocksText(model.body[0]!.blocks)).toBe(verse);
    expect(blocksText(model.footnotes[0]!.blocks)).toBe(verse);
  });

  it("placeholder ayat tanpa terjemahan Kemenag: segmen invalid berlabel rujukan ringkas", async () => {
    const p = passage(202, T_HEAD, { translation: aiTr("Lalu ⟦QS 2:255⟧ dibaca.") });
    const model = await buildPageModel(page([p]), { editionId: 1, sections: [] });
    expect(model.body[0]!.translation!.segments).toContainEqual({
      kind: "invalid",
      placeholder: "⟦QS 2:255⟧",
      label: "QS 2:255",
    });
  });
});
