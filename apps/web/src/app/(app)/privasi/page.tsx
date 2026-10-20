import type { Metadata } from "next";

import { Typography } from "@heroui/react";

import { PageSection } from "../../../components/page-section";
import { PageLead, PageTitle } from "../../../components/page-title";
import { TextPage } from "../../../components/text-page";
import { ISSUES_URL } from "../../../i18n/id";
import { privacyText as t } from "../../../i18n/privacy";

// Kebijakan privasi publik (S20, docs/05 §8): statis, tanpa baca D1.
export const metadata: Metadata = { title: t.pageTitle, description: t.lead };

export default function PrivacyPage() {
  const sections = [
    { id: "ringkasan", label: t.summaryHeading },
    { id: "baca-cari", label: t.readHeading },
    { id: "tanya", label: t.askHeading },
    { id: "laporan", label: t.reportHeading },
    { id: "retensi", label: t.retentionHeading },
    { id: "pihak", label: t.partiesHeading },
    { id: "kontak", label: t.contactHeading },
  ];
  return (
    <TextPage
      header={
        <header className="flex flex-col gap-3">
          <PageTitle>{t.heading}</PageTitle>
          <PageLead>{t.lead}</PageLead>
          <Typography type="body-sm" color="muted">
            {t.updated}
          </Typography>
        </header>
      }
      sections={sections}
    >
      <PageSection heading={t.summaryHeading} id="ringkasan">
        <ul className="flex list-disc flex-col gap-2 ps-5">
          {t.summary.map((line) => (
            <li key={line}>
              <Typography>{line}</Typography>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection heading={t.readHeading} id="baca-cari">
        <Typography>{t.readText}</Typography>
      </PageSection>

      <PageSection heading={t.askHeading} id="tanya">
        <Typography color="muted">{t.askNotice}</Typography>
        <ul className="flex list-disc flex-col gap-2 ps-5">
          {t.ask.map((line) => (
            <li key={line}>
              <Typography>{line}</Typography>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection heading={t.reportHeading} id="laporan">
        <Typography>{t.reportText}</Typography>
      </PageSection>

      <PageSection heading={t.retentionHeading} id="retensi">
        <Typography>{t.retentionLead}</Typography>
        <dl className="divide-separator flex flex-col divide-y">
          {t.retention.map((row) => (
            <div key={row.data} className="grid gap-1 py-3 sm:grid-cols-[1fr_10rem_12rem] sm:gap-4">
              <dt>
                <Typography weight="semibold">{row.data}</Typography>
              </dt>
              <dd className="m-0">
                <Typography type="body-sm" color="muted">
                  <span className="sr-only">{t.whereLabel}: </span>
                  {row.where}
                </Typography>
              </dd>
              <dd className="m-0">
                <Typography type="body-sm">
                  <span className="sr-only">{t.howLabel}: </span>
                  {row.how}
                </Typography>
              </dd>
            </div>
          ))}
        </dl>
      </PageSection>

      <PageSection heading={t.partiesHeading} id="pihak">
        <Typography>{t.parties}</Typography>
      </PageSection>

      <PageSection heading={t.contactHeading} id="kontak">
        <Typography>
          {t.contactText}{" "}
          <a className="link" href={ISSUES_URL} rel="noopener noreferrer" target="_blank">
            {t.issues}
          </a>
        </Typography>
      </PageSection>
    </TextPage>
  );
}
