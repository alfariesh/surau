import type { Metadata } from "next";

import { PageLead, PageTitle } from "../../../components/page-title";
import { TanyaClient } from "../../../components/tanya/tanya-client";
import { tanyaText as t } from "../../../i18n/tanya";

// /tanya (S21): halaman Maknaz, agent AI Surau (ADR-071; pipeline internal tetap "Jawab"). Statis; semua data lewat /api/jawab (status + SSE) dan /api/kutipan.
// Belum diindeks mesin pencari sampai `/rilis 4` membuka Maknaz untuk umum.
export const metadata: Metadata = {
  title: t.pageTitle,
  description: t.lead,
  robots: { index: false, follow: true },
};

export default function TanyaPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-3">
        <PageTitle>{t.heading}</PageTitle>
        <PageLead>{t.lead}</PageLead>
      </header>
      <TanyaClient />
    </div>
  );
}
