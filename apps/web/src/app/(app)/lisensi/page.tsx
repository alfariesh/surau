import type { Metadata } from "next";

import { Card, Typography } from "@heroui/react";
import NextLink from "next/link";

import { groupedCardClass } from "../../../lib/grouped-card";
import { PageSection } from "../../../components/page-section";
import { TextPage } from "../../../components/text-page";
import { EDITION_CREDITS, LICENSE_URL, QURAN_CREDITS } from "../../../content/works";
import { id, ISSUES_URL, SOURCE_URL } from "../../../i18n/id";
import { PageLead, PageTitle } from "../../../components/page-title";

const t = id.license;

// Lisensi dan atribusi (S10, ADR-018, ADR-021): statis, tanpa baca D1. Atribusi per edisi dari
// `EDITION_CREDITS` (sama dengan data/ATTRIBUTION.md, dites). Tetap terbuka saat pembaca ditutup.
export const metadata: Metadata = {
  title: t.pageTitle,
  description: t.lead,
};

const CONTENT_LICENSE = "CC BY-NC-SA 4.0";

export default function LicensePage() {
  const sections = [
    { id: "ringkasan", label: t.summaryHeading },
    { id: "pakai-ulang", label: t.reuseHeading },
    { id: "sumber", label: t.sourcesHeading },
    { id: "quran", label: t.quranHeading },
    { id: "font", label: t.fontHeading },
    { id: "koreksi", label: t.correctionHeading },
    { id: "ilustrasi", label: t.artHeading },
    { id: "privasi", label: t.privacyHeading },
  ];

  return (
    <TextPage
      header={
        <header className="flex flex-col gap-3">
          <PageTitle>{t.heading}</PageTitle>
          <PageLead>{t.lead}</PageLead>
        </header>
      }
      sections={sections}
    >
      <PageSection heading={t.summaryHeading} id="ringkasan">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr]">
          <dt>
            <Typography weight="semibold">{t.codeLabel}</Typography>
          </dt>
          <dd className="m-0">
            <Typography>
              {t.codeLicense} (
              <ExternalLink href={`${SOURCE_URL}/blob/main/LICENSE`}>{t.licenseFile}</ExternalLink>)
            </Typography>
          </dd>
          <dt>
            <Typography weight="semibold">{t.contentLabel}</Typography>
          </dt>
          <dd className="m-0">
            <Typography>
              {t.contentLicense} (
              <ExternalLink href={LICENSE_URL[CONTENT_LICENSE] ?? ""} rel="license">
                {t.licenseFile}
              </ExternalLink>
              ): {t.contentScope}.
            </Typography>
          </dd>
        </dl>
        <Typography>{t.noncommercial}</Typography>
      </PageSection>

      <PageSection heading={t.reuseHeading} id="pakai-ulang">
        <Typography>{t.reuseLead}</Typography>
        <ul className="flex flex-col gap-2">
          {t.reuseRules.map((rule, i) => (
            <li key={rule.title}>
              <Card className={groupedCardClass(i, t.reuseRules.length)}>
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
            className="flex flex-col gap-4"
            key={credit.key}
          >
            <Typography.Heading level={3} id={`kitab-${credit.workSlug}`} className="text-lg">
              {credit.title} · <span className="font-normal">{credit.author}</span>
            </Typography.Heading>
            <div className="flex flex-col gap-1">
              <Typography type="body-sm" color="muted">
                {t.attributionLabel}
              </Typography>
              <blockquote className="border-separator border-s-4 ps-4">
                <Typography>{credit.attribution}</Typography>
              </blockquote>
            </div>
            <div className="flex flex-col gap-1">
              <Typography type="body-sm" color="muted">
                {t.partiesLabel}
              </Typography>
              <ul className="flex list-disc flex-col gap-2 ps-5">
                {credit.parties.map((party) => (
                  <li key={party.name}>
                    <Typography>
                      <span className="font-semibold">{party.name}</span>: {party.role}
                      {party.link ? (
                        <>
                          {" "}
                          <ExternalLink href={party.link.url}>{party.link.label}</ExternalLink>
                        </>
                      ) : null}
                    </Typography>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-1">
              <Typography type="body-sm" color="muted">
                {t.changesLabel}
              </Typography>
              <ul className="flex list-disc flex-col gap-2 ps-5">
                {credit.changes.map((change) => (
                  <li key={change}>
                    <Typography>{change}</Typography>
                  </li>
                ))}
              </ul>
            </div>
            <Typography className="flex flex-wrap gap-x-4 gap-y-1">
              <NextLink className="link underline" href={`/kitab/${credit.workSlug}`}>
                {t.readLink}
              </NextLink>
              <ExternalLink href={`${SOURCE_URL}/blob/main/data/ATTRIBUTION.md`}>
                {t.detailsLink}
              </ExternalLink>
            </Typography>
          </section>
        ))}
      </PageSection>

      <PageSection heading={t.quranHeading} id="quran">
        <div className="flex flex-col gap-3">
          <Typography>{t.quranLead}</Typography>
          <ul className="flex list-disc flex-col gap-2 ps-5">
            {QURAN_CREDITS.map((credit) => (
              <li key={credit.name}>
                <Typography>
                  <span className="font-semibold">{credit.name}</span>: {credit.role}{" "}
                  {credit.links.map((link, i) => (
                    <span key={link.url}>
                      {i > 0 ? " · " : ""}
                      <ExternalLink href={link.url}>{link.label}</ExternalLink>
                    </span>
                  ))}
                </Typography>
              </li>
            ))}
          </ul>
        </div>
      </PageSection>

      <PageSection heading={t.fontHeading} id="font">
        <div className="flex flex-col gap-3">
          <Typography>{t.fontText}</Typography>
          <Typography>
            <ExternalLink
              href={`${SOURCE_URL}/blob/main/apps/web/src/fonts/harmonyos-sans/LICENSE.txt`}
            >
              {t.fontLicenseLink}
            </ExternalLink>
          </Typography>
        </div>
      </PageSection>

      <PageSection heading={t.correctionHeading} id="koreksi">
        <div className="flex flex-col gap-3">
          <Typography>{t.correctionText}</Typography>
          <Typography>{t.takedownText}</Typography>
          <Typography>
            <ExternalLink href={ISSUES_URL}>{t.issueLink}</ExternalLink>
          </Typography>
        </div>
      </PageSection>

      <PageSection heading={t.artHeading} id="ilustrasi">
        <div className="flex flex-col gap-3">
          <Typography>{t.artLead}</Typography>
          <ul className="flex list-disc flex-col gap-2 ps-5">
            {t.artCredits.map((credit) => (
              <li key={credit.name}>
                <Typography>
                  <ExternalLink href={credit.url}>{credit.name}</ExternalLink> · {credit.by} ·{" "}
                  {credit.license}
                </Typography>
              </li>
            ))}
          </ul>
        </div>
      </PageSection>

      <PageSection heading={t.privacyHeading} id="privasi">
        <Typography>{t.privacyText}</Typography>
        <NextLink className="link self-start" href="/privasi">
          {t.privacyMore}
        </NextLink>
      </PageSection>
    </TextPage>
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
