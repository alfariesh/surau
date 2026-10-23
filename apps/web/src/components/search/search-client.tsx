"use client";

import type { SearchPage as ResultPage, SearchView } from "@surau/core";

import { AiChat02, Search01 } from "../../icons";
import { Alert, Button, Spinner, Typography } from "@heroui/react";
import { EmptyState } from "@heroui-pro/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { Keyed } from "../../lib/search/keyed";
import type { SectionOption } from "../../lib/search/sections";
import type { SourceWork } from "./source-picker";

import { search as searchText } from "../../i18n/id/search";
import { keepCurrent } from "../../lib/search/keyed";
import { parseSection, searchApiUrl, searchPageHref } from "../../lib/search/segments";
import { tanyaText } from "../../i18n/tanya";
import { handOffQuestion } from "../../lib/tanya/handoff";
import { jawabUnavailable, loadJawabStatus } from "../../lib/tanya/status";

import { ExampleText } from "./example-text";
import { ResultCard } from "./result-card";
import { SearchBox } from "./search-box";

const t = searchText;

/** Halaman cetak per permintaan API. */
const PAGE_LIMIT = 20;

type ErrorCode = "rate" | "unavailable" | "invalid" | "generic";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; code: ErrorCode }
  | {
      status: "ok";
      view: SearchView;
      pages: ResultPage[];
      more: "idle" | "loading" | ErrorCode;
    };

type Loaded = Keyed<State>;

class SearchError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}

async function fetchView(
  query: string,
  section: number | null,
  offset: number,
  signal?: AbortSignal,
): Promise<SearchView> {
  const res = await fetch(searchApiUrl(query, section, offset, PAGE_LIMIT), {
    signal,
    headers: { accept: "application/json" },
  });
  if (res.status === 429) throw new SearchError("rate");
  if (res.status === 503) throw new SearchError("unavailable");
  if (res.status === 400) throw new SearchError("invalid");
  if (!res.ok) throw new SearchError("generic");
  return (await res.json()) as SearchView;
}

const codeOf = (error: unknown): ErrorCode =>
  error instanceof SearchError ? error.code : "generic";

const ERROR_TEXT: Record<ErrorCode, string> = {
  rate: t.errorRate,
  unavailable: t.errorUnavailable,
  invalid: t.errorInvalid,
  generic: t.errorGeneric,
};

export function SearchClient({
  sections,
  works,
  ask,
}: {
  sections: SectionOption[];
  works: readonly SourceWork[];
  ask: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const section = parseSection(params.get("bagian"));
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const moreController = useRef<AbortController | null>(null);
  const key = `${attempt}|${section ?? ""}|${query}`;

  useEffect(() => {
    if (query === "") return;
    const controller = new AbortController();
    fetchView(query, section, 0, controller.signal).then(
      (view) =>
        setLoaded({ key, state: { status: "ok", view, pages: view.results, more: "idle" } }),
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setLoaded({ key, state: { status: "error", code: codeOf(error) } });
        }
      },
    );
    return () => {
      controller.abort();
      // "Muat lebih banyak" milik kueri lama ikut dibatalkan (#60).
      moreController.current?.abort();
    };
  }, [key, query, section]);
  const state: State =
    query === "" ? { status: "idle" } : loaded?.key === key ? loaded.state : { status: "loading" };
  const setState = (next: State) => setLoaded((prev) => keepCurrent(prev, { key, state: next }));

  function go(nextQuery: string, nextSection: number | null) {
    router.push(searchPageHref(nextQuery, nextSection));
  }

  async function loadMore() {
    if (state.status !== "ok") return;
    const { view, pages } = state;
    setState({ ...state, more: "loading" });
    const controller = new AbortController();
    moreController.current = controller;
    try {
      const next = await fetchView(query, section, pages.length, controller.signal);
      setState({ status: "ok", view, pages: [...pages, ...next.results], more: "idle" });
    } catch (error) {
      if (!controller.signal.aborted) setState({ status: "ok", view, pages, more: codeOf(error) });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SearchBox
        ask={ask}
        query={query}
        section={section}
        sections={sections}
        works={works}
        onSectionChange={(next) => go(query, next)}
      />

      {/* Pembaca layar hanya diberi tahu ringkasan (memuat / N halaman / tidak ada hasil / galat),
          bukan seluruh isi kartu setiap kali hasil berubah. */}
      <output className="sr-only">{statusText(state)}</output>
      <section aria-busy={state.status === "loading"} className="flex flex-col gap-4">
        <Typography.Heading level={2} className="text-base sr-only">
          {t.resultsHeading}
        </Typography.Heading>
        <Results
          ask={ask}
          query={query}
          state={state}
          onLoadMore={() => void loadMore()}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      </section>
    </div>
  );
}

function statusText(state: State): string {
  if (state.status === "loading") return t.loading;
  if (state.status === "error") return ERROR_TEXT[state.code];
  if (state.status !== "ok") return "";
  const { view, pages } = state;
  if (pages.length === 0) return t.emptyHeading;
  return view.total_pages !== null && view.total_hits !== null
    ? t.summary(view.total_pages, view.total_hits)
    : t.shownPages(pages.length);
}

