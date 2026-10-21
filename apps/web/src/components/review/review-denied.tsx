import { Typography } from "@heroui/react";
import { reviewText as t } from "../../i18n/review";

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
