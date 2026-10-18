import type { Metadata } from "next";

import { Widget } from "@heroui-pro/react";
import { buttonVariants } from "@heroui/styles";
import { listWorks } from "@surau/core";
import NextLink from "next/link";

import { ArabicInline } from "../../../components/arabic";
import { WorkCover } from "../../../components/book/work-cover";
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
        <h1 className="text-foreground text-[2rem] leading-[1.12] font-semibold tracking-tight sm:text-[2.75rem] lg:text-5xl">
          {t.listHeading}
        </h1>
        <p className="text-muted text-base text-pretty">{t.listLead}</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {works.map((work) => {
          const edition = work.editions[0];
          const title = work.title_id ?? work.title_ar;
          return (
            <li key={work.slug} className="flex">
              {/* Seluruh kartu bisa diklik lewat tautan judul (after:inset-0); sampul miring saat
                  kartu di-hover atau tautannya difokus keyboard (book-trigger). */}
              <Widget className="book-trigger relative w-full has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-[var(--focus)]">
                <Widget.Header className="justify-center px-6 pt-8 pb-6">
                  <WorkCover width={{ xs: 132, sm: 140, md: 156 }} work={work} />
                </Widget.Header>
                <Widget.Content className="flex flex-1 flex-col gap-2">
                  <h2 className="text-foreground flex flex-col items-start gap-1 text-lg font-semibold">
                    {edition ? (
                      <NextLink
                        className="outline-none after:absolute after:inset-0 after:rounded-[inherit]"
                        href={edition.permalink}
                      >
                        {title}
                      </NextLink>
                    ) : (
                      <span>{title}</span>
                    )}
                    <ArabicInline className="text-muted text-base font-normal">
                      {work.title_ar}
                    </ArabicInline>
                  </h2>
                  {work.author ? (
                    <p className="text-muted text-sm">
                      {t.by} {work.author.name_id ?? work.author.name_ar}
                      {work.author.death_hijri ? ` (${t.deathHijri(work.author.death_hijri)})` : ""}
                    </p>
                  ) : null}
                </Widget.Content>
              </Widget>
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
      <h1 className="text-foreground text-[2rem] leading-[1.12] font-semibold tracking-tight sm:text-[2.75rem] lg:text-5xl">
        {t.soonHeading}
      </h1>
      <p className="text-muted text-base">{t.soonBody}</p>
      <NextLink className={buttonVariants({ variant: "primary" })} href="/tentang">
        {t.soonCta}
      </NextLink>
    </div>
  );
}
