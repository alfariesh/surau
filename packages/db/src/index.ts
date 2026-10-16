// @surau/db: skema data Surau tanpa ORM (ADR-009). Migrasi SQL ada di migrations/{corpus,app};
// modul ini mengekspor skema Zod baris, formula ID (ADR-029), dan repository bertipe.

export { D1_MAX_PARAMS, chunk, placeholders } from "./d1.ts";
export type { D1Db, D1Statement, D1Value } from "./d1.ts";

export {
  EDITION_ID_MAX,
  PAGE_STRIDE,
  PASSAGE_STRIDE,
  editionOfPageId,
  editionOfPassageId,
  pageId,
  passageId,
  passageAnchor,
  passageIdRange,
  tocNodeId,
} from "./ids.ts";

export * from "./schema/corpus.ts";
export * from "./schema/app.ts";

export {
  getAdjacentPages,
  getCorpusMeta,
  getEdition,
  getEditionContext,
  getFootnoteRefs,
  getNeedsReview,
  getPageByCitation,
  getPageById,
  getPassageById,
  getPassagesByPage,
  getSectionPassages,
  getTocChildren,
  getTocNode,
  getWorkBySlug,
  listEditions,
  listPages,
  listTocNodes,
  listWorkAuthors,
  listWorks,
  passageWithPageRow,
  tocNodeWithStartRow,
} from "./repo/corpus.ts";
export type { EditionContext, PassageWithPageRow, TocNodeWithStartRow } from "./repo/corpus.ts";
export { createFeedback, getSettings } from "./repo/app.ts";
