"use client";

import type { FormEvent } from "react";

import {
  Alert,
  Button,
  Card,
  Chip,
  Description,
  Label,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import { ChatMessage, ChatMessageActions } from "@heroui-pro/react";
import NextLink from "next/link";
import { useEffect, useRef, useState } from "react";

import { tanyaText as t } from "../../i18n/tanya";
import type { KutipanItem } from "../../lib/kutipan-handler";
import type { JawabCitation, JawabResult, JawabSearchHit } from "../../lib/tanya/model";
import { displayText, kutipanQuery, spanKey, termPhrase } from "../../lib/tanya/model";
import { ArabicInline, ArabicText } from "../arabic";
import { TanyaOrb } from "./tanya-orb";
import { modelName } from "../../lib/model-names";
import { translationLabel } from "../../lib/translation-label";
import type { ReadMode } from "../../lib/reader/scale";
import { useReadMode } from "../read-mode";

// Tampilan hasil Jawab (S21; sebagai balasan di percakapan, ADR-073). Teks Indonesia dari model tampil sebagai teks biasa per blok: blok
// bersitasi diberi penanda [n], blok tanpa sitasi redup (ADR-064 butir 5). Kutipan Arab SELALU dari
// /api/kutipan (salinan DB, aturan teks-arab no. 1), tidak pernah lewat Markdown atau keluaran model.

type Kutipan = Map<string, KutipanItem | null>;

/** Muat teks kutipan dari DB untuk semua rentang (sekali per hasil). */
function useKutipan(
  spans: readonly { passage_id: number; char_start: number; char_end: number }[],
): Kutipan | null {
  const query = kutipanQuery(spans);
  const [state, setState] = useState<{ query: string; data: Kutipan } | null>(null);
  useEffect(() => {
    if (query === "") return;
    let cancelled = false;
    fetch(`/api/kutipan?r=${encodeURIComponent(query)}`)
      .then(async (res) =>
        res.ok ? ((await res.json()) as { items: (KutipanItem | null)[] }) : null,
      )
      .then((body) => {
        if (cancelled) return;
        const data: Kutipan = new Map();
        const keys = query.split(",");
        keys.forEach((k, i) => data.set(k, body?.items[i] ?? null));
        setState({ query, data });
      })
      .catch(() => {
        // Galat jaringan: semua kartu menampilkan `quoteMissing` (bukan kosong tanpa keterangan).
        if (!cancelled) setState({ query, data: new Map(query.split(",").map((k) => [k, null])) });
      });
    return () => {
      cancelled = true;
    };
  }, [query]);
  return state?.query === query ? state.data : null;
}

// `idPrefix` membuat jangkar unik per giliran percakapan (#kutipan-g2-1), karena satu halaman bisa
// memuat beberapa jawaban.
export function AnswerText({
  result,
  idPrefix = "",
}: {
  result: Pick<JawabResult, "blocks">;
  idPrefix?: string;
}) {
  const hasUncited = result.blocks.some(
    (b) => b.citations.length === 0 && displayText(b.text).trim() !== "",
  );
  return (
    <div className="flex flex-col gap-3">
      <Typography className="leading-relaxed whitespace-pre-line">
        {result.blocks.map((b, i) =>
          b.citations.length > 0 ? (
            <span key={i}>
              {displayText(b.text)}
              {b.citations.map((n) => (
                <sup key={n} className="ms-0.5">
                  <a
                    aria-label={t.citationLink(n)}
                    className="text-accent no-underline hover:underline"
                    href={`#kutipan-${idPrefix}${n}`}
                  >
                    [{n}]
                  </a>
                </sup>
              ))}
            </span>
          ) : (
            <span key={i} className="text-muted">
              {displayText(b.text)}
            </span>
          ),
        )}
      </Typography>
      {hasUncited ? (
        <Typography type="body-xs" color="muted">
          {t.uncitedLegend}
        </Typography>
      ) : null}
    </div>
  );
}

/**
 * Kartu kutipan [n]: potongan Arab dari DB (bukti verifikasi, selalu tampil) + terjemahan AI paragrafnya
 * dalam `<details>` yang terbuka bawaan di mode baca Terjemahan (X11).
 */
export function CitationCard({
  c,
  item,
  idPrefix,
  readMode,
}: {
  c: JawabCitation;
  item: KutipanItem | null | undefined;
  idPrefix: string;
  readMode: ReadMode;
}) {
  return (
    <li id={`kutipan-${idPrefix}${c.n}`} className="scroll-mt-24">
      <Card>
        <Card.Header className="flex flex-row flex-wrap items-center gap-2">
          <Chip size="sm" variant="soft">
            [{c.n}]
          </Chip>
          <Typography type="body-sm" className="font-medium">
            {c.label}
          </Typography>
          <Chip size="sm" variant="soft" color={c.kind === "foot" ? "warning" : "default"}>
            {c.kind === "foot" ? t.takhrij : t.matan}
          </Chip>
          {item?.weak ? (
            <Chip size="sm" variant="soft" color="danger">
              {t.takhrijWeak}
            </Chip>
          ) : null}
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          {item?.weak ? (
            <Typography type="body-sm" color="muted">
              {t.takhrijWeakNote}
            </Typography>
          ) : null}
          {item === undefined ? null : item === null ? (
            <Typography type="body-sm" color="muted">
              {t.quoteMissing}
            </Typography>
          ) : (
            <ArabicText as="blockquote">{item.text}</ArabicText>
          )}
          {item?.translation ? (
            // Mode Terjemahan (X11): terjemahan paragraf kutipan terbuka bawaan; Arab tetap tampil.
            <details className="flex flex-col gap-1" open={readMode === "tr"}>
              <summary className="text-muted cursor-pointer text-sm">
                {item.translation.human_review
                  ? translationLabel(item.translation.human_review).badge
                  : t.translationAi}
              </summary>
              {/* Bahasa terjemahan dari data (X11); ringkasan di atasnya teks UI. */}
              <Typography lang={item.translation.lang} type="body-sm">
                {item.translation.text}
              </Typography>
            </details>
          ) : null}
          <NextLink className="text-accent self-start text-sm underline" href={c.permalink}>
            {t.openReader}
          </NextLink>
        </Card.Content>
      </Card>
    </li>
  );
}

/** Istilah takhrij: frasa Arab disalin dari teks DB lewat rentangnya, plus arti bakunya. */
export function HadithTerms({
  text,
  footnoteStart,
  terms,
}: {
  text: string;
  footnoteStart: number;
  terms: NonNullable<JawabResult["hadith"][number]["terms"]>;
}) {
  const rows = [
    ...new Map(
      terms.flatMap((term) => {
        const phrase = termPhrase(text, footnoteStart, term);
        return phrase === null ? [] : [[`${phrase}|${term.gloss}`, { phrase, gloss: term.gloss }]];
      }) as [string, { phrase: string; gloss: string }][],
    ).values(),
  ];
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <Typography type="body-xs" color="muted">
        {t.hadithTerms}
      </Typography>
      <ul className="flex list-none flex-col gap-1 ps-0">
        {rows.map((r) => (
          <li key={`${r.phrase}|${r.gloss}`}>
            <Typography type="body-sm">
              <ArabicInline>{r.phrase}</ArabicInline> — {r.gloss}
            </Typography>
          </li>
        ))}
      </ul>
    </div>
  );
}

