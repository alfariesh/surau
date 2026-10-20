import type { Metadata } from "next";

import NextLink from "next/link";

import { PageSection } from "../../../components/page-section";
import { TextPage } from "../../../components/text-page";
import { id, MCP_URL } from "../../../i18n/id";
import { Typography } from "@heroui/react";
import { PageLead, PageTitle } from "../../../components/page-title";

const t = id.mcp;

export const metadata: Metadata = {
  title: t.pageTitle,
  description: t.lead,
};

export default function McpPage() {
  const sections = [
    { id: "alamat", label: t.endpointHeading },
    { id: "hubungkan", label: t.connectHeading },
    { id: "contoh", label: t.examplesHeading },
    { id: "periksa", label: t.checkHeading },
    { id: "batasan", label: t.limitsHeading },
    { id: "bantuan", label: t.troubleHeading },
    { id: "lisensi", label: t.licenseHeading },
  ];

  return (
    <TextPage
      header={
        <header className="flex flex-col gap-3">
          <Typography type="body-sm" color="muted">
            {t.eyebrow}
          </Typography>
          <PageTitle>{t.heading}</PageTitle>
          <PageLead>{t.lead}</PageLead>
        </header>
      }
      sections={sections}
    >
      <PageSection heading={t.endpointHeading} id="alamat">
        <Typography>{t.endpointLead}</Typography>
        <code className="bg-default text-default-foreground block rounded-xl p-4 text-sm break-all select-all">
          {MCP_URL}
        </code>
        <Typography type="body-sm" color="muted">
          {t.cost}
        </Typography>
      </PageSection>

      <PageSection heading={t.connectHeading} id="hubungkan">
        <div className="flex flex-col gap-8">
          {t.clients.map((client) => (
            <section aria-labelledby={`judul-${client.id}`} id={client.id} key={client.id}>
              <Typography.Heading level={3} className="text-lg mb-3" id={`judul-${client.id}`}>
                {client.name}
              </Typography.Heading>
              <ol className="flex list-decimal flex-col gap-2 ps-5">
                {client.steps.map((step) => (
                  <li key={step}>
                    <Typography>{step}</Typography>
                  </li>
                ))}
              </ol>
              {"command" in client && (
                <pre className="bg-default text-default-foreground mt-3 rounded-xl p-4 text-sm whitespace-pre-wrap break-all select-all">
                  <code>{client.command}</code>
                </pre>
              )}
              <a className="link mt-3 inline-block underline" href={client.docs}>
                {t.officialGuide} {client.name}
              </a>
            </section>
          ))}
        </div>
      </PageSection>

      <PageSection heading={t.examplesHeading} id="contoh">
        <Typography>{t.examplesLead}</Typography>
        <ol className="flex list-decimal flex-col gap-3 ps-5">
          {t.examples.map((example) => (
            <li key={example}>
              <Typography className="select-all">{example}</Typography>
            </li>
          ))}
        </ol>
      </PageSection>

      <PageSection heading={t.checkHeading} id="periksa">
        <Typography>{t.checkLead}</Typography>
        <ol className="flex list-decimal flex-col gap-2 ps-5">
          {t.checks.map((check) => (
            <li key={check}>
              <Typography>{check}</Typography>
            </li>
          ))}
        </ol>
        <NextLink className="link underline" href="/kitab/ihya/1/48">
          {t.readerLink}
        </NextLink>
      </PageSection>

      <PageSection heading={t.limitsHeading} id="batasan">
        <ul className="flex list-disc flex-col gap-2 ps-5">
          {t.limits.map((limit) => (
            <li key={limit}>
              <Typography>{limit}</Typography>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection heading={t.troubleHeading} id="bantuan">
        <dl className="flex flex-col gap-4">
          {t.troubles.map((item) => (
            <div key={item.title}>
              <dt>
                <Typography weight="medium">{item.title}</Typography>
              </dt>
              <dd className="m-0 mt-1">
                <Typography color="muted">{item.body}</Typography>
              </dd>
            </div>
          ))}
        </dl>
      </PageSection>

      <PageSection heading={t.licenseHeading} id="lisensi">
        <Typography>{t.license}</Typography>
        <NextLink className="link underline" href="/lisensi">
          {t.licenseMore}
        </NextLink>
      </PageSection>
    </TextPage>
  );
}
