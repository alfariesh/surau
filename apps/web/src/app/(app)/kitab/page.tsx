import type { Metadata } from "next";

import { Widget } from "@heroui-pro/react";
import { buttonVariants } from "@heroui/styles";
import { listWorks } from "@surau/core";
import NextLink from "next/link";

import { ContinueReading } from "../../../components/reader/continue-reading";
import { ArabicInline } from "../../../components/arabic";
import { UpcomingKitabList } from "../../../components/book/upcoming-kitab";
import { WorkCover } from "../../../components/book/work-cover";
import { UPCOMING_KITAB } from "../../../content/kitab-mendatang";
import { CITE_PUBLISHER, WORK_BLURB } from "../../../content/works";
import { BookOpen01 } from "../../../icons";
import { id } from "../../../i18n/id";
import { PAGE_FRAME } from "../../../lib/layout";
import { getEnv, readerEnabled } from "../../../lib/cloudflare";
import { Typography } from "@heroui/react";
import { PageTitle } from "../../../components/page-title";

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
  // Kitab terbaru = ID terbesar (listWorks urut ID); hanya ia yang tampil di "Rilis terbaru".
  const latest = works.at(-1);
  const latestEdition = latest?.editions[0];
  // Judul Latin; bila belum ada, judul Arab lewat ArabicInline (lang/dir benar).
  const latestTitle = latest
    ? (latest.title_id ?? <ArabicInline>{latest.title_ar}</ArabicInline>)
    : null;

  return (
    <div className={`${PAGE_FRAME} flex flex-col gap-8 pt-8 pb-16 sm:pt-12`}>
      {/* Judul halaman hanya untuk pembaca layar (dan judul ringkas navbar); tampilan langsung dibuka
          widget "Rilis terbaru" atas arahan pemilik. */}
      <PageTitle className="sr-only">{t.listHeading}</PageTitle>
      <ContinueReading className="w-full max-w-2xl" />
      {/* Rilis terbaru: hanya kitab terbaru (ID terbesar). Latar luar bergradien lembut (versi tipis panggung
          "Coba Surau" di landing); isi tetap permukaan Widget. Judul Arab khat Ruq'ah di kanan header
          sebagai watermark (dekoratif) yang menjorok sedikit ke bawah, di belakang isi. */}
      {latest ? (
        <section aria-labelledby="rilis-terbaru">
          <Widget className="rilis-gradient relative">
            <Widget.Header className="relative z-[1] mt-0 items-start p-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <Typography.Heading id="rilis-terbaru" level={2} className="text-xl">
                  {t.releasedHeading}
                </Typography.Heading>
                <Typography type="body-sm" color="muted">
                  {t.releasedLead}
                </Typography>
              </div>
            </Widget.Header>
            <div aria-hidden="true" className="rilis-watermark">
              <ArabicInline>{latest.title_ar}</ArabicInline>
            </div>
            <Widget.Content className="relative z-[1] p-6 sm:p-8">
              {/* Seluruh kartu bisa diklik lewat tautan judul (after:inset-0); sampul miring saat
                  kartu di-hover atau tautannya difokus keyboard (book-trigger). */}
              <article className="book-trigger relative flex flex-col items-center gap-6 rounded-2xl outline-offset-4 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-[var(--focus)] sm:flex-row sm:items-start">
                <div className="shrink-0">
                  <WorkCover textured width={{ xs: 140, sm: 150, md: 168 }} work={latest} />
                </div>
                <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                    <div className="flex min-w-0 flex-col items-start gap-2">
                      {latestEdition ? (
                        <Typography type="body-xs" color="muted">
                          {[
                            latestEdition.volumes ? t.volumes(latestEdition.volumes) : null,
                            CITE_PUBLISHER[`${latest.slug}/${latestEdition.slug}`] ?? null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Typography>
                      ) : null}
                      <Typography.Heading level={3} className="text-2xl">
                        {latestEdition ? (
                          <NextLink
                            className="outline-none after:absolute after:inset-0 after:rounded-[inherit]"
                            href={latestEdition.permalink}
                          >
                            {latestTitle}
                          </NextLink>
                        ) : (
                          latestTitle
                        )}
                      </Typography.Heading>
                      {latest.author ? (
                        <Typography type="body-sm" color="muted">
                          {latest.author.name_id ?? latest.author.name_ar}
                          {latest.author.death_hijri
                            ? ` (${t.deathHijri(latest.author.death_hijri)})`
                            : ""}
                        </Typography>
                      ) : null}
                    </div>
                    {latestEdition ? (
                      // Visual saja: tautan judul sudah menutup seluruh kartu.
                      <span
                        aria-hidden="true"
                        className={`${buttonVariants({ variant: "primary" })} shrink-0`}
                      >
                        <BookOpen01 className="size-4" />
                        {t.startReading}
                      </span>
                    ) : null}
                  </div>
                  {WORK_BLURB[latest.slug] ? (
                    <Typography className="max-w-2xl text-pretty">
                      {WORK_BLURB[latest.slug]}
                    </Typography>
                  ) : null}
                </div>
              </article>
            </Widget.Content>
          </Widget>
        </section>
      ) : null}
      {/* Kandidat kitab berikutnya (ADR-115): rencana, belum pasti; minat pembaca ikut menentukan. */}
      <section aria-labelledby="segera-hadir" className="flex flex-col gap-6 pt-4">
        <header className="flex max-w-2xl flex-col gap-2">
          <Typography.Heading id="segera-hadir" level={2} className="text-xl">
            {id.upcoming.heading}
          </Typography.Heading>
          <Typography color="muted">{id.upcoming.lead}</Typography>
        </header>
        <UpcomingKitabList items={UPCOMING_KITAB} />
      </section>
    </div>
  );
}

function ComingSoon() {
  return (
    <div className={`${PAGE_FRAME} flex flex-col items-start gap-4 pt-16 pb-16`}>
      <PageTitle>{t.soonHeading}</PageTitle>
      <Typography color="muted">{t.soonBody}</Typography>
      <NextLink className={buttonVariants({ variant: "primary" })} href="/tentang">
        {t.soonCta}
      </NextLink>
    </div>
  );
}
