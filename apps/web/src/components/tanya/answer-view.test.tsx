import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import type { JawabResult } from "../../lib/tanya/model";
import { AddedTerms, AnswerView, HadithTerms } from "./answer-view";

// Render server: blok bersitasi vs tanpa sitasi, kartu kutipan (teks Arab dimuat terpisah dari
// /api/kutipan, jadi saat render awal belum ada), status hadits dari label istilah takhrij + tanda lemah, keadaan
// fallback/not_found menampilkan hasil Cari. Teks di sini buatan (bukan teks kitab).
const base: JawabResult = {
  outcome: "answer",
  reason: null,
  text: "",
  blocks: [
    { text: "Menurut al-Ghazali dalam **Ihya**, sabar adalah cahaya.", citations: [1] },
    { text: " Ini kalimat penghubung.", citations: [] },
    { text: "\n\nStatus hadits: sanadnya lemah.", citations: [2] },
  ],
  citations: [
    {
      n: 1,
      passage_id: 10,
      char_start: 0,
      char_end: 5,
      kind: "body",
      label: "Ihya, j. 1, h. 200",
      permalink: "/kitab/ihya/1/200#p1",
    },
    {
      n: 2,
      passage_id: 11,
      char_start: 0,
      char_end: 9,
      kind: "foot",
      label: "Ihya, j. 1, h. 200",
      permalink: "/kitab/ihya/1/200#p2",
    },
  ],
  hadith: [
    {
      passage_id: 10,
      footnote: { passage_id: 11, char_start: 0, char_end: 9 },
      status: "takhrij menyebut: lemah",
      label: "rule_extracted",
      rules_version: 1,
      mixed: false,
      terms: [{ kind: "daif", char_start: 2, char_end: 9, gloss: "lemah" }],
    },
  ],
  search: [],
  model: "claude-haiku-5-5",
  prompt_version: "answer@5",
  corpus_version: "ihya-v7",
};

describe("AnswerView", () => {
  it("jawaban: penanda sitasi, blok tanpa sitasi redup, status hadits berlabel otomatis tanpa tanda dari ringkasan", () => {
    const html = renderToStaticMarkup(
      <AnswerView question="Apa itu sabar?" result={base} cached={false} />,
    );
    expect(html).toContain('href="#kutipan-1"');
    expect(html).toContain("Menurut al-Ghazali dalam Ihya, sabar adalah cahaya.");
    expect(html).not.toContain("**");
    expect(html).toMatch(/class="text-muted"[^>]*> Ini kalimat penghubung\./u);
    expect(html).toContain("Teks redup tidak didukung kutipan langsung");
    expect(html).toContain('aria-label="Kutipan 1"');
    // Urutan judul: judul pertama di hasil adalah h2 "Jawaban" (bukan h3 Card.Title).
    expect(html.match(/<h[1-6]\b[^>]*>/u)?.[0]).toMatch(/^<h2/u);
    expect(html).toMatch(/<h2[^>]*>Jawaban<\/h2>/u);
    expect(html).toContain("dikenali otomatis dari teks takhrij");
    expect(html).toContain("takhrij menyebut: lemah");
    // Tanpa teks takhrij dari DB (dimuat sesudah render), tidak ada tanda kelemahan dari ringkasan AI.
    expect(html).not.toContain("istilah kelemahan");
    expect(html).toContain('id="kutipan-2"');
    expect(html).toContain("Takhrij al-&#x27;Iraqi");
    expect(html).toContain("Claude Haiku 5.5");
    expect(html).toContain("Laporkan jawaban keliru");
    // Tidak ada teks Arab dari model di HTML awal (kutipan dimuat dari DB sesudahnya).
    expect(html).not.toMatch(/\p{Script=Arabic}/u);
  });

  it("fallback dan tidak ditemukan: pesan + hasil Cari + tautan Cari", () => {
    const hit = {
      passage_id: 12,
      char_start: 0,
      char_end: 30,
      label: "Ihya, j. 2, h. 3",
      permalink: "/kitab/ihya/2/3#p4",
    };
    const fb = renderToStaticMarkup(
      <AnswerView
        question="Apa?"
        cached={false}
        result={{
          ...base,
          outcome: "fallback",
          reason: "unverified",
          blocks: [],
          citations: [],
          hadith: [],
          search: [hit],
        }}
      />,
    );
    expect(fb).toContain("tidak dapat memverifikasi kutipan");
    expect(fb).toMatch(/<h2[^>]*>Paragraf yang mungkin terkait/u);
    expect(fb).toContain('href="/cari?q=Apa%3F"');
    const nf = renderToStaticMarkup(
      <AnswerView
        question="Apa?"
        cached={false}
        result={{
          ...base,
          outcome: "not_found",
          blocks: [{ text: "Tidak ditemukan di kitab yang dicakup.", citations: [] }],
          citations: [],
          hadith: [],
          search: [hit],
        }}
      />,
    );
    expect(nf).toContain("Tidak ditemukan di kitab yang dicakup");
    expect(nf).toContain('href="/kitab/ihya/2/3#p4"');
  });
});

