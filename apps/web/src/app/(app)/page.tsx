import type { Metadata } from "next";

import { Card, Chip } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";

import { listWorks } from "@surau/core";

import { ArabicText } from "../../components/arabic";
import { WorkShelf } from "../../components/book/work-shelf";
import { BASMALAH } from "../../content/basmalah";
import { id, SOURCE_URL } from "../../i18n/id";
import { getEnv, readerEnabled } from "../../lib/cloudflare";

export const metadata: Metadata = {
  title: { absolute: id.meta.title },
};

const t = id.home;

// Dirender per request (seperti /kitab): rak kitab membaca daftar karya dari D1 (satu query kecil),
// dan CI tidak punya D1 saat build. Bila pembaca tertutup atau D1 gagal, rak tidak ditampilkan.
export const dynamic = "force-dynamic";

async function shelfWorks() {
  try {
    const env = await getEnv();
    if (!readerEnabled(env)) return [];
    const { works } = await listWorks(env.CORPUS_DB);
    return works.flatMap((work) => {
      const edition = work.editions.find((e) => e.is_default) ?? work.editions[0];
      return edition ? [{ ...work, href: edition.permalink }] : [];
    });
  } catch (error) {
    console.error("rak kitab beranda gagal dimuat", error);
    return [];
  }
}

export default async function HomePage() {
  const works = await shelfWorks();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <section aria-labelledby="judul-beranda" className="flex flex-col items-start gap-5">
        <Chip color="accent" size="sm" variant="soft">
          {t.eyebrow}
        </Chip>
        <h1
          className="text-foreground text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          id="judul-beranda"
        >
          {t.heading}
        </h1>
        <p className="text-muted text-base text-pretty sm:text-lg">{t.lead}</p>
        <p className="text-foreground text-sm">{t.firstBook}</p>
        <div className="flex flex-wrap gap-3">
          <NextLink className={buttonVariants({ variant: "primary" })} href="/tentang">
            {t.ctaAbout}
          </NextLink>
          <a
            className={buttonVariants({ variant: "tertiary" })}
            href={SOURCE_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t.ctaSource}
            <span className="sr-only"> {id.common.newTab}</span>
          </a>
        </div>
      </section>

      {works.length > 0 ? (
        <section aria-labelledby="judul-rak" className="flex flex-col gap-2">
          <h2 className="text-foreground text-xl font-semibold" id="judul-rak">
            {t.shelfHeading}
          </h2>
          <WorkShelf label={t.shelfLabel} works={works} />
        </section>
      ) : null}

      <Card className="py-8">
        <figure className="m-0 flex flex-col items-center gap-3">
          <ArabicText className="text-foreground text-3xl sm:text-4xl">{BASMALAH.text}</ArabicText>
          <figcaption className="text-muted px-4 text-center text-xs">
            {t.demoCaption} {BASMALAH.ref} · {t.demoSource}{" "}
            <a
              className="link text-xs underline"
              href={BASMALAH.sourceUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {BASMALAH.source}
              <span className="sr-only"> {id.common.newTab}</span>
            </a>
          </figcaption>
        </figure>
      </Card>

      <section aria-labelledby="judul-prinsip" className="flex flex-col gap-4">
        <h2 className="text-foreground text-xl font-semibold" id="judul-prinsip">
          {t.principlesHeading}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {t.principles.map((p) => (
            <li key={p.title} className="flex">
              <Card className="w-full">
                <Card.Header>
                  <Card.Title>{p.title}</Card.Title>
                  <Card.Description>{p.body}</Card.Description>
                </Card.Header>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="judul-peta" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-foreground text-xl font-semibold" id="judul-peta">
            {t.roadmapHeading}
          </h2>
          <p className="text-muted text-sm">{t.roadmapLead}</p>
        </div>
        <ol className="flex flex-col gap-1">
          {t.roadmap.map((step) => {
            const isNow = "current" in step && step.current;

            return (
              <li key={step.phase} className="flex items-start gap-4 rounded-2xl px-1 py-3">
                <span
                  aria-hidden="true"
                  className={
                    isNow
                      ? "bg-accent text-accent-foreground flex h-8 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                      : "bg-default text-default-foreground flex h-8 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                  }
                >
                  {step.phase}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-foreground flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span className="sr-only">
                      {t.roadmapPhase} {step.phase}:{" "}
                    </span>
                    {step.title}
                    {isNow ? (
                      <Chip color="accent" size="sm" variant="soft">
                        {t.roadmapNow}
                      </Chip>
                    ) : null}
                  </p>
                  <p className="text-muted text-sm">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
