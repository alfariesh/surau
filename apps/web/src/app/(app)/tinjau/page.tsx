import type { Metadata } from "next";
import { headers } from "next/headers";
import { listAnswerLogs } from "@surau/db";
import { getEnv } from "../../../lib/cloudflare";
import { reviewIdentity, reviewRoomAllowed } from "../../../lib/review-auth";
import { ReviewClient } from "../../../components/review/review-client";
import { reviewText as t } from "../../../i18n/review";
import { Typography } from "@heroui/react";
import { PageTitle } from "../../../components/page-title";
import { ReviewDenied, ReviewRoleDenied } from "../../../components/review/review-denied";
import { ReviewNav } from "../../../components/review/review-nav";

export const metadata: Metadata = { title: t.title, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Waktu retensi dievaluasi pada request server, bukan pada render komponen klien.
const reviewNow = () => new Date().toISOString();

export default async function ReviewPage() {
  const env = await getEnv();
  const identity = await reviewIdentity((await headers()).get("cf-access-jwt-assertion"), env);
  if (!identity) return <ReviewDenied />;
  if (!reviewRoomAllowed(identity, "jawaban", env)) return <ReviewRoleDenied />;
  const rows = await listAnswerLogs(env.APP_DB, reviewNow());
  const items = rows.map((r) => ({
    id: r.id,
    question_id: r.question_id,
    run_id: r.run_id,
    created_at: r.created_at,
  }));
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <ReviewNav current="jawaban" />
      <header className="space-y-2">
        <Typography type="body-sm" className="text-accent">
          {t.eyebrow}
        </Typography>
        <PageTitle>{t.title}</PageTitle>
        <Typography color="muted">{t.intro}</Typography>
      </header>
      <ReviewClient initialItems={items} />
    </div>
  );
}
