import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Accordion, Card, Chip, ProgressBar, Typography } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";

import { ArabicInline, ArabicText } from "../../components/arabic";
import { ArtEmbed } from "../../components/art/art-embed";
import { PageLead, PageTitle } from "../../components/page-title";
import { PrinciplesGrid } from "../../components/principles-grid";
import { ArrowDown01, ArrowRight01, Github, QuoteDown, Tick02 } from "../../icons";
import { MCP_URL, SOURCE_URL, id } from "../../i18n/id";
import { landing as t, landingNav } from "../../i18n/id/landing";
import { PAGE_FRAME } from "../../lib/layout";
import { loadLandingData, type HeroQuote, type LandingToc } from "../../lib/landing-data";
import type { TransparencyMonth } from "../../lib/transparency-data";

export const metadata: Metadata = {
  title: { absolute: id.meta.title },
  alternates: { canonical: "/" },
};

// Dirender per request seperti Beranda: kutipan, daftar isi, dan biaya dibaca dari D1 (CI tidak punya
// D1 saat build). Setiap bagian data yang gagal dimuat disembunyikan; halaman tetap tampil.
export const dynamic = "force-dynamic";

// Landing page publik (ADR-096), susunan mengikuti template buku: hero (ilustrasi + kutipan asli),
// apa yang bisa dilakukan, isi kitab, cara kerja, prinsip (pengganti testimoni), integrasi AI,
// ajakan membaca, gratis + biaya, tanya jawab.
export default async function LandingPage() {
  const data = await loadLandingData();
  return (
    <>
      <Hero ask={data.ask} quote={data.quote} />
      <Intro ask={data.ask} />
      {data.toc ? <Contents toc={data.toc} /> : <ContentsUnavailable />}
      <HowItWorks />
      <Principles />
      <Integration />
      <ReadNow firstPage={data.toc?.firstPage ?? null} />
      <Free ask={data.ask} cost={data.cost} />
      <Faq />
    </>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  center,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  center?: boolean;
}) {
  return (
    <div
      className={`flex max-w-2xl flex-col gap-3 ${center ? "mx-auto items-center text-center" : ""}`}
    >
      {eyebrow ? (
        <Typography className="text-accent font-semibold" type="body-sm">
          {eyebrow}
        </Typography>
      ) : null}
      <Typography.Heading
        className="text-3xl text-balance sm:text-4xl"
        id={`judul-${id}`}
        level={2}
      >
        {title}
      </Typography.Heading>
      {lead ? <PageLead className={center ? "text-center" : undefined}>{lead}</PageLead> : null}
    </div>
  );
}

function Section({ id, children, tinted }: { id: string; children: ReactNode; tinted?: boolean }) {
  return (
    <section
      aria-labelledby={`judul-${id}`}
      className={`scroll-mt-20 py-16 sm:py-24 ${tinted ? "bg-surface-secondary" : ""}`}
      id={id}
    >
      <div className={`${PAGE_FRAME} flex flex-col gap-10 sm:gap-12`}>{children}</div>
    </section>
  );
}

