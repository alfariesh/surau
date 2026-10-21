import type { Metadata } from "next";

import { TanyaClient } from "../../../components/tanya/tanya-client";
import { tanyaText as t } from "../../../i18n/tanya";

// /tanya (S21, percakapan ADR-073): halaman Maknaz, agent AI Surau (ADR-071; pipeline internal tetap
// "Jawab"). Statis; semua data lewat /api/jawab (status + SSE) dan /api/kutipan. Belum diindeks mesin
// pencari sampai `/rilis 4` membuka Maknaz untuk umum.
export const metadata: Metadata = {
  title: t.pageTitle,
  description: t.lead,
  robots: { index: false, follow: true },
};

export default function TanyaPage() {
  return <TanyaClient />;
}