describe("status hadits X06", () => {
  it("bentuk lama dari API sebelum X06 (tanpa terms/mixed) tidak merusak tampilan", () => {
    const old = {
      ...base,
      hadith: [
        {
          passage_id: 10,
          footnote: { passage_id: 11, char_start: 0, char_end: 9 },
          status: "sanadnya lemah",
          label: "ai_extracted" as const,
        },
      ],
    };
    const html = renderToStaticMarkup(
      <AnswerView question="Apa itu sabar?" result={old} cached={false} />,
    );
    expect(html).toContain("diekstrak AI");
    expect(html).not.toContain("dikenali otomatis");
  });

  it("istilah takhrij: frasa Arab disalin dari teks DB lewat rentang, plus arti; tanpa istilah → kosong", () => {
    // Teks takhrij BUATAN (bukan teks kitab), potongan mulai offset 0.
    const text = "رواه فلان بإسناد ضعيف";
    const html = renderToStaticMarkup(
      <HadithTerms
        text={text}
        footnoteStart={0}
        terms={[
          { kind: "daif", char_start: 10, char_end: 21, gloss: "lemah" },
          { kind: "daif", char_start: 10, char_end: 21, gloss: "lemah" },
          { kind: "sahih", char_start: 30, char_end: 40, gloss: "sahih" },
        ]}
      />,
    );
    expect(html).toContain("بإسناد ضعيف");
    expect(html).toContain("lemah");
    expect(html.match(/<li/gu)).toHaveLength(1);
    expect(html).not.toContain("sahih");
    expect(renderToStaticMarkup(<HadithTerms text={text} footnoteStart={0} terms={[]} />)).toBe("");
  });

  it("X07: label tertinjau ustadz diberi chip sendiri; jenis tambahan penilai tampil tanpa teks Arab", () => {
    const claim = base.hadith[0]!;
    const view = (label: (typeof claim)["label"], added: { kind: string; gloss: string }[] = []) =>
      renderToStaticMarkup(
        <AnswerView
          question="Apa itu sabar?"
          result={{ ...base, hadith: [{ ...claim, label, added_terms: added }] }}
          cached={false}
        />,
      );
    expect(view("ustadz_reviewed")).toContain("ditinjau ustadz");
    expect(view("ustadz_reviewed")).not.toContain("belum ditinjau");
    expect(view("ustadz_corrected")).toContain("dikoreksi ustadz");
    const added = renderToStaticMarkup(
      <AddedTerms terms={[{ kind: "mursal", gloss: "mursal" }]} />,
    );
    expect(added).toContain("Ditetapkan peninjau");
    expect(added).toContain("mursal");
    expect(added).not.toMatch(/\p{Script=Arabic}/u);
    expect(renderToStaticMarkup(<AddedTerms terms={[]} />)).toBe("");
  });
});
