import type { Metadata } from "next";

import { Card } from "@heroui/react";

import { id, SOURCE_URL } from "../../../i18n/id";

const t = id.about;

export const metadata: Metadata = {
  title: t.pageTitle,
  description: t.lead,
};

export default function AboutPage() {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.heading}
        </h1>
        <p className="text-muted text-base sm:text-lg">{t.lead}</p>
      </header>

      <Section heading={t.visionHeading} id="visi">
        <p className="text-foreground text-base leading-relaxed">{t.vision}</p>
      </Section>

      <Section heading={t.audienceHeading} id="pengguna">
        <ul className="text-foreground flex list-disc flex-col gap-2 ps-5 text-base leading-relaxed">
          {t.audience.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Section>

      <Section heading={t.notHeading} id="bukan">
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
      </Section>

      <Section heading={t.principlesHeading} id="prinsip">
        <ol className="text-foreground flex list-decimal flex-col gap-2 ps-5 text-base leading-relaxed marker:text-muted">
          {t.principles.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </Section>

      <Section heading={t.openHeading} id="terbuka">
        <p className="text-foreground text-base leading-relaxed">{t.open}</p>
      </Section>

      <Section heading={t.licenseHeading} id="lisensi">
        <div className="text-foreground flex flex-col gap-2 text-base leading-relaxed">
          <p>{t.licenseCode}</p>
          <p>{t.licenseContent}</p>
          <p>
            <a
              className="link underline"
              href={SOURCE_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              {t.sourceLink}
            </a>
          </p>
        </div>
      </Section>
    </article>
  );
}

function Section({
  children,
  heading,
  id: sectionId,
}: {
  children: React.ReactNode;
  heading: string;
  id: string;
}) {
  return (
    <section aria-labelledby={`judul-${sectionId}`} className="flex flex-col gap-3">
      <h2 className="text-foreground text-xl font-semibold" id={`judul-${sectionId}`}>
        {heading}
      </h2>
      {children}
    </section>
  );
}
