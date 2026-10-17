// Hasil `searchText` → bentuk yang dinilai metrik dan diringkas di laporan.
import type { SearchView } from "@surau/core";

import { citationKey } from "./corpus.ts";
import type { CorpusIndex } from "./corpus.ts";
import type { ResultPage } from "./metrics.ts";
import type { ResultSummary } from "./report.ts";

/** Halaman hasil → bentuk yang dinilai metrik (page_id dari sitasi, node paragraf cocok). */
export function resultPages(view: SearchView, index: CorpusIndex): ResultPage[] {
  return view.results.map((page) => {
    const key = citationKey(
      page.citation.source.edition.id,
      page.citation.juz,
      page.citation.page_no,
    );
    const row = index.pageByCitation.get(key);
    if (row === undefined) throw new Error(`halaman hasil tidak dikenal: ${key}`);
    return {
      pageId: row.id,
      tocNodeIds: page.hits.flatMap((h) => (h.toc_node_id === null ? [] : [h.toc_node_id])),
    };
  });
}

export function summarize(view: SearchView): ResultSummary[] {
  return view.results.slice(0, 5).map((page) => {
    const section = page.hits.find((h) => h.section !== null)?.section;
    return {
      label: `j${page.citation.juz} h${page.citation.page_no}${section ? ` ${section.title_ar}` : ""}`,
    };
  });
}
