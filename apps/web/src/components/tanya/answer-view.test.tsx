import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import type { JawabResult } from "../../lib/tanya/model";
import { AnswerView } from "./answer-view";

// Render server: blok bersitasi vs tanpa sitasi, kartu kutipan (teks Arab dimuat terpisah dari
// /api/kutipan, jadi saat render awal belum ada), status hadits diekstrak AI + tanda lemah, keadaan
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
      status: "sanadnya lemah",
      label: "ai_extracted",
    },
  ],
  search: [],
  model: "claude-haiku-5-5",
  prompt_version: "answer@5",
  corpus_version: "ihya-v7",
};

describe("AnswerView", () => {
  it("jawaban: penanda sitasi, blok tanpa sitasi redup, status hadits AI tanpa tanda dari ringkasan", () => {
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
    expect(html).toContain("diekstrak AI");
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
