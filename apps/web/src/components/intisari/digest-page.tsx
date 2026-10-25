import type { DigestView } from "@surau/core";
import type { ReactNode } from "react";

import { Alert, Breadcrumbs, Separator, Typography } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";

import { BookOpen01 } from "../../icons";
import { intisari as intisariText } from "../../i18n/id/intisari";
import { reader as readerText } from "../../i18n/id/reader";
import type { DigestTeaser } from "../../lib/reader/digest";
import { modelName } from "../../lib/model-names";
import { ArabicInline } from "../arabic";
import { PageTitle } from "../page-title";
import { AiBadge } from "../reader/ai-badge";
import { LicenseNotice } from "../reader/license-notice";

import { EvidenceList } from "./evidence-list";
import { longDate } from "./format";
import type { ListenTrack } from "../listen/track";
import { ListenSlot } from "./listen-slot";
import { PointList, pointNumbers } from "./point-list";
import { QuoteCard } from "./quote-card";
import { ReadMark } from "./read-mark";
import { RecallQuestions } from "./recall-questions";
import { TermList } from "./term-list";

const t = intisariText;
const r = readerText;

/** Intisari Bab di bawah Intisari Kitab (tata letak Kitab), urut daftar isi. */
export interface ChildDigest {
  teaser: DigestTeaser;
  /** Judul Arab persis dari DB. */
  title: string;
  /** Judul Indonesia terjemahan AI daftar isi, bila ada. */
  titleId?: string;
}

export interface DigestPageProps {
  digest: DigestView;
  /** Judul Indonesia bagian ini (terjemahan AI daftar isi, X04 W8), bila ada. */
  titleId: string | null;
  /** Bahasa judul Indonesia (sumber judul daftar isi). */
  titleLang?: string;
  /** Nama penulis untuk lencana sikap ("Pendapat al-Ghazali"). */
  author: string;
  /** Jejak: karya → hub Intisari (tanpa halaman ini). */
  crumbs: readonly { name: string; href: string }[];
  /** Intisari Bab anak (Intisari Kitab saja). */
  sections: readonly ChildDigest[];
  /** Hub Intisari karya; null bila hub belum ada (tanpa Intisari Kitab). */
  hubHref: string | null;
  /** Edisi untuk lisensi/atribusi (`/lisensi`). */
  workSlug: string;
  editionSlug: string;
  /** Data pemutar Dengarkan (X17); null/tidak ada = Intisari tanpa audio. */
  listen?: ListenTrack | null;
}

function Section({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <Typography.Heading className="scroll-mt-24 text-xl sm:text-2xl" id={id} level={2}>
        {heading}
      </Typography.Heading>
      {children}
    </section>
  );
}

/** Teks AI multi-paragraf (pembuka, abstrak, penutup): dipecah di baris kosong, tanpa Markdown. */
function Prose({ text, lead = false }: { text: string; lead?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {text.split(/\n\s*\n/u).map((para, i) => (
        <Typography key={i} className={lead ? "text-pretty sm:text-lg" : "text-pretty"}>
          {para.trim()}
        </Typography>
      ))}
    </div>
  );
}

/**
 * Halaman Intisari satu bagian (X16, ADR-097): kepala + label AI (model, versi prompt, tanggal,
 * status), pembuka/abstrak, gagasan bernomor dengan Dasar teks, kutipan, istilah, dalil yang
 * dihitung kode, Uji pemahaman, penutup, dan "Lanjut ke teks lengkap". Tata letak Kitab (`tier`
 * book) menambah "Yang dibahas", "Penutup", dan daftar Intisari Bab-nya. Satu komponen server untuk
 * rute ISR dan pratinjau fixture `/dev/intisari`; tidak ikut mode baca (isinya teks Indonesia, dan
 * terjemahan kutipan selalu tampil berlabel).
 */
