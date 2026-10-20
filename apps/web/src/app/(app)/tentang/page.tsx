import type { Metadata } from "next";

import { Card, Typography } from "@heroui/react";
import NextLink from "next/link";

import { PageSection } from "../../../components/page-section";
import { TextPage } from "../../../components/text-page";
import { id, SOURCE_URL } from "../../../i18n/id";
import { PageLead, PageTitle } from "../../../components/page-title";

const t = id.about;

export const metadata: Metadata = {
  title: t.pageTitle,
  description: t.lead,
};

export default function AboutPage() {
  const sections = [
    { id: "visi", label: t.visionHeading },
    { id: "pengguna", label: t.audienceHeading },
    { id: "bukan", label: t.notHeading },
    { id: "prinsip", label: t.principlesHeading },
    { id: "terbuka", label: t.openHeading },
    { id: "lisensi", label: t.licenseHeading },
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
      <PageSection heading={t.visionHeading} id="visi">
        <Typography>{t.vision}</Typography>
      </PageSection>

      <PageSection heading={t.audienceHeading} id="pengguna">
        <ul className="flex list-disc flex-col gap-2 ps-5">
          {t.audience.map((line) => (
            <li key={line}>
              <Typography>{line}</Typography>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection heading={t.notHeading} id="bukan">
        <ul className="flex flex-col gap-3">
          {t.not.map((item) => (
            <li key={item.title}>
              <Card>
                <Card.Header>
                  <Card.Title>{item.title}</Card.Title>
                  <Card.Description>{item.body}</Card.Description>
                </Card.Header>
              </Card>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection heading={t.principlesHeading} id="prinsip">
        <ol className="flex list-decimal flex-col gap-2 ps-5 marker:text-muted">
          {t.principles.map((line) => (
            <li key={line}>
              <Typography>{line}</Typography>
            </li>
          ))}
        </ol>
      </PageSection>

      <PageSection heading={t.openHeading} id="terbuka">
        <Typography>{t.open}</Typography>
      </PageSection>

      <PageSection heading={t.licenseHeading} id="lisensi">
        <div className="flex flex-col gap-2">
          <Typography>{t.licenseCode}</Typography>
          <Typography>{t.licenseContent}</Typography>
          <Typography>
            <NextLink className="link underline" href="/lisensi">
              {t.licenseMore}
            </NextLink>
          </Typography>
          <Typography>
            <a
              className="link underline"
              href={SOURCE_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              {t.sourceLink}
              <span className="sr-only"> {id.common.newTab}</span>
            </a>
          </Typography>
        </div>
      </PageSection>
    </TextPage>
  );
}
