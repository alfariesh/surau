"use client";

import type { SearchPage as ResultPage, SearchView } from "@surau/core";
import type { FormEvent } from "react";

import { Magnifier } from "@gravity-ui/icons";
import { Alert, Button, SearchField, Spinner, Tag, TagGroup } from "@heroui/react";
import { EmptyState, NativeSelect } from "@heroui-pro/react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { SectionOption } from "../../lib/search/sections";

import { id } from "../../i18n/id";
import { selectedSection } from "../../lib/search/sections";
import { parseSection, searchApiUrl, searchPageHref } from "../../lib/search/segments";
import { ArabicInline } from "../arabic";

import { ExampleText } from "./example-text";
import { ResultCard } from "./result-card";

const t = id.search;

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

/** Hasil fetch terakhir beserta kunci permintaannya (kueri + bagian + percobaan). */
type Loaded = { key: string; state: State };

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

const ALL = "semua";

export function SearchClient({ sections }: { sections: SectionOption[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const section = parseSection(params.get("bagian"));
  const { rub, kitab } = selectedSection(sections, section);
  const [input, setInput] = useState(query);
  const [shownQuery, setShownQuery] = useState(query);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${attempt}|${section ?? ""}|${query}`;

  // Kueri di URL berubah (kembali/maju, contoh, palet ⌘K): kolom ikut (disetel saat render).
  if (query !== shownQuery) {
    setShownQuery(query);
    setInput(query);
  }

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
    return () => controller.abort();
  }, [key, query, section]);

  const state: State =
    query === "" ? { status: "idle" } : loaded?.key === key ? loaded.state : { status: "loading" };
  const setState = (next: State) => setLoaded({ key, state: next });

  function go(nextQuery: string, nextSection: number | null) {
    router.push(searchPageHref(nextQuery, nextSection));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go(input, section);
  }

  async function loadMore() {
    if (state.status !== "ok") return;
    const { view, pages } = state;
    setState({ ...state, more: "loading" });
    try {
      const next = await fetchView(query, section, pages.length);
      setState({ status: "ok", view, pages: [...pages, ...next.results], more: "idle" });
    } catch (error) {
      setState({ status: "ok", view, pages, more: codeOf(error) });
    }
  }

  const rubKey = rub === null ? ALL : String(rub.id);

  return (
    <div className="flex flex-col gap-6">
      {/* Tanpa JS: formulir GET biasa ke /cari?q=. */}
      <search>
        <form action="/cari" className="flex flex-col gap-3" method="get" onSubmit={submit}>
          <div className="flex items-end gap-2">
            <SearchField
              fullWidth
              aria-label={t.inputLabel}
              name="q"
              value={input}
              onChange={setInput}
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input dir="auto" maxLength={200} placeholder={t.placeholder} />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <Button type="submit">{t.submit}</Button>
          </div>
          <p className="text-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span>{t.examplesLabel}</span>
            {t.examples.map((ex) => (
              <NextLink key={ex} className="link text-sm" href={searchPageHref(ex, section)}>
                <ExampleText text={ex} />
              </NextLink>
            ))}
          </p>
        </form>
      </search>

      {sections.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-foreground text-sm font-medium" id="filter-bagian">
            {t.filterLabel}
          </span>
          <TagGroup
            disallowEmptySelection
            aria-labelledby="filter-bagian"
            selectedKeys={new Set([rubKey])}
            selectionMode="single"
            onSelectionChange={(keys) => {
              const [key] = keys === "all" ? [] : [...keys];
              const next = key === undefined || key === ALL ? null : Number(key);
              go(query, next);
            }}
          >
            <TagGroup.List>
              <Tag id={ALL}>{t.filterAll}</Tag>
              {sections.map((s) => (
                <Tag key={s.id} id={String(s.id)} textValue={s.title}>
                  <ArabicInline>{s.title}</ArabicInline>
                </Tag>
              ))}
            </TagGroup.List>
          </TagGroup>
          {rub !== null && rub.children.length > 0 ? (
            <div className="flex flex-col gap-1">
              <label className="text-muted text-xs" htmlFor="filter-kitab">
                {t.filterKitab}
              </label>
              <NativeSelect>
                <NativeSelect.Trigger
                  id="filter-kitab"
                  value={String(kitab?.id ?? rub.id)}
                  onChange={(e) => go(query, Number(e.currentTarget.value))}
                >
                  <NativeSelect.Option value={String(rub.id)}>
                    {t.filterKitabAll}
                  </NativeSelect.Option>
                  {rub.children.map((c) => (
                    <NativeSelect.Option key={c.id} value={String(c.id)}>
                      {c.title}
                    </NativeSelect.Option>
                  ))}
                  <NativeSelect.Indicator />
                </NativeSelect.Trigger>
              </NativeSelect>
            </div>
          ) : null}
        </div>
      ) : null}

      <section
        aria-busy={state.status === "loading"}
        aria-live="polite"
        className="flex flex-col gap-4"
      >
        <Results
          query={query}
          state={state}
          onLoadMore={() => void loadMore()}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      </section>
    </div>
  );
}

function Results({
  query,
  state,
  onLoadMore,
  onRetry,
}: {
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
            <Magnifier />
          </EmptyState.Media>
          <EmptyState.Title>{t.idleHeading}</EmptyState.Title>
          <EmptyState.Description>{t.idleBody}</EmptyState.Description>
        </EmptyState.Header>
      </EmptyState>
    );
  }
  if (state.status === "loading") {
    return (
      <p className="text-muted flex items-center gap-2 text-sm">
        <Spinner size="sm" />
        {t.loading}
      </p>
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
        <EmptyState size="sm">
          <EmptyState.Header>
            <EmptyState.Media variant="icon">
              <Magnifier />
            </EmptyState.Media>
            <EmptyState.Title>{t.emptyHeading}</EmptyState.Title>
            <EmptyState.Description>
              <ul className="flex list-disc flex-col gap-1 ps-5 text-start">
                {t.emptyTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      ) : (
        <>
          {view.total_pages !== null && view.total_hits !== null ? (
            <p className="text-muted text-sm">
              {t.summary(view.total_pages, view.total_hits)}
              {view.fusion ? <span className="block text-xs">{t.summaryFused}</span> : null}
            </p>
          ) : null}
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
                <p className="text-danger text-sm">{ERROR_TEXT[more]}</p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
