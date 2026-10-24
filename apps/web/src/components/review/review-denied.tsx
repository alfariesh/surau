import { Typography } from "@heroui/react";
import NextLink from "next/link";
import { reviewText as t } from "../../i18n/review";
import { translationReviewText as tr } from "../../i18n/review-terjemahan";

/** Tampilan tanpa identitas Access yang sah (semua halaman /tinjau). */
export function ReviewDenied({ href = "https://surau.org/tinjau" }: { href?: string }) {
  return (
    <section className="mx-auto max-w-xl space-y-4 px-4 py-12">
      <Typography.Heading level={1} className="text-2xl">
        {t.denied}
      </Typography.Heading>
      <Typography>{t.deniedBody}</Typography>
      <a className="text-accent underline" href={href}>
        {t.login}
      </a>
    </section>
  );
}

/** Akun sah tetapi bukan untuk ruang ini (editor terjemahan tanpa peran itu, X08 ADR-081). */
export function ReviewRoleDenied() {
  return (
    <section className="mx-auto max-w-xl space-y-4 px-4 py-12">
      <Typography.Heading level={1} className="text-2xl">
        {tr.roleDeniedTitle}
      </Typography.Heading>
      <Typography>{tr.roleDeniedBody}</Typography>
      <NextLink className="text-accent underline" href="/tinjau/terjemahan">
        {tr.openTranslations}
      </NextLink>
    </section>
  );
}