const HADITH_LABEL: Record<JawabResult["hadith"][number]["label"], string> = {
  rule_extracted: t.hadithRule,
  ustadz_reviewed: t.hadithReviewed,
  ustadz_corrected: t.hadithCorrected,
  ai_extracted: t.hadithAi,
};

/** Jenis istilah dari koreksi penilai yang tidak punya frasa baku di teks: arti Latin saja. */
export function AddedTerms({ terms }: { terms: readonly { kind: string; gloss: string }[] }) {
  if (terms.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <Typography type="body-xs" color="muted">
        {t.hadithAdded}
      </Typography>
      <Typography type="body-sm">{terms.map((a) => a.gloss).join("; ")}</Typography>
    </div>
  );
}

function HadithClaims({
  result,
  kutipan,
  idPrefix,
}: {
  result: JawabResult;
  kutipan: Kutipan | null;
  idPrefix: string;
}) {
  if (result.hadith.length === 0) return null;
  const citeOf = (f: JawabResult["hadith"][number]["footnote"]) =>
    result.citations.find(
      (c) =>
        c.passage_id === f.passage_id && c.char_start === f.char_start && c.char_end === f.char_end,
    );
  return (
    <section aria-labelledby={`judul-hadits-${idPrefix}`} className="flex flex-col gap-2">
      <Typography.Heading level={3} id={`judul-hadits-${idPrefix}`} className="text-base">
        {t.hadithHeading}
      </Typography.Heading>
      <ul className="flex list-none flex-col gap-4 ps-0">
        {result.hadith.map((h, i) => {
          const c = citeOf(h.footnote);
          // Tanda kelemahan HANYA dari teks takhrij DB (`weak` dari /api/kutipan), bukan dari
          // pencocokan kata pada ringkasan AI (bisa menandai hadits sahih, peninjau S21).
          const item = kutipan?.get(spanKey(h.footnote));
          return (
            <li key={i} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Typography type="body-sm" className="first-letter:uppercase">
                  {h.status}
                </Typography>
                <Chip
                  size="sm"
                  variant="soft"
                  color={h.label.startsWith("ustadz_") ? "success" : "default"}
                >
                  {HADITH_LABEL[h.label] ?? t.hadithRule}
                </Chip>
                {item?.weak ? (
                  <Chip size="sm" variant="soft" color="danger">
                    {t.takhrijWeak}
                  </Chip>
                ) : null}
              </div>
              {h.mixed === true ? (
                <Typography type="body-sm" color="muted">
                  {t.hadithMixed}
                </Typography>
              ) : null}
              {item === undefined ? null : item === null ? (
                <Typography type="body-sm" color="muted">
                  {t.quoteMissing}
                </Typography>
              ) : (
                <div className="flex flex-col gap-1">
                  <HadithTerms
                    text={item.text}
                    footnoteStart={h.footnote.char_start}
                    terms={h.terms ?? []}
                  />
                  <AddedTerms terms={h.added_terms ?? []} />
                  <Typography type="body-xs" color="muted">
                    {t.takhrijText}
                  </Typography>
                  <ArabicText as="blockquote">{item.text}</ArabicText>
                </div>
              )}
              {c ? (
                <a className="text-accent text-sm underline" href={`#kutipan-${idPrefix}${c.n}`}>
                  {t.hadithSource} [{c.n}] · {c.label}
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RelatedHits({
  hits,
  kutipan,
  idPrefix,
}: {
  hits: readonly JawabSearchHit[];
  kutipan: Kutipan | null;
  idPrefix: string;
}) {
  if (hits.length === 0) return null;
  return (
    <section aria-labelledby={`judul-terkait-${idPrefix}`} className="flex flex-col gap-3">
      <Typography.Heading level={3} id={`judul-terkait-${idPrefix}`} className="text-base">
        {t.relatedHeading}
      </Typography.Heading>
      <ul className="flex list-none flex-col gap-3 ps-0">
        {hits.map((h) => {
          const item = kutipan?.get(spanKey(h));
          return (
            <li key={spanKey(h)}>
              <Card>
                <Card.Content className="flex flex-col gap-2">
                  <Typography type="body-sm" className="font-medium">
                    {h.label}
                  </Typography>
                  {item ? <ArabicText as="blockquote">{item.text}</ArabicText> : null}
                  <NextLink className="text-accent self-start text-sm underline" href={h.permalink}>
                    {t.openReader}
                  </NextLink>
                </Card.Content>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Laporan jawaban keliru → /api/feedback jenis `answer` (persetujuan eksplisit saat mengirim). */
function ReportForm({
  question,
  result,
  onClose,
  onSent,
}: {
  question: string;
  result: JawabResult;
  onClose: () => void;
  onSent: () => void;
}) {
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  // Formulir dibuka dari tombol aksi: fokus langsung ke isiannya.
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.querySelector("textarea")?.focus();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = new FormData(event.currentTarget).get("message");
    const comment = typeof raw === "string" ? raw.trim() : "";
    // Pesan disusun di sini, disamarkan + dipotong lagi di server (redactPii, 2.000 karakter).
    const message = [
      `[Laporan jawaban] ${comment}`,
      `Pertanyaan: ${question}`,
      `Jawaban (${result.outcome}${result.reason ? `/${result.reason}` : ""}, ${result.prompt_version}, ${result.corpus_version}): ${result.blocks
        .map((b) => b.text)
        .join("")
        .slice(0, 900)}`,
    ]
      .join("\n")
      .slice(0, 2000);
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "answer",
          message,
          path: "/tanya",
          passage_id: null,
          website: "",
        }),
      });
      if (res.ok) onSent();
      else setState("error");
    } catch {
      setState("error");
    }
  }
  return (
    <form ref={formRef} className="flex flex-col gap-3" onSubmit={submit}>
      <TextField isRequired maxLength={800} name="message">
        <Label>{t.reportLabel}</Label>
        <TextArea rows={3} />
        <Description>{t.reportHint}</Description>
      </TextField>
      {state === "error" ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t.reportFailed}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : null}
      <div className="flex gap-2">
        <Button size="sm" type="submit" isPending={state === "sending"}>
          {t.reportSend}
        </Button>
        <Button size="sm" variant="secondary" onPress={onClose}>
          {t.reportCancel}
        </Button>
      </div>
    </form>
  );
}

/**
 * Teks jawaban untuk disalin: kalimat + penanda [n], keterangan kalimat tanpa kutipan, atribusi AI,
 * lalu daftar sumber dengan tautan. Label AI ikut tersalin (teks ini bisa diteruskan ke luar Surau);
 * teks Arab tidak ikut (hanya di kartu kutipan, dari DB).
 */
export function answerPlainText(result: JawabResult, origin: string): string {
  const body = result.blocks
    .map((b) => displayText(b.text) + b.citations.map((n) => `[${n}]`).join(""))
    .join("")
    .trim();
  const uncited = result.blocks.some(
    (b) => b.citations.length === 0 && displayText(b.text).trim() !== "",
  );
  const sources = result.citations.map((c) => `[${c.n}] ${c.label} — ${origin}${c.permalink}`);
  return [
    body,
    [uncited ? t.copyUncited : null, t.copyAttribution].filter(Boolean).join(" "),
    sources.length > 0 ? `${t.sourcesHeading}:\n${sources.join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Aksi di bawah jawaban: salin, laporkan keliru (formulir terbuka di tempat). */
function AnswerActions({ question, result }: { question: string; result: JawabResult }) {
  const [reporting, setReporting] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState<"idle" | "ok" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(answerPlainText(result, window.location.origin));
      setCopied("ok");
    } catch {
      setCopied("failed");
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <ChatMessageActions>
        {result.outcome === "answer" ? (
          <ChatMessageActions.Copy
            aria-label={t.copy}
            isCopied={copied === "ok"}
            tooltip={t.copy}
            onPress={() => void copy()}
          />
        ) : null}
        <ChatMessageActions.ThumbsDown
          aria-expanded={reporting}
          aria-label={t.report}
          tooltip={t.report}
          onPress={() => setReporting((r) => !r)}
        />
      </ChatMessageActions>
      <output aria-live="polite" className="sr-only">
        {copied === "ok" ? t.copied : copied === "failed" ? t.copyFailed : ""}
      </output>
      {sent ? (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t.reportThanks}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : reporting ? (
        <ReportForm
          question={question}
          result={result}
          onClose={() => setReporting(false)}
          onSent={() => setSent(true)}
        />
      ) : null}
    </div>
  );
}

export function AnswerView({
  question,
  result,
  cached,
  idPrefix = "",
}: {
  question: string;
  result: JawabResult;
  cached: boolean;
  idPrefix?: string;
}) {
  const footSpans = result.hadith.map((h) => h.footnote);
  // Takhrij klaim didahulukan supaya selalu termuat walau kueri dibatasi 20 rentang.
  const kutipan = useKutipan([...footSpans, ...result.citations, ...result.search]);
  const readMode = useReadMode();
  const notFound = result.outcome === "not_found";
  const fallback = result.outcome === "fallback";
  return (
    <div className="flex flex-col gap-6">
      {/* h2 per jawaban (tersembunyi kecuali "tidak ditemukan"): urutan judul h1 → h2 → h3 tetap utuh
          (a11y.spec, pola regresi S09). */}
      <Typography.Heading level={2} className={notFound ? "text-base" : "sr-only"}>
        {notFound ? t.notFoundHeading : t.answerHeading}
      </Typography.Heading>
      {fallback ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t.fallback[result.reason ?? ""] ?? t.fallback.unverified}</Alert.Title>
            <Alert.Description>{t.fallbackTail}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : (
        <div className="flex flex-col gap-5">
          <ChatMessage.Content>
            <AnswerText result={result} idPrefix={idPrefix} />
          </ChatMessage.Content>
          <HadithClaims result={result} kutipan={kutipan} idPrefix={idPrefix} />
        </div>
      )}
      {result.citations.length > 0 ? (
        <section aria-labelledby={`judul-kutipan-${idPrefix}`} className="flex flex-col gap-3">
          <Typography.Heading level={3} id={`judul-kutipan-${idPrefix}`} className="text-base">
            {t.sourcesHeading}
          </Typography.Heading>
          <ol className="flex list-none flex-col gap-3 ps-0">
            {result.citations.map((c) => (
              <CitationCard
                key={c.n}
                c={c}
                idPrefix={idPrefix}
                item={kutipan?.get(spanKey(c))}
                readMode={readMode}
              />
            ))}
          </ol>
        </section>
      ) : null}
      <RelatedHits hits={result.search} kutipan={kutipan} idPrefix={idPrefix} />
      {notFound || fallback ? (
        <NextLink
          className="text-accent self-start underline"
          href={`/cari?q=${encodeURIComponent(question)}`}
          prefetch={false}
        >
          {t.searchInstead}
        </NextLink>
      ) : null}
      <div className="flex flex-col gap-1">
        {result.model ? (
          <div className="flex items-center gap-2">
            {/* Segel: orb selesai (bintang delapan diam), tanda tangan jawaban. */}
            <TanyaOrb stage="done" size={20} />
            <Typography type="body-xs" color="muted">
              {t.meta(modelName(result.model), cached)}
            </Typography>
          </div>
        ) : null}
        <AnswerActions question={question} result={result} />
      </div>
    </div>
  );
}