function Results({
  ask,
  query,
  state,
  onLoadMore,
  onRetry,
}: {
  ask: boolean;
  query: string;
  state: State;
  onLoadMore: () => void;
  onRetry: () => void;
}) {
  if (state.status === "idle") {
    return (
      <EmptyState size="sm">
        <EmptyState.Header>
          <EmptyState.Media variant="icon">
            <Search01 />
          </EmptyState.Media>
          <EmptyState.Title>{t.idleHeading}</EmptyState.Title>
          <EmptyState.Description>{t.idleBody}</EmptyState.Description>
        </EmptyState.Header>
      </EmptyState>
    );
  }
  if (state.status === "loading") {
    return (
      <Typography type="body-sm" color="muted" className="flex items-center gap-2">
        <Spinner size="sm" />
        {t.loading}
      </Typography>
    );
  }
  if (state.status === "error") {
    return (
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{ERROR_TEXT[state.code]}</Alert.Title>
        </Alert.Content>
        <Button size="sm" variant="secondary" onPress={onRetry}>
          {t.retry}
        </Button>
      </Alert>
    );
  }
  const { view, pages, more } = state;
  const warning =
    view.warning === "common_terms"
      ? t.commonTerms
      : view.warning === "common_terms_ignored"
        ? t.commonTermsIgnored
        : null;
  const hasMore = view.ranked && view.total_pages !== null && pages.length < view.total_pages;
  return (
    <>
      {warning ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{warning}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      {pages.length === 0 ? (
        <>
          <EmptyState size="sm">
            <EmptyState.Header>
              <EmptyState.Media variant="icon">
                <Search01 />
              </EmptyState.Media>
              <EmptyState.Title>{t.emptyHeading}</EmptyState.Title>
            </EmptyState.Header>
            {/* Daftar di Content, bukan di Description (<p>): <ul> di dalam <p> = galat hidrasi. */}
            <EmptyState.Content>
              <ul className="flex list-disc flex-col gap-1 ps-5 text-start">
                {t.emptyTips.map((tip) => (
                  <li key={tip}>
                    <Typography color="muted" type="body-sm">
                      {tip}
                    </Typography>
                  </li>
                ))}
              </ul>
            </EmptyState.Content>
          </EmptyState>
          {ask ? <AskMaknaz query={query} /> : null}
        </>
      ) : (
        <>
          {view.total_pages !== null && view.total_hits !== null ? (
            <Typography type="body-sm" color="muted">
              {t.summary(view.total_pages, view.total_hits)}
              {view.fusion ? <span className="block text-xs">{t.summaryFused}</span> : null}
            </Typography>
          ) : null}
          {ask ? <AskMaknaz query={query} /> : null}
          <ol aria-label={t.heading} className="flex list-none flex-col gap-4 p-0">
            {pages.map((page) => (
              <ResultCard key={page.citation.permalink} page={page} query={query} />
            ))}
          </ol>
          {hasMore ? (
            <div className="flex flex-col items-center gap-2">
              <Button isPending={more === "loading"} variant="secondary" onPress={onLoadMore}>
                {t.loadMore}
              </Button>
              {more !== "idle" && more !== "loading" ? (
                <Typography type="body-sm" className="text-danger">
                  {ERROR_TEXT[more]}
                </Typography>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

/**
 * Jembatan Cari → Maknaz (ADR-087): kata yang sama dikirim sebagai pertanyaan lewat titipan memori
 * tab (sama dengan kotak Beranda, tanpa `?q=`). Status Jawab dimuat dulu saat ditekan: Maknaz mati
 * atau kuota habis = pesan di tempat; tantangan Turnstile = /tanya membuka tantangan dulu.
 */
function AskMaknaz({ query }: { query: string }) {
  const router = useRouter();
  // Halaman Maknaz diunduh dulu: titipan kedaluwarsa 10 dtk, navigasi dingin jangan sampai lewat.
  useEffect(() => {
    router.prefetch("/tanya");
  }, [router]);
  const [loading, setLoading] = useState(false);
  // Alasan Maknaz tidak bisa dipakai (pesan di tempat), atau null.
  const [blocked, setBlocked] = useState<string | null>(null);
  async function ask() {
    setLoading(true);
    const status = await loadJawabStatus();
    const unavailable = jawabUnavailable(status);
    if (unavailable !== null) {
      setLoading(false);
      setBlocked(tanyaText.errors[unavailable] ?? tanyaText.errors.closed ?? null);
      return;
    }
    const sitekey =
      status && status !== "closed" && status.challenge && status.sitekey ? status.sitekey : null;
    handOffQuestion(t.askQuestion(query), sitekey);
    router.push("/tanya");
  }
  return (
    <div className="bg-surface-secondary flex flex-col items-start gap-2 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between">
      <Typography color="muted" type="body-sm">
        {t.askHint}
      </Typography>
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <Button
          className="shrink-0"
          isPending={loading}
          size="sm"
          variant="secondary"
          onPress={() => void ask()}
        >
          <AiChat02 aria-hidden="true" className="size-4" />
          {t.askBefore}{" "}
          <bdi>
            “<ExampleText text={query} />”
          </bdi>{" "}
          {t.askAfter}
        </Button>
        {blocked !== null ? (
          <Typography color="muted" type="body-xs">
            {blocked}
          </Typography>
        ) : null}
      </div>
    </div>
  );
}
