import type { Metadata } from "next";

import NextLink from "next/link";
import { notFound } from "next/navigation";

import { PlayButton } from "../../../../components/listen/play-button";
import type { ListenTrack } from "../../../../components/listen/track";
import { PageLead, PageTitle } from "../../../../components/page-title";
import { listen as t } from "../../../../i18n/id/listen";
import { devPagesEnabled, getEnv } from "../../../../lib/cloudflare";
import { PAGE_FRAME } from "../../../../lib/layout";

// Halaman uji pemutar "Dengarkan" (X17) dengan audio sunyi buatan (`./sunyi.mp3`), tanpa D1 dan
// tanpa media.surau.org: e2e pemutar di `next dev` dan Preview CI. Tidak tampil di produksi
// (`DEV_PAGES`), tidak diindeks.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.devTitle,
  robots: { index: false, follow: false },
};

/** Track uji: kunci objek berpola sama dengan R2, judul dan bab buatan. */
function fixture(node: number, seconds: number, starts: readonly number[]): ListenTrack {
  return {
    id: `uji/${node}`,
    key: `uji/id/${node}-${String(node).padStart(12, "0")}.mp3`,
    src: `/dev/dengar/sunyi.mp3?d=${seconds}`,
    title: `Intisari uji ${node}`,
    titleLang: "id",
    workTitle: "Kitab Uji",
    href: "/dev/dengar",
    duration: seconds,
    voice: { kind: "ai", name: "Narator Uji" },
    chapters: starts.map((start, i) => ({
      point_ord: i + 1,
      start,
      title: `Gagasan uji ${i + 1}`,
    })),
  };
}

export default async function DevListenPage() {
  if (!devPagesEnabled(await getEnv())) notFound();
  return (
    <div className={`${PAGE_FRAME} flex flex-col gap-6 pt-8 pb-16`}>
      <div className="flex flex-col gap-3">
        <PageTitle>{t.devTitle}</PageTitle>
        <PageLead>{t.devLead}</PageLead>
      </div>
      <div className="flex flex-wrap gap-6">
        <PlayButton track={fixture(1, 90, [10, 30, 50, 70])} />
        <PlayButton track={fixture(2, 60, [15, 40])} />
      </div>
      <NextLink className="text-link text-sm underline" href="/tentang">
        {t.devOther}
      </NextLink>
    </div>
  );
}
