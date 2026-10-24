import type { PageView, Passage, SummaryView, TranslationView } from "@surau/core";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { buildPageModel } from "../../lib/reader/page-model";

import { PageText } from "./page-text";
import { ReaderProvider } from "./reader-context";
import { SectionSummary } from "./section-summary";

// Penanda mode baca di markup pembaca (X11). Teks buatan (bukan teks kitab); edisi 999 tidak punya
// daftar kurasi subjudul.

const tr = (text: string, lang = "id"): TranslationView => ({
  label: "ai_translation",
  lang,
  model: "m",
  prompt_version: "p",
  created_at: "2026-10-01",
  review_status: "ai_generated",
  human_review: null,
  text,
});

function passage(seq: number, text: string, translation: TranslationView | null): Passage {
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
    translation,
  } as unknown as Passage;
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

async function render(body: Passage[]) {
  const model = await buildPageModel(page(body), { editionId: 999, sections: [] });
  return renderToStaticMarkup(
    <ReaderProvider
      cite={{ author: null, title: "Uji", publisher: null, juz: 1, pageNo: 5 }}
      pagePath="/kitab/uji/1/5"
    >
      <PageText model={model} />
    </ReaderProvider>,
  );
}

describe("PageText: penanda mode baca (X11)", () => {
  it("paragraf tanpa terjemahan bertanda data-no-tr; yang berterjemahan tidak", async () => {
    const html = await render([passage(1, "نص", tr("Teks pertama.")), passage(2, "نص", null)]);
    expect(html).toContain('data-no-tr="" id="p2"');
    expect(html).not.toContain('data-no-tr="" id="p1"');
  });

  it("bahasa blok terjemahan dari data, tombol UI di dalam blok Arab berbahasa UI", async () => {
    const html = await render([passage(1, "نص", tr("Patience is half of faith.", "en"))]);
    expect(html).toMatch(/class="passage-translation"[^>]*lang="en"/u);
    expect(html).toMatch(
      /class="[^"]*passage-actions[^"]*"[^>]*lang="id"|lang="id"[^>]*class="[^"]*passage-actions/u,
    );
  });
});

describe("PageText: mode Terjemahan (X11 bagian B)", () => {
  it("paragraf berterjemahan: baris alat + tombol Teks Arab yang mengendalikan blok Arab yang dilipat", async () => {
    const html = await render([passage(1, "نص", tr("Teks pertama."))]);
    expect(html).toContain('class="passage-tools" data-copy-skip=""');
    expect(html).toMatch(/aria-controls="ar-p1" aria-expanded="false" class="arabic-toggle"/u);
    expect(html).toMatch(/class="arabic-text text-foreground[^"]*passage-ar"[^>]*id="ar-p1"/u);
    // ⋮ kedua hanya di klien di mode Terjemahan: HTML server tidak menggandakannya.
    expect(html.match(/passage-actions/g)).toHaveLength(1);
    expect(html).not.toContain("no-tr-note");
  });

  it("paragraf tanpa terjemahan: tanpa baris alat dan tanpa lipatan, dengan keterangan", async () => {
    const html = await render([passage(2, "نص", null)]);
    expect(html).not.toContain("passage-tools");
    expect(html).not.toContain("passage-ar");
    expect(html).toContain("no-tr-note");
  });

  it("penanda catatan kaki di terjemahan membuka takhrij di tempat (tombol), bukan tautan lompat", async () => {
    const body = passage(1, "نص (١)", tr("Teks pertama (١) selesai."));
    (body as { footnote_refs: unknown }).footnote_refs = [
      { marker: "١", char_start: 3, char_end: 6, footnote_id: 10_000_009 },
    ];
    const foot = passage(9, "(١) تخريج", null);
    (foot as { kind: string }).kind = "foot";
    const view = page([body]);
    (view as { footnotes: Passage[] }).footnotes = [foot];
    const model = await buildPageModel(view, { editionId: 999, sections: [] });
    const html = renderToStaticMarkup(
      <ReaderProvider
        cite={{ author: null, title: "Uji", publisher: null, juz: 1, pageNo: 5 }}
        pagePath="/kitab/uji/1/5"
      >
        <PageText model={model} />
      </ReaderProvider>,
    );
    const translation = html.slice(html.indexOf('class="passage-translation"'));
    // Tanpa hover (render server/ponsel) pemicunya tombol popover; namanya sama dengan penanda Arab.
    expect(translation).toMatch(
      /<span class="translation-marker"><button[^>]*aria-label="Catatan kaki \(١\)"/u,
    );
    expect(translation).not.toContain('class="link translation-marker"');
  });
});

describe("SectionSummary: bantuan terjemahan (X11)", () => {
  it("bertanda data-tr-aid (disembunyikan mode Arab) dan berbahasa datanya", () => {
    const summary = {
      label: "ai_summary",
      section: { id: 7, title_ar: "باب", level: 2, permalink: "/kitab/uji/1/5#bab-7" },
      lang: "en",
      model: "m",
      prompt_version: "p",
      created_at: "2026-10-01",
      review_status: "ai_generated",
      text: "A short summary.",
    } as unknown as SummaryView;
    const html = renderToStaticMarkup(<SectionSummary summary={summary} />);
    expect(html).toContain('data-tr-aid=""');
    expect(html).toContain('lang="en"');
  });
});
