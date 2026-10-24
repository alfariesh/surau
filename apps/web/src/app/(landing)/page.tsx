import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  Button,
  Chip,
  Disclosure,
  DisclosureGroup,
  ProgressBar,
  Separator,
  Typography,
} from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";

import { ArabicInline, ArabicText } from "../../components/arabic";
import { ArtEmbed } from "../../components/art/art-embed";
import { WorkCover } from "../../components/book/work-cover";
import { DemoShowcase } from "../../components/landing/demo-showcase";
import { McpSim } from "../../components/landing/mcp-sim";
import { OrbStory } from "../../components/landing/orb-story";
import { SectionNav } from "../../components/landing/section-nav";
import { SurauMark } from "../../components/shell/logo";
import {
  ArrowDown01,
  ChatGpt,
  Claude,
  Copilot,
  GoogleGemini,
  Grok,
  Mistral,
  ArrowRight01,
  Book02,
  BookOpen01,
  Copy01,
  Github,
  QuoteDown,
  Search01,
  Tick02,
} from "../../icons";
import { MCP_URL, SOURCE_URL, id } from "../../i18n/id";
import { landing as t, landingNav } from "../../i18n/id/landing";
import {
  SEARCH_DEMO_QUERY,
  loadLandingData,
  type HeroQuote,
  type LandingData,
  type LandingWork,
} from "../../lib/landing-data";
import type { TransparencyMonth } from "../../lib/transparency-data";

export const metadata: Metadata = {
  title: { absolute: id.meta.title },
  alternates: { canonical: "/" },
};

// Dirender per request seperti Beranda: kutipan, contoh hasil, dan biaya dibaca dari D1 (CI tidak punya
// D1 saat build). Setiap bagian data yang gagal dimuat disembunyikan; halaman tetap tampil.
export const dynamic = "force-dynamic";

// Landing page publik (ADR-096). Hero mengikuti template buku Primer (panel gradien + sampul kitab,
// kutipan asli di pita, judul), lalu menu bagian bernomor yang menempel. Bagian di bawahnya mengikuti
// pola ElevenLabs: kartu bertab berisi simulasi hidup (Maknaz dengan orb, Cari, pembaca), bento
// bergradien, kartu bergambar garis, rak koleksi, simulasi MCP, gratis + biaya, tanya jawab, penutup.

const FRAME = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const SECTION = "scroll-mt-16 py-20 sm:scroll-mt-28 sm:py-28";

export default async function LandingPage() {
  const data = await loadLandingData();
  return (
    <>
      <Hero quote={data.quote} work={data.work} />
      <SectionNav />
      <TrySurau data={data} />
      <Features quote={data.quote} />
      <HowItWorks />
      <Collection work={data.work} />
      <Integration label={data.quote?.label ?? null} />
      <Free ask={data.ask} cost={data.cost} />
      <Faq />
      <Closing firstPage={data.work?.firstPage ?? null} />
    </>
  );
}

/** Label bagian berbentuk pil: nomor | nama (pola template buku). */
function SectionPill({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span className="text-accent ring-accent inline-flex items-center self-start rounded-full px-4 py-1 ring-1 ring-inset">
      <span aria-hidden="true" className="font-mono text-sm">
        {String(n).padStart(2, "0")}
      </span>
      <span aria-hidden="true" className="bg-accent/20 ms-3 h-3.5 w-px" />
      <span className="ms-3 font-medium tracking-tight">{children}</span>
    </span>
  );
}

/** Pembuka bagian ala ElevenLabs: pil + judul besar di kiri, pembuka (dan ajakan) di kanan. */
function SectionIntro({
  n,
  id,
  label,
  title,
  lead,
  action,
}: {
  n: number;
  id: string;
  label: string;
  title: string;
  lead: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col gap-6">
        <SectionPill n={n}>{label}</SectionPill>
        <Typography.Heading
          className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
          id={`judul-${id}`}
          level={2}
        >
          {title}
        </Typography.Heading>
      </div>
      <div className="flex flex-col items-start gap-6 lg:pt-14">
        <Typography className="text-base text-pretty sm:text-lg" color="muted">
          {lead}
        </Typography>
        {action}
      </div>
    </div>
  );
}

