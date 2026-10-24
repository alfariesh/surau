"use client";

import { useRef, useState, type ComponentType, type ReactNode } from "react";

import { Segment, Widget } from "@heroui-pro/react";
import { Chip, Typography } from "@heroui/react";
import NextLink from "next/link";

import type { DemoPassage, HeroQuote } from "../../lib/landing-data";

import { ArabicText } from "../arabic";
import {
  AiChat02,
  AiChat02Duotone,
  BookOpen01,
  BookOpen01Duotone,
  Search01,
  SearchList02,
  SearchList02Duotone,
} from "../../icons";
import { landingDemo as t } from "../../i18n/id/landing";
import { tanyaText } from "../../i18n/tanya";
import { TanyaOrb } from "../tanya/tanya-orb";
import type { OrbState } from "../tanya/orb-frames";

import { useStory, useTyped } from "./use-story";

// Widget "Coba Surau" (ADR-096), berbentuk sama dengan widget cari Beranda (`SearchBox`): kepala
// berisi petunjuk contoh di kiri dan Segment berikon di kanan (ikon duotone untuk pilihan aktif, seperti
// menu aktif sidebar), lalu panggung simulasi di dalam widget. Simulasi tidak memanggil API apa pun.
// Teks Arab (kutipan, potongan hasil, paragraf) dan terjemahan AI berlabel berasal dari DB lewat props
// server; yang ditulis di i18n hanya pertanyaan contoh dan kalimat jawaban beratribusi yang merangkum
// terjemahan paragraf yang dikutip.
type DemoId = "tanya" | "cari" | "baca";

const ICONS: Record<
  DemoId,
  { on: ComponentType<{ className?: string }>; off: ComponentType<{ className?: string }> }
> = {
  tanya: { on: AiChat02Duotone, off: AiChat02 },
  cari: { on: SearchList02Duotone, off: SearchList02 },
  baca: { on: BookOpen01Duotone, off: BookOpen01 },
};

export function DemoShowcase({
  quote,
  read,
  results,
  query,
}: {
  quote: HeroQuote | null;
  read: DemoPassage | null;
  results: readonly DemoPassage[];
  query: string;
}) {
  const demos = [
    quote ? { id: "tanya" as const, panel: <MaknazSim quote={quote} /> } : null,
    results.length > 0
      ? { id: "cari" as const, panel: <SearchSim query={query} results={results} /> }
      : null,
    read ? { id: "baca" as const, panel: <ReadSim read={read} /> } : null,
  ].filter((x) => x !== null);
  const [picked, setPicked] = useState<DemoId | null>(null);
  const current = demos.find((d) => d.id === picked) ?? demos[0];
  if (!current) return null;
  return (
    // Radius luar = radius panggung (16px) + jarak ke tepi widget (6px), seperti widget cari.
    <Widget className="w-full rounded-[calc(1rem+0.375rem)] text-start shadow-none">
      <Widget.Header className="flex-nowrap justify-center px-1.5 py-1.5">
        {demos.length > 1 ? (
          <Segment
            aria-label={t.tabsLabel}
            className="w-full bg-transparent [--segment:var(--default)] [&_.segment\_\_indicator]:shadow-none"
            selectedKey={current.id}
            size="sm"
            onSelectionChange={(key) => {
              const next = demos.find((d) => d.id === key);
              if (next) setPicked(next.id);
            }}
          >
            {demos.map((d) => {
              const Icon = d.id === current.id ? ICONS[d.id].on : ICONS[d.id].off;
              return (
                <Segment.Item key={d.id} className="flex-1 justify-center" id={d.id}>
                  <Icon aria-hidden="true" className="size-4" />
                  {t.tabs[d.id]}
                </Segment.Item>
              );
            })}
          </Segment>
        ) : null}
      </Widget.Header>
      <div className="mx-1.5 mb-1.5">{current.panel}</div>
    </Widget>
  );
}

