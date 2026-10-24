import type { Metadata } from "next";

import { Search01 } from "../../../icons";
import { EmptyState } from "@heroui-pro/react";
import { LATIN_SEARCH_SCHEMA_VERSION, getCorpusMeta } from "@surau/db";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SearchClient } from "../../../components/search/search-client";
import { id } from "../../../i18n/id";
import { PAGE_FRAME } from "../../../lib/layout";
import { getEnv, readerEnabled } from "../../../lib/cloudflare";
import { loadSearchSections } from "../../../lib/search/sections";
import { jawabRouteOn } from "../../../lib/jawab-flag";
import { listWorks } from "@surau/core";
import { Typography } from "@heroui/react";
import { PageLead, PageTitle } from "../../../components/page-title";

const t = id.search;

// Halaman Cari (S14). Kerangka + pilihan filter dirender server per request (seperti /kitab: CI
// tidak punya D1 saat build); hasil diambil klien dari /api/search (batas per klien, cache hasil),
// jadi kueri ada di URL (`?q=`, bisa dibagikan) tanpa render server per kueri. Tanpa LLM.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.pageTitle,
  description: t.metaDescription,
  alternates: { canonical: "/cari" },
};

export default async function CariPage() {
  const env = await getEnv();
  if (!readerEnabled(env)) notFound();
  const [sections, meta, { works }] = await Promise.all([
    loadSearchSections(env.CORPUS_DB),
    getCorpusMeta(env.CORPUS_DB),
    listWorks(env.CORPUS_DB),
  ]);
  // Pemilih sumber: karya asli berjudul Latin (judul Arab tidak dipakai di daftar teks biasa).
  const sourceWorks = works.flatMap((w) =>
    w.title_id ? [{ slug: w.slug, title: w.title_id }] : [],
  );
  // Korpus produksi lama (sebelum indeks Indonesia, ARSITEKTUR §7 aturan 5): pesan, bukan 503.
  const ready = meta.schema_version >= LATIN_SEARCH_SCHEMA_VERSION;

  return (
    <div className={`${PAGE_FRAME} flex flex-col gap-6 pt-8 pb-16 sm:pt-12 [&>*]:max-w-3xl`}>
      <header className="flex flex-col gap-2">
        <PageTitle>{t.heading}</PageTitle>
        <PageLead className="text-base sm:text-base">{t.lead}</PageLead>
      </header>
      {ready ? (
        // useSearchParams di klien butuh batas Suspense (halaman tetap bisa dirender tanpa kueri).
        <Suspense fallback={null}>
          <SearchClient ask={jawabRouteOn(env)} sections={sections} works={sourceWorks} />
        </Suspense>
      ) : (
        <section aria-labelledby="cari-belum">
          <Typography.Heading level={2} className="text-base sr-only" id="cari-belum">
            {t.soonHeading}
          </Typography.Heading>
          <EmptyState size="sm">
            <EmptyState.Header>
              <EmptyState.Media variant="icon">
                <Search01 />
              </EmptyState.Media>
              <EmptyState.Title>{t.soonHeading}</EmptyState.Title>
              <EmptyState.Description>{t.soonBody}</EmptyState.Description>
            </EmptyState.Header>
          </EmptyState>
        </section>
      )}
    </div>
  );
}
