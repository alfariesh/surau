import type { Metadata } from "next";

import { Card } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { listWorks } from "@surau/core";
import NextLink from "next/link";

import { ArabicInline } from "../../../components/arabic";
import { id } from "../../../i18n/id";
import { getEnv, readerEnabled } from "../../../lib/cloudflare";

const t = id.reader;

// Daftar karya. Dirender per request (bukan ISR): halaman tanpa parameter akan di-prerender saat
// build, padahal CI tidak punya D1. Isinya kecil (satu query karya + edisi + penulis).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.listTitle,
  alternates: { canonical: "/kitab" },
};

export default async function KitabPage() {
  const env = await getEnv();
  if (!readerEnabled(env)) return <ComingSoon />;
  const { works } = await listWorks(env.CORPUS_DB);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">{t.listHeading}</h1>
        <p className="text-muted text-base text-pretty">{t.listLead}</p>
      </header>
      <ul className="grid gap-4">
        {works.map((work) => {
          const edition = work.editions[0];
          return (
            <li key={work.slug}>
              <Card>
                <Card.Header className="gap-2">
                  <h2 className="card__title flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xl">
                    <span>{work.title_id ?? work.title_ar}</span>
                    <ArabicInline className="text-muted text-lg font-normal">
                      {work.title_ar}
                    </ArabicInline>
                  </h2>
                  {work.author ? (
                    <Card.Description>
                      {t.by} {work.author.name_id ?? work.author.name_ar}
                      {work.author.death_hijri ? ` (${t.deathHijri(work.author.death_hijri)})` : ""}
                    </Card.Description>
                  ) : null}
                </Card.Header>
                {edition ? (
                  <Card.Footer className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-muted text-xs">
                      {[edition.license, edition.volumes ? t.volumes(edition.volumes) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <NextLink
                      className={buttonVariants({ variant: "primary" })}
                      href={edition.permalink}
                    >
                      {t.open}
                    </NextLink>
                  </Card.Footer>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ComingSoon() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 pt-16 pb-16 sm:px-6">
      <h1 className="text-foreground text-3xl font-semibold tracking-tight">{t.soonHeading}</h1>
      <p className="text-muted text-base">{t.soonBody}</p>
      <NextLink className={buttonVariants({ variant: "primary" })} href="/tentang">
        {t.soonCta}
      </NextLink>
    </div>
  );
}
