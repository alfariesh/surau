import type { Metadata } from "next";

import { Card, ProgressBar, Typography } from "@heroui/react";

import { PageSection } from "../../../components/page-section";
import { PageLead, PageTitle } from "../../../components/page-title";
import { TextPage } from "../../../components/text-page";
import { SOURCE_URL } from "../../../i18n/id";
import { transparencyText as t } from "../../../i18n/transparency";
import { getEnv } from "../../../lib/cloudflare";
import { groupedCardClass } from "../../../lib/grouped-card";
import { transparencyMonths } from "../../../lib/transparency-data";

// /transparansi (S21): biaya AI per bulan dari ledger D1 (ADR-065) + biaya tetap + prinsip NC.
// Dinamis (angka bulan berjalan berubah); dua bolak-balik D1 per bulan yang ditampilkan.
export const metadata: Metadata = { title: t.pageTitle, description: t.lead };
export const dynamic = "force-dynamic";

const usd = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percent = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 0 });
const monthName = (period: string) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${period}-01T00:00:00Z`),
  );

export default async function TransparencyPage() {
  const env = await getEnv();
  const months = await transparencyMonths(env.APP_DB);
  const sections = [
    { id: "tetap", label: t.fixedHeading },
    { id: "prinsip", label: t.principlesHeading },
    { id: "dukung", label: t.supportHeading },
    { id: "ai", label: t.aiHeading },
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
      <PageSection heading={t.fixedHeading} id="tetap">
        <dl className="divide-separator flex flex-col divide-y">
          {t.fixed.map((f) => (
            <div
              key={f.item}
              className="grid gap-1 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:gap-4"
            >
              <dt>
                <Typography>{f.item}</Typography>
              </dt>
              <dd className="m-0">
                <Typography color="muted">{f.cost}</Typography>
              </dd>
            </div>
          ))}
        </dl>
      </PageSection>

      <PageSection heading={t.principlesHeading} id="prinsip">
        <ul className="flex list-disc flex-col gap-2 ps-5">
          {t.principles.map((p) => (
            <li key={p}>
              <Typography>{p}</Typography>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection heading={t.supportHeading} id="dukung">
        <Typography>
          {t.support}{" "}
          <a className="link" href={SOURCE_URL} rel="noopener noreferrer" target="_blank">
            {t.source}
          </a>
        </Typography>
      </PageSection>

      <PageSection heading={t.aiHeading} id="ai">
        <Typography>{t.aiLead}</Typography>
        <ul className="flex flex-col gap-2">
          {months.map((m, i) => (
            <li key={m.period}>
              <Card className={groupedCardClass(i, months.length)}>
                <Card.Header>
                  <Card.Title>{monthName(m.period)}</Card.Title>
                </Card.Header>
                <Card.Content className="gap-2">
                  <ProgressBar
                    className="gap-2"
                    aria-label={`${t.usageLabel} ${monthName(m.period)}`}
                    maxValue={m.cap_usd > 0 ? m.cap_usd : 1}
                    value={Math.min(m.cost_usd, m.cap_usd > 0 ? m.cap_usd : 1)}
                  >
                    <div className="flex items-baseline gap-2">
                      <Typography.Heading level={3} className="text-xl">
                        {percent.format(m.cap_usd > 0 ? Math.min(m.cost_usd / m.cap_usd, 1) : 0)}
                      </Typography.Heading>
                      <Typography type="body-sm" color="muted">
                        {t.usedSuffix}
                      </Typography>
                    </div>
                    <ProgressBar.Track className="h-6">
                      <ProgressBar.Fill />
                    </ProgressBar.Track>
                  </ProgressBar>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                    <div className="flex flex-col">
                      <dt>
                        <Typography type="body-xs" color="muted">
                          {t.cost}
                        </Typography>
                      </dt>
                      <dd className="m-0">
                        <Typography className="tabular-nums">{usd.format(m.cost_usd)}</Typography>
                        {m.estimated_usd > 0 ? (
                          <Typography type="body-xs" color="muted">
                            {t.estimatedNote(usd.format(m.estimated_usd))}
                          </Typography>
                        ) : null}
                      </dd>
                    </div>
                    <div className="flex flex-col">
                      <dt>
                        <Typography type="body-xs" color="muted">
                          {t.cap}
                        </Typography>
                      </dt>
                      <dd className="m-0">
                        <Typography className="tabular-nums">{usd.format(m.cap_usd)}</Typography>
                      </dd>
                    </div>
                    <div className="flex flex-col">
                      <dt>
                        <Typography type="body-xs" color="muted">
                          {t.questions}
                        </Typography>
                      </dt>
                      <dd className="m-0">
                        <Typography className="tabular-nums">{m.questions}</Typography>
                      </dd>
                    </div>
                  </dl>
                </Card.Content>
              </Card>
            </li>
          ))}
        </ul>
        <Typography type="body-sm" color="muted">
          {t.cachedNote} {t.updated}
        </Typography>
      </PageSection>
    </TextPage>
  );
}