export function DigestPage({
  digest,
  titleId,
  titleLang,
  author,
  crumbs,
  sections,
  hubHref,
  workSlug,
  editionSlug,
  listen = null,
}: DigestPageProps) {
  const numbers = pointNumbers(digest.points);
  const book = digest.tier === "book";
  const general = digest.quotes.filter((q) => q.point_ord === null);
  const hasEvidence = digest.evidence.ayat.length + digest.evidence.hadith.length > 0;
  const meta = t.meta(
    modelName(digest.model),
    digest.prompt_version,
    longDate(digest.created_at),
    t.review[digest.review_status],
  );

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-10" data-intisari={digest.tier}>
      <header className="flex flex-col gap-4">
        <Breadcrumbs aria-label={t.breadcrumbLabel}>
          {crumbs.map((c) => (
            <Breadcrumbs.Item key={c.href} href={c.href}>
              {c.name}
            </Breadcrumbs.Item>
          ))}
          <Breadcrumbs.Item>{book ? t.tierBook : t.tierSection}</Breadcrumbs.Item>
        </Breadcrumbs>
        <div className="flex flex-col gap-2">
          <Typography className="flex flex-wrap items-center gap-2" color="muted" type="body-sm">
            <span className="font-medium">{book ? t.tierBook : t.tierSection}</span>
            <span className="ai-badge ms-0" title={t.aiBadgeHint}>
              {t.aiBadge}
            </span>
          </Typography>
          <PageTitle className="flex flex-col items-start gap-1" compactTitle={titleId ?? false}>
            {titleId !== null ? (
              <>
                <span lang={titleLang}>
                  {titleId}
                  <AiBadge
                    announce
                    label={{ kind: "ai", badge: r.tocTitleBadge, detail: r.tocTitleHint }}
                  />
                </span>
                <ArabicInline className="text-muted font-normal" size="display">
                  {digest.section.title_ar}
                </ArabicInline>
              </>
            ) : (
              <ArabicInline size="display">{digest.section.title_ar}</ArabicInline>
            )}
          </PageTitle>
          <Typography className="flex flex-wrap items-baseline gap-x-3 gap-y-1" type="body-sm">
            <span>{t.points(digest.points.length)}</span>
            <span>{t.readTime(digest.reading_minutes)}</span>
          </Typography>
          <Typography color="muted" data-intisari-meta="" type="body-xs">
            {meta}
          </Typography>
          <ListenSlot track={listen} />
        </div>
        <Alert className="intisari-notice">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              {t.notice}{" "}
              <NextLink className="link" href="/tentang#prinsip">
                {t.noticeMore}
              </NextLink>
            </Alert.Description>
          </Alert.Content>
        </Alert>
      </header>

      {book && digest.opening !== null ? (
        <Section heading={t.openingHeading} id="yang-dibahas">
          <Prose lead text={digest.opening} />
        </Section>
      ) : null}

      <Section heading={t.abstractHeading} id="ringkasan">
        <Prose lead={!book} text={digest.abstract} />
      </Section>

      <Section heading={t.pointsHeading} id="gagasan">
        <PointList author={author} digest={digest} />
      </Section>

      {general.length > 0 ? (
        <Section heading={t.quotesHeading} id="kutipan">
          <div className="flex flex-col gap-4">
            {general.map((q) => (
              <QuoteCard key={q.ord} quote={q} />
            ))}
          </div>
        </Section>
      ) : null}

      {digest.terms.length > 0 ? (
        <Section heading={t.termsHeading} id="istilah">
          <TermList terms={digest.terms} />
        </Section>
      ) : null}

      {hasEvidence ? (
        <Section heading={t.evidenceHeading} id="dalil">
          <Typography color="muted" type="body-sm">
            {t.evidenceLead}
          </Typography>
          <EvidenceList evidence={digest.evidence} numbers={numbers} />
        </Section>
      ) : null}

      {digest.questions.length > 0 ? (
        <Section heading={t.questionsHeading} id="uji-pemahaman">
          <RecallQuestions numbers={numbers} points={digest.points} questions={digest.questions} />
        </Section>
      ) : null}

      {book && digest.closing !== null ? (
        <Section heading={t.closingHeading} id="penutup">
          <Prose text={digest.closing} />
        </Section>
      ) : null}

      {sections.length > 0 ? (
        <Section heading={t.childrenHeading} id="intisari-bab">
          <ul className="flex list-none flex-col gap-3 p-0">
            {sections.map((s) => (
              <li key={s.teaser.nodeId}>
                <NextLink className="intisari-row" href={s.teaser.href}>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    {s.titleId ? (
                      <span className="text-foreground font-medium" lang={titleLang}>
                        {s.titleId}
                      </span>
                    ) : null}
                    <ArabicInline className={s.titleId ? "text-muted" : "text-foreground"}>
                      {s.title}
                    </ArabicInline>
                  </span>
                  <span className="text-muted shrink-0 text-xs">
                    {t.points(s.teaser.points)} · {t.readTime(s.teaser.minutes)}
                  </span>
                </NextLink>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <section aria-labelledby="lanjut" className="intisari-continue flex flex-col gap-3">
        <Typography.Heading className="text-xl sm:text-2xl" id="lanjut" level={2}>
          {t.continueHeading}
        </Typography.Heading>
        <Typography>{t.continueText}</Typography>
        <div>
          <NextLink
            className={buttonVariants({ variant: "primary" })}
            data-intisari-text=""
            href={digest.section.permalink}
          >
            <BookOpen01 aria-hidden="true" className="size-4" />
            {t.continueButton}
          </NextLink>
        </div>
        <Typography color="muted" type="body-sm">
          {t.teacherNote}
        </Typography>
        <ReadMark nodeId={digest.section.id} />
      </section>

      <footer className="text-muted flex flex-col gap-2 text-xs">
        <Separator />
        <Typography.Heading className="pt-4 text-sm" level={2}>
          {t.sourceHeading}
        </Typography.Heading>
        <LicenseNotice
          compact
          attribution={digest.source.attribution}
          editionSlug={editionSlug}
          license={digest.source.license}
          workSlug={workSlug}
        />
        {hubHref !== null ? (
          <NextLink className="link self-start text-xs" href={hubHref}>
            {t.hubLink}
          </NextLink>
        ) : null}
      </footer>
    </article>
  );
}
