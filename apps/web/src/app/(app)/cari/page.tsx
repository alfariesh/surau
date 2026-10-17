import type { Metadata } from "next";

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
  const sections = await loadSearchSections(env.CORPUS_DB);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">{t.heading}</h1>
        <p className="text-muted text-base text-pretty">{t.lead}</p>
      </header>
      {/* useSearchParams di klien butuh batas Suspense (halaman tetap bisa dirender tanpa kueri). */}
      <Suspense fallback={null}>
        <SearchClient sections={sections} />
      </Suspense>
    </div>
  );
}
