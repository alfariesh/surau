import type { Metadata } from "next";

import { Card } from "@heroui/react";
import NextLink from "next/link";

import { PageSection } from "../../../components/page-section";
import { TextPage } from "../../../components/text-page";
import { id, SOURCE_URL } from "../../../i18n/id";

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
          <h1 className="text-foreground text-[2rem] leading-[1.12] font-semibold tracking-tight sm:text-[2.75rem] lg:text-5xl">
            {t.heading}
          </h1>
          <p className="text-muted text-base sm:text-lg">{t.lead}</p>
        </header>
      }
      sections={sections}
    >
      <PageSection heading={t.visionHeading} id="visi">
        <p className="text-foreground text-base leading-relaxed">{t.vision}</p>
      </PageSection>

      <PageSection heading={t.audienceHeading} id="pengguna">
        <ul className="text-foreground flex list-disc flex-col gap-2 ps-5 text-base leading-relaxed">
          {t.audience.map((line) => (
            <li key={line}>{line}</li>
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
        <ol className="text-foreground flex list-decimal flex-col gap-2 ps-5 text-base leading-relaxed marker:text-muted">
          {t.principles.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </PageSection>

      <PageSection heading={t.openHeading} id="terbuka">
        <p className="text-foreground text-base leading-relaxed">{t.open}</p>
      </PageSection>

      <PageSection heading={t.licenseHeading} id="lisensi">
        <div className="text-foreground flex flex-col gap-2 text-base leading-relaxed">
          <p>{t.licenseCode}</p>
          <p>{t.licenseContent}</p>
          <p>
            <NextLink className="link underline" href="/lisensi">
              {t.licenseMore}
            </NextLink>
          </p>
          <p>
            <a
              className="link underline"
              href={SOURCE_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              {t.sourceLink}
              <span className="sr-only"> {id.common.newTab}</span>
            </a>
          </p>
        </div>
      </PageSection>
    </TextPage>
  );
}
