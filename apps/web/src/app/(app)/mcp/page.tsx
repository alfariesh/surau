import type { Metadata } from "next";

import NextLink from "next/link";

import { PageSection } from "../../../components/page-section";
import { TextPage } from "../../../components/text-page";
import { id, MCP_URL } from "../../../i18n/id";

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
          <p className="text-muted text-sm">{t.eyebrow}</p>
          <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.heading}
          </h1>
          <p className="text-muted text-base leading-relaxed sm:text-lg">{t.lead}</p>
        </header>
      }
      sections={sections}
    >
      <PageSection heading={t.endpointHeading} id="alamat">
        <p className="text-foreground leading-relaxed">{t.endpointLead}</p>
        <code className="bg-default text-default-foreground block rounded-xl p-4 text-sm break-all select-all">
          {MCP_URL}
        </code>
        <p className="text-muted text-sm leading-relaxed">{t.cost}</p>
      </PageSection>

      <PageSection heading={t.connectHeading} id="hubungkan">
        <div className="flex flex-col gap-8">
          {t.clients.map((client) => (
            <section aria-labelledby={`judul-${client.id}`} id={client.id} key={client.id}>
              <h3 className="text-foreground mb-3 text-lg font-semibold" id={`judul-${client.id}`}>
                {client.name}
              </h3>
              <ol className="text-foreground flex list-decimal flex-col gap-2 ps-5 leading-relaxed">
                {client.steps.map((step) => (
                  <li key={step}>{step}</li>
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
        <p className="text-foreground leading-relaxed">{t.examplesLead}</p>
        <ol className="flex list-decimal flex-col gap-3 ps-5">
          {t.examples.map((example) => (
            <li className="text-foreground leading-relaxed" key={example}>
              <p className="select-all">{example}</p>
            </li>
          ))}
        </ol>
      </PageSection>

      <PageSection heading={t.checkHeading} id="periksa">
        <p className="text-foreground leading-relaxed">{t.checkLead}</p>
        <ol className="text-foreground flex list-decimal flex-col gap-2 ps-5 leading-relaxed">
          {t.checks.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ol>
        <NextLink className="link underline" href="/kitab/ihya/1/48">
          {t.readerLink}
        </NextLink>
      </PageSection>

      <PageSection heading={t.limitsHeading} id="batasan">
        <ul className="text-foreground flex list-disc flex-col gap-2 ps-5 leading-relaxed">
          {t.limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </PageSection>

      <PageSection heading={t.troubleHeading} id="bantuan">
        <dl className="flex flex-col gap-4">
          {t.troubles.map((item) => (
            <div key={item.title}>
              <dt className="text-foreground font-medium">{item.title}</dt>
              <dd className="text-muted mt-1 leading-relaxed">{item.body}</dd>
            </div>
          ))}
        </dl>
      </PageSection>

      <PageSection heading={t.licenseHeading} id="lisensi">
        <p className="text-foreground leading-relaxed">{t.license}</p>
        <NextLink className="link underline" href="/lisensi">
          {t.licenseMore}
        </NextLink>
      </PageSection>
    </TextPage>
  );
}
