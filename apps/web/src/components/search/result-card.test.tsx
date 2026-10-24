import type { SearchHit, SearchPage } from "@surau/core";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { ResultCard } from "./result-card";

// Data BUATAN (bukan teks kitab): satu paragraf yang cocok lewat jalur gagasan Intisari (X16).
const hit = {
  id: 10_000_001,
  anchor: "p1",
  kind: "body",
  ord: 1,
  toc_node_id: 7,
  section: { id: 7, title_ar: "باب", level: 2, permalink: "/kitab/uji/bab/7" },
  location: { juz: 1, page_no: 5, permalink: "/kitab/uji/1/5#p1", label: "Uji, j. 1, h. 5" },
  score: 0.016,
  highlights: [],
  snippet: { char_start: 0, char_end: 2, text: "نص" },
  matched_by: [{ path: "digest", rank: 1, all_terms: true }],
  translation: null,
  summary: null,
  digest_point: {
    label: "ai_digest",
    section: { id: 7, title_ar: "باب", level: 2, permalink: "/kitab/uji/bab/7" },
    ord: 2,
    title: "Zuhud terhadap dunia",
    title_highlights: [{ char_start: 0, char_end: 5 }],
    lang: "id",
    model: "m",
    prompt_version: "digest-section@1",
    created_at: "2026-10-24",
    review_status: "ai_generated",
    highlights: [],
    snippet: { char_start: 0, char_end: 11, text: "Isi gagasan" },
    permalink: "/kitab/uji/bab/7/intisari",
  },
} as unknown as SearchHit;

const page = {
  citation: { juz: 1, page_no: 5, permalink: "/kitab/uji/1/5", label: "Uji, j. 1, h. 5" },
  score: 0.016,
  hit_count: 1,
  hits: [hit],
} as unknown as SearchPage;

describe("ResultCard: gagasan Intisari (X16)", () => {
  it("berlabel Intisari AI, judul gagasan bersorot, tautan ke halaman Intisari", () => {
    const html = renderToStaticMarkup(<ResultCard page={page} query="zuhud" />);
    const box =
      /<div[^>]*data-search-digest=""[^>]*>([\s\S]*?)Buka Intisari/u.exec(html)?.[1] ?? "";
    expect(box).toContain("Intisari AI");
    expect(box).toContain('<mark class="search-mark">Zuhud</mark>');
    expect(html).toContain('href="/kitab/uji/bab/7/intisari#gagasan-2"');
    expect(html).toContain("gagasan Intisari");
  });

  it("respons lama tanpa digest_point (sebelum SEARCH_RESULT_VERSION 3) tetap dirender", () => {
    const { digest_point: _, ...old } = hit;
    const html = renderToStaticMarkup(
      <ResultCard page={{ ...page, hits: [old as SearchHit] }} query="zuhud" />,
    );
    expect(html).not.toContain("data-search-digest");
  });
});