// Ajakan Maknaz hanya bila rute Jawab menyala (`ask`), sama dengan segmen Maknaz di Beranda.
function Hero({ ask, quote }: { ask: boolean; quote: HeroQuote | null }) {
  return (
    <header className="overflow-hidden">
      <div
        className={`${PAGE_FRAME} grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:gap-12 lg:py-24`}
      >
        <div className="flex flex-col items-start gap-6 lg:col-span-6">
          <Chip color="accent" size="sm" variant="soft">
            {t.eyebrow}
          </Chip>
          <PageTitle className="text-balance" compactTitle={false}>
            {t.heading}
          </PageTitle>
          <PageLead className="max-w-xl">{t.lead}</PageLead>
          <div className="flex flex-wrap gap-3">
            <NextLink className={buttonVariants({ size: "lg" })} href="/home">
              {t.start}
              <ArrowRight01 className="size-4" />
            </NextLink>
            {ask ? (
              <NextLink
                className={buttonVariants({ size: "lg", variant: "secondary" })}
                href="/tanya"
              >
                {t.ask}
              </NextLink>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-6" data-art-card>
          {/* Panel aksen di belakang ilustrasi (pola template buku: sampul di atas bidang warna). */}
          <div className="bg-accent-soft rounded-3xl p-2 sm:p-4">
            <ArtEmbed name="landing-surau" title={t.heroArtTitle} />
          </div>
          {quote ? <QuoteCard quote={quote} /> : null}
        </div>
      </div>
    </header>
  );
}

// Kutipan asli sebagai "bukti" di hero: Arab dari DB (HERO_QUOTE), terjemahan AI berlabel, alamat cetak.
function QuoteCard({ quote }: { quote: HeroQuote }) {
  return (
    <Card className="-mt-12 mx-3 gap-3 shadow-md sm:mx-8">
      <Card.Header className="flex-row items-center gap-2">
        <QuoteDown className="text-accent size-5" />
        <Typography color="muted" type="body-xs">
          {t.quoteLabel}
        </Typography>
      </Card.Header>
      <Card.Content className="gap-2">
        <ArabicText as="blockquote" size="lg">
          {quote.text}
        </ArabicText>
        {quote.translation ? (
          <Typography lang={quote.translation.lang}>
            {quote.translation.text}{" "}
            <span className="text-muted text-xs whitespace-nowrap">
              ({quote.translation.badge})
            </span>
          </Typography>
        ) : null}
      </Card.Content>
      <Card.Footer className="flex-wrap justify-between gap-2">
        <Typography color="muted" type="body-sm">
          {quote.author ? t.quoteBy(quote.author, quote.label) : quote.label}
        </Typography>
        <NextLink className="link text-sm" href={quote.permalink}>
          {t.quoteOpen}
        </NextLink>
      </Card.Footer>
    </Card>
  );
}

function Intro({ ask }: { ask: boolean }) {
  const features = ask ? [...t.features, t.featureAsk] : t.features;
  return (
    <Section id="mulai">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading id="mulai" lead={t.introLead} title={t.introHeading} />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-7">
          <ul className="grid gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex gap-3">
                <span className="bg-accent-soft text-accent mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
                  <Tick02 className="size-4" />
                </span>
                <Typography className="text-pretty">{f}</Typography>
              </li>
            ))}
          </ul>
          <NextLink
            className={`${buttonVariants({ variant: "secondary" })} self-start`}
            href="/cari"
          >
            {t.introCta}
            <ArrowRight01 className="size-4" />
          </NextLink>
        </div>
      </div>
    </Section>
  );
}

