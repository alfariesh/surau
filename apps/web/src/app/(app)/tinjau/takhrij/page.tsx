import type { Metadata } from "next";
import { headers } from "next/headers";
import { Typography } from "@heroui/react";
import { parseUstadzKeys } from "@surau/core";
import { getEnv } from "../../../../lib/cloudflare";
import { reviewIdentity } from "../../../../lib/review-auth";
import { takhrijQueue } from "../../../../lib/takhrij-queue";
import { PageTitle } from "../../../../components/page-title";
import { ReviewDenied } from "../../../../components/review/review-denied";
import { ReviewNav } from "../../../../components/review/review-nav";
import { TakhrijReviewClient } from "../../../../components/review/takhrij-review-client";
import { takhrijReviewText as t } from "../../../../i18n/review-takhrij";

export const metadata: Metadata = { title: t.title, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Antrean tinjauan label status hadits (X07, ADR-070). Akses sama dengan /tinjau (Access + JWT).
// Waktu (retensi hitungan kutipan) dievaluasi pada request server, bukan pada render komponen klien.
const reviewNow = () => new Date().toISOString();

export default async function TakhrijReviewPage() {
  const env = await getEnv();
  const identity = await reviewIdentity((await headers()).get("cf-access-jwt-assertion"), env);
  if (!identity) return <ReviewDenied href="https://surau.org/tinjau/takhrij" />;
  const queue = await takhrijQueue(
    {
      corpus: env.CORPUS_DB,
      app: env.APP_DB,
      identity,
      now: reviewNow(),
      ustadzKeys: parseUstadzKeys(env.TAKHRIJ_USTADZ_KEYS),
    },
    "todo",
    0,
  );
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <ReviewNav current="takhrij" />
      <header className="space-y-2">
        <Typography type="body-sm" className="text-accent">
          {t.eyebrow}
        </Typography>
        <PageTitle>{t.title}</PageTitle>
        <Typography color="muted">{t.intro}</Typography>
      </header>
      <TakhrijReviewClient initial={queue} />
    </div>
  );
}
