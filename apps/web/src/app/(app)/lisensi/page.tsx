import type { Metadata } from "next";

import { Card } from "@heroui/react";
import NextLink from "next/link";

import { PageSection } from "../../../components/page-section";
import { EDITION_CREDITS, LICENSE_URL, QURAN_CREDITS } from "../../../content/works";
import { id, ISSUES_URL, SOURCE_URL } from "../../../i18n/id";

const t = id.license;

// Lisensi dan atribusi (S10, ADR-018, ADR-021): statis, tanpa baca D1. Atribusi per edisi dari
// `EDITION_CREDITS` (sama dengan data/ATTRIBUTION.md, dites). Tetap terbuka saat pembaca ditutup.
export const metadata: Metadata = {
  title: t.pageTitle,
  description: t.lead,
};

const CONTENT_LICENSE = "CC BY-NC-SA 4.0";

export default function LicensePage() {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-foreground text-[2rem] leading-[1.12] font-semibold tracking-tight sm:text-[2.75rem] lg:text-5xl">
          {t.heading}
        </h1>
        <p className="text-muted text-base sm:text-lg">{t.lead}</p>
      </header>

      <PageSection heading={t.summaryHeading} id="ringkasan">
        <dl className="text-foreground grid gap-x-6 gap-y-3 text-base leading-relaxed sm:grid-cols-[max-content_1fr]">
          <dt className="font-semibold">{t.codeLabel}</dt>
          <dd>
            {t.codeLicense} (
            <ExternalLink href={`${SOURCE_URL}/blob/main/LICENSE`}>{t.licenseFile}</ExternalLink>)
          </dd>
          <dt className="font-semibold">{t.contentLabel}</dt>
          <dd>
            {t.contentLicense} (
            <ExternalLink href={LICENSE_URL[CONTENT_LICENSE] ?? ""} rel="license">
              {t.licenseFile}
            </ExternalLink>
            ): {t.contentScope}.
          </dd>
        </dl>
        <p className="text-foreground text-base leading-relaxed">{t.noncommercial}</p>
      </PageSection>

      <PageSection heading={t.reuseHeading} id="pakai-ulang">
        <p className="text-foreground text-base leading-relaxed">{t.reuseLead}</p>
        <ul className="flex flex-col gap-3">
          {t.reuseRules.map((rule) => (
            <li key={rule.title}>
              <Card>
                <Card.Header>
                  <Card.Title>{rule.title}</Card.Title>
                  <Card.Description>{rule.body}</Card.Description>
                </Card.Header>
              </Card>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection heading={t.sourcesHeading} id="sumber">
        {EDITION_CREDITS.map((credit) => (
          <section
            aria-labelledby={`kitab-${credit.workSlug}`}
            className="text-foreground flex flex-col gap-4 text-base leading-relaxed"
            key={credit.key}
          >
            <h3 className="text-lg font-semibold" id={`kitab-${credit.workSlug}`}>
              {credit.title} · <span className="font-normal">{credit.author}</span>
            </h3>
            <div className="flex flex-col gap-1">
              <p className="text-muted text-sm">{t.attributionLabel}</p>
              <blockquote className="border-separator border-s-4 ps-4">
                {credit.attribution}
              </blockquote>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-muted text-sm">{t.partiesLabel}</p>
              <ul className="flex list-disc flex-col gap-2 ps-5">
                {credit.parties.map((party) => (
                  <li key={party.name}>
                    <span className="font-semibold">{party.name}</span>: {party.role}
                    {party.link ? (
                      <>
                        {" "}
                        <ExternalLink href={party.link.url}>{party.link.label}</ExternalLink>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-muted text-sm">{t.changesLabel}</p>
              <ul className="flex list-disc flex-col gap-2 ps-5">
                {credit.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <NextLink className="link underline" href={`/kitab/${credit.workSlug}`}>
                {t.readLink}
              </NextLink>
              <ExternalLink href={`${SOURCE_URL}/blob/main/data/ATTRIBUTION.md`}>
                {t.detailsLink}
              </ExternalLink>
            </p>
          </section>
        ))}
      </PageSection>

      <PageSection heading={t.quranHeading} id="quran">
        <div className="text-foreground flex flex-col gap-3 text-base leading-relaxed">
          <p>{t.quranLead}</p>
          <ul className="flex list-disc flex-col gap-2 ps-5">
            {QURAN_CREDITS.map((credit) => (
              <li key={credit.name}>
                <span className="font-semibold">{credit.name}</span>: {credit.role}{" "}
                {credit.links.map((link, i) => (
                  <span key={link.url}>
                    {i > 0 ? " · " : ""}
                    <ExternalLink href={link.url}>{link.label}</ExternalLink>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      </PageSection>

      <PageSection heading={t.correctionHeading} id="koreksi">
        <div className="text-foreground flex flex-col gap-3 text-base leading-relaxed">
          <p>{t.correctionText}</p>
          <p>{t.takedownText}</p>
          <p>
            <ExternalLink href={ISSUES_URL}>{t.issueLink}</ExternalLink>
          </p>
        </div>
      </PageSection>

      <PageSection heading={t.privacyHeading} id="privasi">
        <p className="text-foreground text-base leading-relaxed">{t.privacyText}</p>
      </PageSection>
    </article>
  );
}

function ExternalLink({
  children,
  href,
  rel,
}: {
  children: React.ReactNode;
  href: string;
  rel?: string;
}) {
  return (
    <a
      className="link underline"
      href={href}
      rel={`${rel ? `${rel} ` : ""}noopener noreferrer`}
      target="_blank"
    >
      {children}
      <span className="sr-only"> {id.common.newTab}</span>
    </a>
  );
}
