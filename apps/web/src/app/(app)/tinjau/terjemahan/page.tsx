import type { Metadata } from "next";
import { headers } from "next/headers";
import { Typography } from "@heroui/react";
import { parseTranslationEditors } from "@surau/core";
import { getEnv } from "../../../../lib/cloudflare";
import { reviewIdentity } from "../../../../lib/review-auth";
import { translationQueue } from "../../../../lib/translation-review";
import { PageTitle } from "../../../../components/page-title";
import { ReviewDenied } from "../../../../components/review/review-denied";
import { ReviewNav } from "../../../../components/review/review-nav";
import {
  TranslationNotRegistered,
  TranslationReviewClient,
} from "../../../../components/review/translation-review-client";
import { translationReviewText as t } from "../../../../i18n/review-terjemahan";

export const metadata: Metadata = { title: t.title, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Koreksi terjemahan (X08, ADR-081). Akses sama dengan /tinjau (Access + JWT), lalu peran editor
// terdaftar (`TRANSLATION_EDITORS`) diperiksa di server. Akun yang belum terdaftar melihat kode
// akunnya untuk dikirim ke pemilik; nama yang diketik tidak pernah dipakai.
const reviewNow = () => new Date().toISOString();

export default async function TranslationReviewPage() {
  const env = await getEnv();
  const identity = await reviewIdentity((await headers()).get("cf-access-jwt-assertion"), env);
  if (!identity) return <ReviewDenied href="https://surau.org/tinjau/terjemahan" />;
  const editor = parseTranslationEditors(env.TRANSLATION_EDITORS).get(identity);
  const queue =
    editor === undefined
      ? null
      : await translationQueue(
          { corpus: env.CORPUS_DB, app: env.APP_DB, identity, now: reviewNow() },
          "todo",
          0,
        );
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <ReviewNav current="terjemahan" />
      <header className="space-y-2">
        <Typography type="body-sm" className="text-accent">
          {t.eyebrow}
        </Typography>
        <PageTitle>{t.title}</PageTitle>
        <Typography color="muted">{t.intro}</Typography>
      </header>
      {queue === null ? (
        <TranslationNotRegistered code={identity} />
      ) : (
        <TranslationReviewClient initial={queue} />
      )}
    </div>
  );
}