function Hero({ quote, work }: { quote: HeroQuote | null; work: LandingWork | null }) {
  return (
    <header className="bg-surface-secondary overflow-hidden lg:bg-transparent lg:px-5">
      <div className="mx-auto grid max-w-6xl grid-cols-1 grid-rows-[auto_1fr] gap-y-16 pt-16 md:pt-20 lg:grid-cols-12 lg:gap-y-20 lg:px-3 lg:pt-20 lg:pb-36 xl:py-32">
        {/* Panel gradien yang membentang ke tepi kiri layar, dengan sampul kitab di atasnya. */}
        <div className="relative flex items-end lg:col-span-5 lg:row-span-2">
          <div
            aria-hidden="true"
            className="landing-gradient-strong absolute -top-20 right-1/2 -bottom-12 left-0 z-10 rounded-br-[5rem] md:bottom-8 lg:-inset-y-32 lg:right-full lg:left-[-100vw] lg:-mr-40"
          />
          <div className="relative z-10 mx-auto flex justify-center lg:w-full">
            {work ? (
              <NextLink
                className="focus-visible:ring-focus rounded-md outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
                href={work.href}
              >
                <span className="sr-only">{t.coverLabel(work.title ?? work.cover.title_ar)}</span>
                <WorkCover
                  textured
                  width={{ xs: 210, sm: 250, md: 290, lg: 330 }}
                  work={work.cover}
                />
              </NextLink>
            ) : (
              <div className="bg-background w-72 rounded-3xl p-2 md:w-80" data-art-card>
                <ArtEmbed name="landing-surau" title={t.closingArtTitle} />
              </div>
            )}
          </div>
        </div>

        {/* Kutipan asli di pita yang membentang ke tepi kanan (tempat testimoni di template). */}
        <div className="relative px-4 sm:px-6 lg:col-span-7 lg:pr-0 lg:pb-14 lg:pl-16 xl:pl-20">
          <div
            aria-hidden="true"
            className="lg:bg-surface-secondary hidden lg:absolute lg:-top-32 lg:right-[-100vw] lg:bottom-0 lg:left-[-100vw] lg:block"
          />
          {quote ? <HeroQuoteFigure quote={quote} /> : null}
        </div>

        <div className="bg-background pt-16 pb-16 lg:col-span-7 lg:bg-transparent lg:pt-0 lg:pb-0 lg:pl-16 xl:pl-20">
          <div className="mx-auto flex flex-col items-start gap-5 px-4 sm:px-6 md:max-w-2xl md:px-4 lg:px-0">
            <div className="flex items-center gap-3">
              <SurauMark className="size-8 shrink-0" />
              <Typography className="text-xl font-bold">{id.brand.name}</Typography>
              <Typography className="text-muted hidden sm:block" type="body-sm">
                {t.eyebrow}
              </Typography>
            </div>
            <Typography.Heading
              className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl"
              level={1}
            >
              {t.heading}
            </Typography.Heading>
            <Typography className="text-lg text-pretty sm:text-2xl" color="muted">
              {t.lead}
            </Typography>
            <div className="mt-3 flex flex-wrap gap-3">
              <NextLink className={buttonVariants({ size: "lg" })} href="/home">
                {t.start}
              </NextLink>
              {work?.firstPage ? (
                <NextLink
                  className={buttonVariants({ size: "lg", variant: "secondary" })}
                  href={work.firstPage}
                >
                  {t.readFirst}
                </NextLink>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// Arab dari DB (HERO_QUOTE, disalin kode), terjemahan AI berlabel, atribusi + alamat cetak.
function HeroQuoteFigure({ quote }: { quote: HeroQuote }) {
  return (
    <figure className="relative mx-auto flex max-w-md flex-col gap-3 lg:mx-0">
      <div className="text-accent flex items-center gap-2">
        <QuoteDown className="size-6" />
        <Typography color="muted" type="body-xs">
          {t.quoteLabel}
        </Typography>
      </div>
      <blockquote className="flex flex-col gap-2">
        <ArabicText as="div" size="lg">
          {quote.text}
        </ArabicText>
        {quote.translation ? (
          <Typography className="text-xl font-medium text-pretty" lang={quote.translation.lang}>
            {quote.translation.text}
          </Typography>
        ) : null}
      </blockquote>
      <figcaption className="flex flex-col gap-1">
        <Typography color="muted" type="body-sm">
          <strong className="text-accent font-semibold">
            {"— "}
            {quote.author ?? quote.label}
          </strong>
          {quote.author ? `, ${quote.label}` : null}
        </Typography>
        <Typography color="muted" type="body-xs">
          {quote.translation ? `${quote.translation.badge} · ` : null}
          <NextLink className="link" href={quote.permalink}>
            {t.quoteOpen}
          </NextLink>
        </Typography>
      </figcaption>
    </figure>
  );
}

// 01 · kartu bertab berisi simulasi (pola ElevenLabs): Maknaz, Cari, Baca.
function TrySurau({ data }: { data: LandingData }) {
  return (
    <section aria-labelledby="judul-coba" className={SECTION} id="coba">
      <div className={`${FRAME} flex flex-col gap-12`}>
        <SectionIntro
          action={
            <NextLink className={buttonVariants()} href="/home">
              {t.start}
              <ArrowRight01 className="size-4" />
            </NextLink>
          }
          id="coba"
          label={landingNav.sections.coba}
          lead={t.tryLead}
          n={1}
          title={t.tryHeading}
        />
        <DemoShowcase
          query={SEARCH_DEMO_QUERY}
          quote={data.quote}
          read={data.read}
          results={data.results}
        />
      </div>
    </section>
  );
}

const SMALL_ICONS = { search: Search01, takhrij: Book02, ayah: BookOpen01, link: Copy01 } as const;

// 02 · bento: dua kartu besar (gradien + permukaan) dan empat kartu kecil berikon.
function Features({ quote }: { quote: HeroQuote | null }) {
  return (
    <section aria-labelledby="judul-fitur" className={SECTION} id="fitur">
      <div className={`${FRAME} flex flex-col gap-12`}>
        <SectionIntro
          id="fitur"
          label={landingNav.sections.fitur}
          lead={t.featuresLead}
          n={2}
          title={t.featuresHeading}
        />
        <div className="grid gap-3 lg:grid-cols-2">
          <article className="landing-gradient flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-[2rem] p-6 sm:min-h-[28rem] sm:p-8">
            <div className="flex flex-1 items-center justify-center py-6">
              <OrbStory />
            </div>
            <div className="flex flex-col gap-2">
              <Typography.Heading className="text-lg font-semibold" level={3}>
                {t.bentoAsk.title}
              </Typography.Heading>
              <Typography className="text-foreground/80 max-w-md">{t.bentoAsk.body}</Typography>
            </div>
          </article>
          <article className="bg-surface-secondary flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-[2rem] p-6 sm:min-h-[28rem] sm:p-8">
            <div className="flex flex-1 items-center justify-center py-6">
              {quote ? (
                <div className="bg-background flex w-full max-w-sm flex-col gap-3 rounded-2xl p-5">
                  <div className="flex items-center gap-2">
                    <Typography className="text-accent font-medium" type="body-xs">
                      {quote.label}
                    </Typography>
                  </div>
                  <ArabicText as="div">{quote.text}</ArabicText>
                  {quote.translation ? (
                    <div className="flex flex-col gap-1">
                      <Chip className="self-start" size="sm" variant="soft">
                        {quote.translation.badge}
                      </Chip>
                      <Typography lang={quote.translation.lang} type="body-sm">
                        {quote.translation.text}
                      </Typography>
                    </div>
                  ) : null}
                  <NextLink className="link self-start text-sm" href={quote.permalink}>
                    {t.quoteOpen}
                  </NextLink>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Typography.Heading className="text-lg font-semibold" level={3}>
                {t.bentoRead.title}
              </Typography.Heading>
              <Typography className="max-w-md" color="muted">
                {t.bentoRead.body}
              </Typography>
            </div>
          </article>
        </div>
        <ul className="-mt-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {t.bentoSmall.map((f) => {
            const Icon = SMALL_ICONS[f.id];
            return (
              <li
                key={f.id}
                className="bg-surface-secondary flex flex-col justify-between gap-6 rounded-[1.5rem] p-4 sm:p-6 lg:min-h-56 lg:gap-8"
              >
                <span className="bg-background flex size-10 items-center justify-center rounded-xl">
                  <Icon className="size-5" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <Typography.Heading className="text-base font-semibold" level={3}>
                    {f.title}
                  </Typography.Heading>
                  <Typography color="muted" type="body-sm">
                    {f.body}
                  </Typography>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// 03 · cara kerja: kartu bergambar garis (pola "Safety, built in" ElevenLabs) dengan ilustrasi aset.
function HowItWorks() {
  return (
    <section aria-labelledby="judul-cara-kerja" className={SECTION} id="cara-kerja">
      <div className={`${FRAME} flex flex-col gap-12`}>
        <SectionIntro
          id="cara-kerja"
          label={landingNav.sections["cara-kerja"]}
          lead={t.howLead}
          n={3}
          title={t.howHeading}
        />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.steps.map((s, i) => (
            <li
              key={s.title}
              className="bg-surface-secondary flex flex-col overflow-hidden rounded-[1.5rem]"
              data-art-card
            >
              <div className="px-2 pt-4">
                <ArtEmbed name={s.art} title={t.howArtTitle} />
              </div>
              <div className="flex flex-col gap-1.5 p-6 pt-2">
                <Typography className="text-accent font-mono" type="body-xs">
                  {String(i + 1).padStart(2, "0")}
                </Typography>
                <Typography.Heading className="text-base font-semibold" level={3}>
                  {s.title}
                </Typography.Heading>
                <Typography color="muted" type="body-sm">
                  {s.body}
                </Typography>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// 04 · koleksi sebagai jalur bertahap (bukan rak sampul): tahap yang tersedia dengan angka asli dari
// edisi + daftar isi, lalu tahap yang menyusul. Tetap rapi berapa pun jumlah kitab nanti.
function StageMarker({ n, done }: { n: number; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-sm ${done ? "bg-accent text-accent-foreground" : "text-muted ring-separator bg-background ring-1 ring-inset"}`}
      >
        {done ? <Tick02 className="size-4" /> : String(n).padStart(2, "0")}
      </span>
      <Typography
        className={done ? "text-accent font-medium" : ""}
        color={done ? undefined : "muted"}
        type="body-sm"
      >
        {t.collectionStage(n)} · {done ? t.collectionAvailable : t.collectionSoon}
      </Typography>
      <span aria-hidden="true" className="bg-separator hidden h-px flex-1 lg:block" />
    </div>
  );
}

function Collection({ work }: { work: LandingWork | null }) {
  const number = new Intl.NumberFormat("id-ID");
  const stats = work?.stats
    ? [
        work.stats.volumes ? { value: work.stats.volumes, label: t.collectionStats.volumes } : null,
        { value: work.stats.books, label: t.collectionStats.books },
        { value: work.stats.sections, label: t.collectionStats.sections },
      ].filter((x) => x !== null)
    : [];
  return (
    <section aria-labelledby="judul-koleksi" className={SECTION} id="koleksi">
      <div className={`${FRAME} flex flex-col gap-12`}>
        <SectionIntro
          action={
            <NextLink className={buttonVariants({ variant: "secondary" })} href="/kitab">
              {t.collectionShelf}
            </NextLink>
          }
          id="koleksi"
          label={landingNav.sections.koleksi}
          lead={t.collectionLead}
          n={4}
          title={t.collectionHeading}
        />
        <ol className="grid gap-8 lg:grid-cols-[1.5fr_1fr_1fr] lg:gap-4">
          {work ? (
            <li className="flex flex-col gap-4">
              <StageMarker done n={1} />
              <article className="landing-gradient flex h-full flex-col gap-6 rounded-[2rem] p-6 sm:flex-row sm:items-center sm:p-8">
                <NextLink
                  className="focus-visible:ring-focus shrink-0 self-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
                  href={work.href}
                >
                  <span className="sr-only">{t.coverLabel(work.title ?? work.cover.title_ar)}</span>
                  <WorkCover
                    textured
                    width={{ xs: 150, sm: 130, md: 140, lg: 140 }}
                    work={work.cover}
                  />
                </NextLink>
                <div className="flex min-w-0 flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <Typography.Heading className="text-xl font-semibold" level={3}>
                      {work.title ?? <ArabicInline>{work.cover.title_ar}</ArabicInline>}
                    </Typography.Heading>
                    {work.cover.author?.name_id ? (
                      <Typography className="text-foreground/80" type="body-sm">
                        {work.cover.author.name_id}
                      </Typography>
                    ) : null}
                  </div>
                  {stats.length > 0 ? (
                    <dl className="flex flex-wrap gap-x-6 gap-y-2">
                      {stats.map((st) => (
                        <div key={st.label} className="flex flex-col-reverse">
                          <dt>
                            <Typography className="text-foreground/80" type="body-xs">
                              {st.label}
                            </Typography>
                          </dt>
                          <dd className="m-0">
                            <Typography className="text-2xl font-semibold tabular-nums">
                              {number.format(st.value)}
                            </Typography>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  <NextLink
                    className={`${buttonVariants({ size: "sm" })} self-start`}
                    href={work.href}
                  >
                    {t.collectionOpen}
                    <ArrowRight01 className="size-4" />
                  </NextLink>
                </div>
              </article>
            </li>
          ) : null}
          {t.collectionNext.map((c, i) => (
            <li key={c.title} className="flex flex-col gap-4">
              <StageMarker done={false} n={i + 2} />
              <article className="border-separator flex h-full flex-col justify-between gap-8 rounded-[2rem] border-2 border-dashed p-6 sm:p-8">
                <span className="bg-surface-secondary flex size-11 items-center justify-center rounded-xl">
                  <Book02 className="text-muted size-5" />
                </span>
                <div className="flex flex-col gap-2">
                  <Typography.Heading className="text-lg font-semibold" level={3}>
                    {c.title}
                  </Typography.Heading>
                  <Typography color="muted" type="body-sm">
                    {c.body}
                  </Typography>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Logo asisten AI (set ikon lokal Hugeicons, kategori logos); nama tetap tertulis di sebelahnya. */
const CLIENT_LOGOS: Record<(typeof t.mcpClients)[number], typeof Claude> = {
  Claude,
  ChatGPT: ChatGpt,
  Grok,
  Gemini: GoogleGemini,
  Copilot,
  Mistral,
};

// 05 · integrasi AI: teks + alamat MCP di kiri, simulasi asisten AI memanggil tool Surau di kanan.
function Integration({ label }: { label: string | null }) {
  return (
    <section aria-labelledby="judul-integrasi" className={SECTION} id="integrasi">
      <div className={`${FRAME} grid items-center gap-12 lg:grid-cols-2 lg:gap-16`}>
        {/* min-w-0: lebar marquee (max-content) tidak boleh melebarkan kolom grid. */}
        <div className="flex min-w-0 flex-col gap-6">
          <SectionPill n={5}>{landingNav.sections.integrasi}</SectionPill>
          <Typography.Heading
            className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
            id="judul-integrasi"
            level={2}
          >
            {t.mcpHeading}
          </Typography.Heading>
          <Typography className="text-base text-pretty sm:text-lg" color="muted">
            {t.mcpLead}
          </Typography>
          <div className="flex flex-col gap-3">
            <Typography color="muted" type="body-xs">
              {t.mcpClientsLabel}
            </Typography>
            <div className="landing-marquee">
              <div className="landing-marquee__track">
                {[false, true].map((copy) => (
                  <ul
                    key={String(copy)}
                    aria-hidden={copy ? "true" : undefined}
                    className="flex shrink-0 items-center gap-10 pe-10"
                  >
                    {t.mcpClients.map((name) => {
                      const Logo = CLIENT_LOGOS[name];
                      return (
                        <li key={name} className="flex items-center gap-2">
                          <Logo className="size-6" />
                          <Typography className="text-lg font-medium">{name}</Typography>
                        </li>
                      );
                    })}
                  </ul>
                ))}
              </div>
            </div>
            <Typography color="muted" type="body-xs">
              {t.mcpClientsMore}
            </Typography>
          </div>
          <div className="bg-surface-secondary flex flex-col gap-1 rounded-2xl p-4">
            <Typography color="muted" type="body-xs">
              {t.mcpUrlLabel}
            </Typography>
            <Typography className="font-mono break-all" type="body-sm">
              {MCP_URL}
            </Typography>
          </div>
          <NextLink className={`${buttonVariants()} self-start`} href="/mcp">
            {t.mcpGuide}
            <ArrowRight01 className="size-4" />
          </NextLink>
        </div>
        {label ? <McpSim label={label} /> : null}
      </div>
    </section>
  );
}

const usd = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdFull = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percent = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 0 });

function Plan({
  name,
  body,
  currency,
  price,
  points,
  action,
  featured = false,
  children,
}: {
  name: string;
  body: string;
  currency: string;
  price: string;
  points: readonly string[];
  action: ReactNode;
  featured?: boolean;
  children?: ReactNode;
}) {
  const ink = featured ? "text-accent-foreground" : "";
  return (
    <div
      className={`relative px-4 py-16 sm:rounded-[3rem] sm:px-10 md:py-12 lg:px-12 ${featured ? "landing-gradient-strong" : ""}`}
    >
      <div className="relative flex flex-col">
        <div className="flex font-bold">
          <span
            className={`text-xl sm:text-2xl ${featured ? "text-accent-foreground/80" : "text-muted"}`}
          >
            {currency}
          </span>
          <span
            className={`ms-1 mt-1 text-5xl tracking-tight sm:text-7xl ${featured ? "text-accent-foreground" : "text-foreground"}`}
          >
            {price}
          </span>
        </div>
        <Typography.Heading className={`mt-7 text-lg font-semibold ${ink}`} level={3}>
          {name}
        </Typography.Heading>
        <Typography className={`mt-2 text-lg ${ink}`} color={featured ? undefined : "muted"}>
          {body}
        </Typography>
        {children}
        <ul
          className={`mt-8 -mb-2 divide-y ${featured ? "divide-accent-foreground/15" : "divide-separator"}`}
        >
          {points.map((p) => (
            <li key={p} className="flex gap-4 py-2">
              <Tick02
                className={`mt-1.5 size-5 shrink-0 ${featured ? "text-accent-foreground" : "text-muted"}`}
              />
              <Typography className={ink}>{p}</Typography>
            </li>
          ))}
        </ul>
        <div className="mt-8">{action}</div>
      </div>
    </div>
  );
}

// 06 · gratis: dua panel dalam satu wadah (pola harga template buku); panel berwarna = biaya terbuka.
function Free({ ask, cost }: { ask: boolean; cost: TransparencyMonth | null }) {
  // Plafon 0 = anggaran Maknaz belum dibuka: tanpa bilah (persentase atas US$1 menyesatkan).
  const cap = cost && cost.cap_usd > 0 ? cost.cap_usd : null;
  const used = cost && cap ? Math.min(cost.cost_usd, cap) : 0;
  const costPoints =
    cost === null
      ? [t.costUnavailable, t.costFixed]
      : cap === null
        ? [t.costNoCap, t.costFixed]
        : [
            `${percent.format(used / cap)} ${t.costUsedSuffix}`,
            t.costDetail(usdFull.format(cap)),
            t.costFixed,
          ];
  return (
    <section aria-labelledby="judul-gratis" className={SECTION} id="gratis">
      <div className={`${FRAME} flex flex-col gap-12`}>
        <SectionIntro
          id="gratis"
          label={landingNav.sections.gratis}
          lead={t.freeLead}
          n={6}
          title={t.freeStatement}
        />
        <div className="bg-surface-secondary mx-auto grid w-full max-w-5xl sm:px-6 sm:pb-16 md:grid-cols-2 md:rounded-[5rem] md:px-8 md:pt-16 lg:p-20">
          <Plan
            action={
              <NextLink
                className={`${buttonVariants({ size: "lg", variant: "secondary" })} w-full`}
                href="/home"
              >
                {t.start}
              </NextLink>
            }
            body={t.planBody}
            currency={t.planCurrency}
            name={t.planName}
            points={ask ? [...t.planPoints, t.planAsk] : t.planPoints}
            price={t.planPrice}
          />
          <Plan
            featured
            action={
              <NextLink
                className={`${buttonVariants({ size: "lg", variant: "secondary" })} w-full`}
                href="/transparansi"
              >
                {t.costMore}
              </NextLink>
            }
            body={t.costBody}
            currency={t.costCurrency}
            name={t.costName}
            points={costPoints}
            price={cost ? usd.format(cost.cost_usd) : "–"}
          >
            {cost && cap ? (
              <ProgressBar aria-label={t.costName} className="mt-6" maxValue={cap} value={used}>
                <ProgressBar.Track className="bg-accent-foreground/20 h-2">
                  <ProgressBar.Fill className="bg-accent-foreground" />
                </ProgressBar.Track>
              </ProgressBar>
            ) : null}
          </Plan>
        </div>
      </div>
    </section>
  );
}

// Tanya jawab: DisclosureGroup HeroUI, satu terbuka pada satu waktu.
function Faq() {
  return (
    <section aria-labelledby="judul-tanya-jawab" className={SECTION} id="tanya-jawab">
      <div className={`${FRAME} grid gap-10 lg:grid-cols-12`}>
        <div className="flex flex-col gap-3 lg:col-span-4">
          <Typography.Heading
            className="text-2xl leading-tight font-semibold tracking-tight sm:text-4xl"
            id="judul-tanya-jawab"
            level={2}
          >
            {t.faqHeading}
          </Typography.Heading>
          <Typography color="muted">{t.faqLead}</Typography>
        </div>
        <DisclosureGroup className="lg:col-span-8">
          {t.faq.map((f, i) => (
            <div key={f.q}>
              {i > 0 ? <Separator /> : null}
              <Disclosure id={`faq-${i}`}>
                <Disclosure.Heading>
                  <Button
                    className="h-auto w-full justify-between py-4 text-start whitespace-normal"
                    slot="trigger"
                    variant="ghost"
                  >
                    <span className="text-base font-medium">{f.q}</span>
                    <Disclosure.Indicator className="text-muted shrink-0">
                      <ArrowDown01 />
                    </Disclosure.Indicator>
                  </Button>
                </Disclosure.Heading>
                <Disclosure.Content>
                  <Disclosure.Body className="px-3 pb-5">
                    <Typography color="muted">{f.a}</Typography>
                  </Disclosure.Body>
                </Disclosure.Content>
              </Disclosure>
            </div>
          ))}
        </DisclosureGroup>
      </div>
    </section>
  );
}

// Penutup: kartu gradien dengan ilustrasi surau dan ajakan (pola penutup ElevenLabs).
function Closing({ firstPage }: { firstPage: string | null }) {
  return (
    <section aria-labelledby="judul-penutup" className="pb-8">
      <div className={FRAME}>
        <div className="landing-gradient grid items-center gap-8 overflow-hidden rounded-[2.5rem] px-6 py-12 sm:px-12 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-5">
            <Typography.Heading
              className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
              id="judul-penutup"
              level={2}
            >
              {t.closingHeading}
            </Typography.Heading>
            <Typography className="text-foreground/80 text-base sm:text-lg">
              {t.closingBody}
            </Typography>
            <div className="flex flex-wrap items-center gap-3">
              <NextLink className={buttonVariants({ size: "lg" })} href="/home">
                {t.start}
              </NextLink>
              {firstPage ? (
                <NextLink
                  className={buttonVariants({ size: "lg", variant: "secondary" })}
                  href={firstPage}
                >
                  {t.readFirst}
                </NextLink>
              ) : null}
            </div>
            <a
              className="text-foreground inline-flex items-center gap-2 font-medium"
              href={SOURCE_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Github className="size-5" />
              {t.closingSource}
            </a>
          </div>
          <div className="bg-background/60 rounded-3xl p-2" data-art-card>
            <ArtEmbed name="landing-surau" title={t.closingArtTitle} />
          </div>
        </div>
      </div>
    </section>
  );
}
