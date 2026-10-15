import type { Metadata } from "next";

import { Card, Chip } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";

import { ArabicText } from "../../components/arabic";
import { BASMALAH } from "../../content/basmalah";
import { id, SOURCE_URL } from "../../i18n/id";

export const metadata: Metadata = {
  title: { absolute: id.meta.title },
};

const t = id.home;

export default function HomePage() {
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
          </a>
        </div>
      </section>

      <figure aria-label={t.demoLabel} className="m-0">
        <Card className="items-center gap-3 py-8">
          <ArabicText className="text-foreground text-3xl sm:text-4xl">{BASMALAH.text}</ArabicText>
          <figcaption className="text-muted px-4 text-center text-xs">
            {t.demoCaption} {BASMALAH.ref} · {BASMALAH.source}
          </figcaption>
        </Card>
      </figure>

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
          {t.roadmap.map((step, index) => {
            const isNow = index === 0;

            return (
              <li key={step.phase} className="flex items-start gap-4 rounded-2xl px-1 py-3">
                <span
                  aria-hidden="true"
                  className={
                    isNow
                      ? "bg-accent text-accent-foreground flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums"
                      : "bg-default text-default-foreground flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums"
                  }
                >
                  {step.phase}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-foreground flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span className="sr-only">Fase {step.phase}: </span>
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