/** Tinggi tetap yang sama untuk ketiga panggung, supaya widget tidak melompat saat Segment diganti. */
const STAGE_H = "h-[35rem] sm:h-[34rem]";

/** Panggung bergradien tempat simulasi berjalan (berulang sendiri selama terlihat). */
function Stage({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "gold" }) {
  return (
    <div
      className={`${tone === "gold" ? "landing-gradient-gold" : "landing-gradient"} relative flex ${STAGE_H} items-center justify-center overflow-hidden rounded-2xl px-3 py-4 sm:px-10 sm:py-8`}
    >
      {children}
    </div>
  );
}

const ASK_STEPS = [300, 1300, 900, 900, 1000, 900] as const;
const ASK_ORB: readonly OrbState[] = [
  "rest",
  "rest",
  "route",
  "retrieve",
  "answer",
  "verify",
  "done",
];

function MaknazSim({ quote }: { quote: HeroQuote }) {
  const ref = useRef<HTMLDivElement>(null);
  const { step } = useStory(ref, ASK_STEPS);
  const last = ASK_STEPS.length;
  const typed = useTyped(t.question, step >= 1, step >= 2);
  const orb = ASK_ORB[step] ?? "done";
  const stage = step >= 2 && step < last ? tanyaText.stages[orb] : null;
  return (
    <div ref={ref}>
      <Stage>
        <div aria-live="polite" className="flex w-full max-w-xl flex-col gap-4">
          <div className="flex justify-end">
            {typed ? (
              <div className="bg-background/60 text-foreground max-w-[90%] rounded-3xl rounded-br-md px-4 py-3 sm:max-w-[85%]">
                <Typography className="text-sm sm:text-base">{typed}</Typography>
              </div>
            ) : null}
          </div>
          {step >= 2 ? (
            // Ponsel: orb + label di baris sendiri, jawaban dan kutipan selebar panggung.
            // Layar lebar: orb di kiri jawaban, seperti percakapan di /tanya.
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center sm:size-12">
                  <TanyaOrb size={36} stage={orb} />
                </span>
                <Typography className="text-foreground/80 sm:hidden" type="body-sm">
                  {stage ?? t.answerBy}
                </Typography>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {stage ? (
                  <Typography className="text-foreground/80 hidden pt-3 sm:block" type="body-sm">
                    {stage}
                  </Typography>
                ) : (
                  <>
                    <div className="bg-background/60 rounded-3xl rounded-tl-md px-4 py-3">
                      <Typography className="text-sm sm:text-base">
                        {t.answer(quote.label)}{" "}
                        <a className="text-accent font-semibold" href="#landing-kutipan-1">
                          [1]
                        </a>
                      </Typography>
                    </div>
                    <div
                      className="bg-background/60 flex flex-col gap-2 rounded-2xl p-3 sm:p-4"
                      id="landing-kutipan-1"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip size="sm" variant="soft">
                          [1]
                        </Chip>
                        <Typography className="font-medium" type="body-sm">
                          {quote.label}
                        </Typography>
                      </div>
                      <ArabicText as="blockquote">{quote.text}</ArabicText>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Chip color="success" size="sm" variant="soft">
                          {t.done}
                        </Chip>
                        <NextLink className="link text-sm" href={quote.permalink}>
                          {t.openPage}
                        </NextLink>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Stage>
    </div>
  );
}

const SEARCH_STEPS = [300, 900, 400, 400] as const;

/** Sorot kata yang dicari di potongan terjemahan (tanpa regex dari input pengguna: kata tetap). */
function highlight(text: string, word: string): ReactNode {
  const lower = text.toLowerCase();
  const out: ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(word);
  while (at !== -1) {
    out.push(
      text.slice(from, at),
      <mark key={at} className="search-mark">
        {text.slice(at, at + word.length)}
      </mark>,
    );
    from = at + word.length;
    at = lower.indexOf(word, from);
  }
  out.push(text.slice(from));
  return out;
}

function SearchSim({ query, results }: { query: string; results: readonly DemoPassage[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { step } = useStory(ref, SEARCH_STEPS);
  const typed = useTyped(query, step >= 1, step >= 2, 700);
  const shown = Math.max(0, step - 2);
  return (
    <div ref={ref}>
      <Stage tone="gold">
        <div className="flex w-full max-w-2xl flex-col gap-3">
          <div
            aria-hidden="true"
            className="bg-background/60 flex items-center gap-3 rounded-full px-5 py-3"
          >
            <Search01 className="text-muted size-5 shrink-0" />
            <span className="text-foreground min-h-6 flex-1">{typed}</span>
          </div>
          {shown > 0 ? (
            <Typography className="text-foreground/80 px-2" type="body-xs">
              {t.resultsCount(results.length)}
            </Typography>
          ) : null}
          <ul className="flex flex-col gap-2">
            {results.slice(0, shown).map((r) => (
              <li key={r.permalink}>
                <NextLink
                  className="bg-background/60 hover:bg-background/80 focus-visible:ring-focus flex flex-col gap-2 rounded-2xl p-3 outline-none focus-visible:ring-2 sm:p-4"
                  href={r.permalink}
                >
                  <span className="text-accent text-xs font-medium sm:text-sm">{r.label}</span>
                  <span className="flex items-baseline gap-1">
                    <ArabicText as="div" className="line-clamp-1">
                      {r.arabic}
                    </ArabicText>
                  </span>
                  {r.translation ? (
                    <span
                      className="text-muted flex flex-col gap-1 text-sm"
                      lang={r.translation.lang}
                    >
                      <span className="line-clamp-2">{highlight(r.translation.text, query)}</span>
                      <span className="text-xs">{r.translation.badge}</span>
                    </span>
                  ) : null}
                </NextLink>
              </li>
            ))}
          </ul>
        </div>
      </Stage>
    </div>
  );
}

type Mode = "ar" | "both" | "tr";

function ReadSim({ read }: { read: DemoPassage }) {
  const [mode, setMode] = useState<Mode>("both");
  const modes: Mode[] = read.translation ? ["ar", "both", "tr"] : ["ar"];
  return (
    <div
      className={`landing-gradient relative flex ${STAGE_H} items-center justify-center overflow-hidden rounded-2xl px-3 py-4 sm:px-10 sm:py-10`}
    >
      <div className="bg-background/60 w-full max-w-2xl rounded-3xl p-4 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Typography className="text-accent font-medium" type="body-sm">
            {read.label}
          </Typography>
          <Segment
            aria-label={t.readModesLabel}
            selectedKey={mode}
            size="sm"
            onSelectionChange={(key) => {
              const next = modes.find((m) => m === key);
              if (next) setMode(next);
            }}
          >
            {modes.map((m) => (
              <Segment.Item key={m} id={m}>
                {t.readModes[m]}
              </Segment.Item>
            ))}
          </Segment>
        </div>
        {/* Paragraf utuh dari DB, hanya dipotong tampilannya (line-clamp), jadi Arab dan terjemahan sepadan. */}
        <div className="mt-5 flex flex-col gap-4">
          {mode !== "tr" ? (
            <ArabicText className={mode === "ar" ? "line-clamp-6" : "line-clamp-3"}>
              {read.arabic}
            </ArabicText>
          ) : null}
          {mode !== "ar" && read.translation ? (
            <div className="flex flex-col gap-1">
              <Chip className="self-start" size="sm" variant="soft">
                {read.translation.badge}
              </Chip>
              <Typography
                className={`text-sm sm:text-base ${mode === "tr" ? "line-clamp-8" : "line-clamp-3"}`}
                lang={read.translation.lang}
              >
                {read.translation.text}
              </Typography>
            </div>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <Typography color="muted" type="body-xs">
            {t.readNote}
          </Typography>
          <NextLink className="link text-sm" href={read.permalink}>
            {t.openPage}
          </NextLink>
        </div>
      </div>
    </div>
  );
}
