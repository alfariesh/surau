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
import NextLink from "next/link";
import { useEffect, useState } from "react";

import { tanyaText as t } from "../../i18n/tanya";
import type { KutipanItem } from "../../lib/kutipan-handler";
import type { JawabCitation, JawabResult, JawabSearchHit } from "../../lib/tanya/model";
import { displayText, kutipanQuery, spanKey } from "../../lib/tanya/model";
import { ArabicText } from "../arabic";

// Tampilan hasil Jawab (S21). Teks Indonesia dari model tampil sebagai teks biasa per blok: blok
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

export function AnswerText({ result }: { result: Pick<JawabResult, "blocks"> }) {
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
                    href={`#kutipan-${n}`}
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

function CitationCard({ c, item }: { c: JawabCitation; item: KutipanItem | null | undefined }) {
  return (
    <li id={`kutipan-${c.n}`} className="scroll-mt-24">
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
            <details className="flex flex-col gap-1">
              <summary className="text-muted cursor-pointer text-sm">{t.translationAi}</summary>
              <Typography type="body-sm">{item.translation.text}</Typography>
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

function HadithClaims({ result, kutipan }: { result: JawabResult; kutipan: Kutipan | null }) {
  if (result.hadith.length === 0) return null;
  const citeOf = (f: JawabResult["hadith"][number]["footnote"]) =>
    result.citations.find(
      (c) =>
        c.passage_id === f.passage_id && c.char_start === f.char_start && c.char_end === f.char_end,
    );
  return (
    <section aria-labelledby="judul-hadits" className="flex flex-col gap-2">
      <Typography.Heading level={3} id="judul-hadits" className="text-base">
        {t.hadithHeading}
      </Typography.Heading>
      <ul className="flex flex-col gap-4">
        {result.hadith.map((h, i) => {
          const c = citeOf(h.footnote);
          // Tanda kelemahan HANYA dari teks takhrij DB (`weak` dari /api/kutipan), bukan dari
          // pencocokan kata pada ringkasan AI (bisa menandai hadits sahih, peninjau S21).
          const item = kutipan?.get(spanKey(h.footnote));
          return (
            <li key={i} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Typography type="body-sm">{h.status}</Typography>
                <Chip size="sm" variant="soft">
                  {t.hadithAi}
                </Chip>
                {item?.weak ? (
                  <Chip size="sm" variant="soft" color="danger">
                    {t.takhrijWeak}
                  </Chip>
                ) : null}
              </div>
              {item === undefined ? null : item === null ? (
                <Typography type="body-sm" color="muted">
                  {t.quoteMissing}
                </Typography>
              ) : (
                <div className="flex flex-col gap-1">
                  <Typography type="body-xs" color="muted">
                    {t.takhrijText}
                  </Typography>
                  <ArabicText as="blockquote">{item.text}</ArabicText>
                </div>
              )}
              {c ? (
                <a className="text-accent text-sm underline" href={`#kutipan-${c.n}`}>
                  {t.hadithSource} [{c.n}]
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
}: {
  hits: readonly JawabSearchHit[];
  kutipan: Kutipan | null;
}) {
  if (hits.length === 0) return null;
  return (
    <section aria-labelledby="judul-terkait" className="flex flex-col gap-3">
      <Typography.Heading level={2} id="judul-terkait" className="text-lg">
        {t.relatedHeading}
      </Typography.Heading>
      <ul className="flex flex-col gap-3">
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
function ReportForm({ question, result }: { question: string; result: JawabResult }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
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
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }
  if (state === "sent")
    return (
      <Alert status="success">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t.reportThanks}</Alert.Title>
        </Alert.Content>
      </Alert>
    );
  if (!open)
    return (
      <Button className="self-start" size="sm" variant="tertiary" onPress={() => setOpen(true)}>
        {t.report}
      </Button>
    );
  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
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
        <Button size="sm" variant="secondary" onPress={() => setOpen(false)}>
          {t.reportCancel}
        </Button>
      </div>
    </form>
  );
}

const MODEL_NAMES: Record<string, string> = {
  "claude-haiku-5-5": "Claude Haiku 5.5",
  "claude-sonnet-5-5": "Claude Sonnet 5.5",
};

export function AnswerView({
  question,
  result,
  cached,
}: {
  question: string;
  result: JawabResult;
  cached: boolean;
}) {
  const footSpans = result.hadith.map((h) => h.footnote);
  // Takhrij klaim didahulukan supaya selalu termuat walau kueri dibatasi 20 rentang.
  const kutipan = useKutipan([...footSpans, ...result.citations, ...result.search]);
  const cari = `/cari?q=${encodeURIComponent(question)}`;
  const notFound = result.outcome === "not_found";
  const fallback = result.outcome === "fallback";
  return (
    <div className="flex flex-col gap-6">
      {fallback ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t.fallback[result.reason ?? ""] ?? t.fallback.unverified}</Alert.Title>
            <Alert.Description>{t.fallbackTail}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : (
        <Card>
          <Card.Header>
            {/* h2 (bukan Card.Title = h3): urutan judul h1 → h2 (a11y.spec, pola regresi S09). */}
            <Typography.Heading level={2} className="text-lg">
              {notFound ? t.notFoundHeading : t.answerHeading}
            </Typography.Heading>
            {result.model ? (
              <Card.Description>
                {t.meta(MODEL_NAMES[result.model] ?? result.model, cached)}
              </Card.Description>
            ) : null}
          </Card.Header>
          <Card.Content className="flex flex-col gap-5">
            <AnswerText result={result} />
            <HadithClaims result={result} kutipan={kutipan} />
            <ReportForm question={question} result={result} />
          </Card.Content>
        </Card>
      )}
      {result.citations.length > 0 ? (
        <section aria-labelledby="judul-kutipan" className="flex flex-col gap-3">
          <Typography.Heading level={2} id="judul-kutipan" className="text-lg">
            {t.sourcesHeading}
          </Typography.Heading>
          <ol className="flex flex-col gap-3">
            {result.citations.map((c) => (
              <CitationCard key={c.n} c={c} item={kutipan?.get(spanKey(c))} />
            ))}
          </ol>
        </section>
      ) : null}
      <RelatedHits hits={result.search} kutipan={kutipan} />
      {notFound || fallback ? (
        <NextLink className="text-accent self-start underline" href={cari} prefetch={false}>
          {t.searchInstead}
        </NextLink>
      ) : null}
    </div>
  );
}
