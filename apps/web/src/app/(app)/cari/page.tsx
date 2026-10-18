import type { Metadata } from "next";

import { Magnifier } from "@gravity-ui/icons";
import { EmptyState } from "@heroui-pro/react";
import { LATIN_SEARCH_SCHEMA_VERSION, getCorpusMeta } from "@surau/db";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SearchClient } from "../../../components/search/search-client";
import { id } from "../../../i18n/id";
import { getEnv, readerEnabled } from "../../../lib/cloudflare";
import { loadSearchSections } from "../../../lib/search/sections";

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
  const [sections, meta] = await Promise.all([
    loadSearchSections(env.CORPUS_DB),
    getCorpusMeta(env.CORPUS_DB),
  ]);
  // Korpus produksi lama (sebelum indeks Indonesia, ARSITEKTUR §7 aturan 5): pesan, bukan 503.
  const ready = meta.schema_version >= LATIN_SEARCH_SCHEMA_VERSION;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">{t.heading}</h1>
        <p className="text-muted text-base text-pretty">{t.lead}</p>
      </header>
      {ready ? (
        // useSearchParams di klien butuh batas Suspense (halaman tetap bisa dirender tanpa kueri).
        <Suspense fallback={null}>
          <SearchClient sections={sections} />
        </Suspense>
      ) : (
        <section aria-labelledby="cari-belum">
          <h2 className="sr-only" id="cari-belum">
            {t.soonHeading}
          </h2>
          <EmptyState size="sm">
            <EmptyState.Header>
              <EmptyState.Media variant="icon">
                <Magnifier />
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