function Contents({ toc }: { toc: LandingToc }) {
  const books = toc.quarters.reduce((n, q) => n + q.children.length, 0);
  const stats = [
    toc.volumes ? { value: toc.volumes, label: t.stats.volumes } : null,
    { value: toc.quarters.length, label: t.stats.quarters },
    { value: books, label: t.stats.books },
    { value: toc.sections, label: t.stats.sections },
  ].filter((s) => s !== null);
  const number = new Intl.NumberFormat("id-ID");
  return (
    <Section tinted id="isi">
      <SectionHeading
        eyebrow={toc.title ?? undefined}
        id="isi"
        lead={t.tocLead}
        title={t.tocHeading}
      />
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface flex flex-col-reverse gap-1 rounded-2xl p-5">
            <dt>
              <Typography color="muted" type="body-sm">
                {s.label}
              </Typography>
            </dt>
            <dd className="m-0">
              <Typography className="text-3xl font-semibold tabular-nums">
                {number.format(s.value)}
              </Typography>
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-3">
        <Typography color="muted" type="body-xs">
          {t.tocNote}
        </Typography>
        <Accordion
          allowsMultipleExpanded
          defaultExpandedKeys={[String(toc.quarters[0]?.id)]}
          variant="surface"
        >
          {toc.quarters.map((q, i) => (
            <Accordion.Item key={q.id} id={String(q.id)}>
              <Accordion.Heading>
                <Accordion.Trigger className="gap-3">
                  <span aria-hidden="true" className="text-muted w-6 shrink-0 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-start">
                    <span className="font-medium">
                      {q.titleId ?? <ArabicInline>{q.title}</ArabicInline>}
                    </span>
                    {q.titleId ? (
                      <ArabicInline className="text-muted">{q.title}</ArabicInline>
                    ) : null}
                  </span>
                  <span className="text-muted hidden text-sm sm:inline">
                    {t.tocCount(q.children.length)}
                  </span>
                  <Accordion.Indicator>
                    <ArrowDown01 />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>
                  <ol className="grid gap-x-8 sm:grid-cols-2">
                    {q.children.map((k) => (
                      <li
                        key={k.id}
                        className="border-separator border-b last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
                      >
                        <NextLink
                          className="hover:bg-default focus-visible:ring-focus -mx-2 flex items-baseline justify-between gap-4 rounded-lg px-2 py-3 outline-none focus-visible:ring-2"
                          href={k.href}
                        >
                          <span className="flex min-w-0 flex-col items-start gap-0.5">
                            <span className="text-foreground">
                              {k.titleId ?? <ArabicInline>{k.title}</ArabicInline>}
                            </span>
                            {k.titleId ? (
                              <ArabicInline className="text-muted">{k.title}</ArabicInline>
                            ) : null}
                          </span>
                          <span className="text-muted shrink-0 text-xs tabular-nums">
                            {t.tocPage(k.juz, k.page)}
                          </span>
                        </NextLink>
                      </li>
                    ))}
                  </ol>
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
        <NextLink className="link self-start text-sm" href="/kitab/ihya">
          {t.tocAll}
        </NextLink>
      </div>
    </Section>
  );
}

// Daftar isi gagal dimuat (D1, pembaca tertutup): bagian #isi tetap ada supaya menu navbar tidak mati.
function ContentsUnavailable() {
  return (
    <Section tinted id="isi">
      <SectionHeading id="isi" lead={t.tocUnavailable} title={t.tocHeading} />
      <NextLink className={`${buttonVariants({ variant: "secondary" })} self-start`} href="/kitab">
        {t.tocShelf}
      </NextLink>
    </Section>
  );
}

function HowItWorks() {
  return (
    <Section id="cara-kerja">
      <SectionHeading center id="cara-kerja" lead={t.howLead} title={t.howHeading} />
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {t.steps.map((s, i) => (
          <li key={s.title} className="flex" data-art-card>
            <Card className="w-full gap-0 p-2 shadow-none">
              <div className="bg-surface-secondary overflow-hidden rounded-xl">
                <ArtEmbed name={s.art} title={t.howArtTitle} />
              </div>
              <Card.Header className="gap-1.5 px-3 pt-4 pb-3">
                <Typography className="text-accent font-semibold tabular-nums" type="body-xs">
                  <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <span className="sr-only">{t.stepNumber(i + 1)}</span>
                </Typography>
                <Card.Title className="text-base">{s.title}</Card.Title>
                <Card.Description className="text-pretty">{s.body}</Card.Description>
              </Card.Header>
            </Card>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Principles() {
  return (
    <Section tinted id="prinsip">
      <SectionHeading center id="prinsip" lead={t.principlesLead} title={t.principlesHeading} />
      <PrinciplesGrid />
    </Section>
  );
}

function Integration() {
  const resources = [
    { ...t.resources[0], href: SOURCE_URL, external: true },
    { ...t.resources[1], href: "/lisensi", external: false },
    { ...t.resources[2], href: "/tentang", external: false },
  ];
  return (
    <Section id="integrasi">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <SectionHeading
            eyebrow={landingNav.sections.integrasi}
            id="integrasi"
            lead={t.mcpLead}
            title={t.mcpHeading}
          />
          <div className="bg-surface-secondary flex flex-col gap-1 rounded-2xl p-4">
            <Typography className="font-mono break-all" type="body-sm">
              {MCP_URL}
            </Typography>
            <Typography color="muted" type="body-xs">
              {t.mcpNote}
            </Typography>
          </div>
          <NextLink className={`${buttonVariants()} self-start`} href="/mcp">
            {t.mcpGuide}
            <ArrowRight01 className="size-4" />
          </NextLink>
        </div>
        <div className="bg-accent-soft rounded-3xl p-2 sm:p-4" data-art-card>
          <ArtEmbed name="integrasi-ai" title={t.mcpArtTitle} />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Typography.Heading className="text-xl" level={3}>
          {t.resourcesHeading}
        </Typography.Heading>
        <ul className="grid gap-4 sm:grid-cols-3">
          {resources.map((r) => (
            <li key={r.id} className="flex">
              <Card className="w-full">
                <Card.Header className="gap-1.5">
                  <Card.Title className="flex items-center gap-2 text-base">
                    {r.id === "source" ? <Github className="size-4" /> : null}
                    {r.external ? (
                      <a className="link" href={r.href} rel="noopener noreferrer" target="_blank">
                        {r.title}
                      </a>
                    ) : (
                      <NextLink className="link" href={r.href}>
                        {r.title}
                      </NextLink>
                    )}
                  </Card.Title>
                  <Card.Description className="text-pretty">{r.body}</Card.Description>
                </Card.Header>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function ReadNow({ firstPage }: { firstPage: string | null }) {
  return (
    <section aria-labelledby="judul-baca" className="py-8">
      <div className={PAGE_FRAME}>
        <div className="bg-accent text-accent-foreground flex flex-col items-start justify-between gap-6 rounded-3xl px-6 py-10 sm:px-10 md:flex-row md:items-center">
          <div className="flex max-w-xl flex-col gap-2">
            <Typography.Heading
              className="text-accent-foreground text-2xl text-balance sm:text-3xl"
              id="judul-baca"
              level={2}
            >
              {t.readHeading}
            </Typography.Heading>
            <Typography className="text-accent-foreground text-pretty opacity-90">
              {t.readLead}
            </Typography>
          </div>
          <div className="flex flex-wrap gap-3">
            <NextLink
              className={buttonVariants({ size: "lg", variant: "secondary" })}
              href={firstPage ?? "/kitab"}
            >
              {firstPage ? t.readFirst : t.readShelf}
            </NextLink>
          </div>
        </div>
      </div>
    </section>
  );
}

const usd = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percent = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 0 });

function Free({ ask, cost }: { ask: boolean; cost: TransparencyMonth | null }) {
  // Plafon 0 = anggaran Maknaz belum dibuka: tanpa bilah (persentase atas US$1 menyesatkan).
  const cap = cost && cost.cap_usd > 0 ? cost.cap_usd : null;
  const used = cost && cap ? Math.min(cost.cost_usd, cap) : 0;
  const points = ask ? [...t.freePoints, t.freeAsk] : t.freePoints;
  return (
    <Section id="gratis">
      <SectionHeading center id="gratis" lead={t.freeLead} title={t.freeHeading} />
      <div className="mx-auto grid w-full max-w-4xl gap-4 md:grid-cols-5">
        <Card className="gap-6 p-6 md:col-span-3">
          <div className="flex items-baseline gap-2">
            <Typography className="text-5xl font-bold tracking-tight">{t.freePrice}</Typography>
            <Typography color="muted">{t.freeUnit}</Typography>
          </div>
          <ul className="flex flex-col gap-3">
            {points.map((p) => (
              <li key={p} className="flex gap-3">
                <Tick02 className="text-accent mt-0.5 size-5 shrink-0" />
                <Typography>{p}</Typography>
              </li>
            ))}
          </ul>
          <NextLink className={`${buttonVariants({ size: "lg" })} self-start`} href="/home">
            {t.start}
          </NextLink>
        </Card>
        <Card className="gap-4 p-6 md:col-span-2">
          <Card.Header>
            <Card.Title className="text-base">{t.costHeading}</Card.Title>
          </Card.Header>
          <Card.Content className="gap-3">
            {cost && cap ? (
              <>
                <ProgressBar
                  aria-label={t.costHeading}
                  className="gap-2"
                  maxValue={cap}
                  value={used}
                >
                  <div className="flex items-baseline gap-2">
                    <Typography className="text-3xl font-semibold tabular-nums">
                      {percent.format(used / cap)}
                    </Typography>
                    <Typography color="muted" type="body-sm">
                      {t.costUsedSuffix}
                    </Typography>
                  </div>
                  <ProgressBar.Track className="h-3">
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>
                <Typography className="tabular-nums" color="muted" type="body-sm">
                  {t.costDetail(usd.format(cost.cost_usd), usd.format(cost.cap_usd))}
                </Typography>
              </>
            ) : (
              <Typography color="muted" type="body-sm">
                {cost ? t.costNoCap : t.costUnavailable}
              </Typography>
            )}
            <Typography color="muted" type="body-xs">
              {t.costFixed}
            </Typography>
          </Card.Content>
          <Card.Footer>
            <NextLink className="link text-sm" href="/transparansi">
              {t.costMore}
            </NextLink>
          </Card.Footer>
        </Card>
      </div>
    </Section>
  );
}

function Faq() {
  return (
    <Section tinted id="tanya-jawab">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeading id="tanya-jawab" title={t.faqHeading} />
        </div>
        <div className="lg:col-span-8">
          <Accordion variant="surface">
            {t.faq.map((f) => (
              <Accordion.Item key={f.q}>
                <Accordion.Heading>
                  <Accordion.Trigger>
                    {f.q}
                    <Accordion.Indicator>
                      <ArrowDown01 />
                    </Accordion.Indicator>
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body>
                    <Typography color="muted">{f.a}</Typography>
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      </div>
    </Section>
  );
}
