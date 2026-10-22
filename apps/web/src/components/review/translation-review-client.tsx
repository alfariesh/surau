"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Chip,
  Description,
  Input,
  Label,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import { validateTranslationText } from "@surau/core";
import type { TranslationIssue, TranslationRevisionInput } from "@surau/core";
import { ArabicText } from "../arabic";
import { translationReviewText as t } from "../../i18n/review-terjemahan";
import type {
  TrItem,
  TrQueue,
  TrQueueFilter,
  TrSaveResult,
  TrStateView,
} from "../../lib/translation-review";
import { Choice } from "./review-client";
import { TranslationPreview } from "./translation-preview";

// Koreksi terjemahan (X08, ADR-081). Teks Arab hanya dari `item.arabic` (text_raw DB) dan tidak bisa
// diubah. Editor menulis teks Indonesia; pemeriksaan di sini hanya membantu (server memeriksa ulang
// terhadap teks Arab yang sama dan menolak yang tidak lolos).

const FILTERS = ["todo", "done", "stale"] as const satisfies readonly TrQueueFilter[];
const API = "/api/review/terjemahan";
const normalize = (text: string) => text.replaceAll(/\r\n?/gu, "\n").trim();
const issueText = (i: TranslationIssue) => t.issues[i.code](i.detail);
const dateId = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

function stateLabel(s: TrStateView): string {
  if (s.kind === "ai") return t.state.ai;
  if (s.kind === "corpus") return t.state.corpus;
  const by = s.by?.full ?? "";
  return s.kind === "confirmed" ? t.state.confirmed(by) : t.state.revised(by);
}

function IssueList({ issues, tone }: { issues: TranslationIssue[]; tone: "danger" | "warning" }) {
  if (issues.length === 0) return null;
  return (
    <ul
      className={`list-disc space-y-1 ps-5 ${tone === "danger" ? "text-danger" : "text-warning"}`}
    >
      {issues.map((i, n) => (
        <li key={`${i.code}-${n}`}>
          <Typography type="body-sm" className="text-inherit">
            {issueText(i)}
          </Typography>
        </li>
      ))}
    </ul>
  );
}

type Mode = "confirm" | "revise" | "revert" | null;

function DecisionPanel({ item, onSaved }: { item: TrItem; onSaved: (message: string) => void }) {
  const [mode, setMode] = useState<Mode>(null);
  const [text, setText] = useState(item.state.text);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ message: string; issues: TranslationIssue[] } | null>(
    null,
  );
  const revised = normalize(text);
  const live =
    mode === "revise"
      ? validateTranslationText(revised, {
          arabic: item.arabic,
          ayahRefs: item.ayah_refs,
          footnoteRefs: item.footnote_refs,
          base: item.state.text,
        })
      : null;
  const unchanged = revised === item.state.text;

  async function submit(action: NonNullable<Mode>) {
    setPending(true);
    setStatus(null);
    const target = {
      passage_id: item.passage_id,
      base_sha256: item.base_sha256,
      active_id: item.active_id,
      reason: reason.trim(),
    };
    const input: TranslationRevisionInput =
      action === "revise" ? { action, ...target, text: revised } : { action, ...target };
    try {
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (response.ok) {
        onSaved(t.saved);
        return;
      }
      const body = (await response.json().catch(() => ({}))) as Partial<
        Extract<TrSaveResult, { ok: false }>
      >;
      const message =
        body.error === "conflict"
          ? t.conflict
          : body.error === "limit"
            ? t.limit
            : body.error === "unchanged"
              ? t.unchanged
              : body.error === "not_allowed"
                ? t.notAllowed
                : body.error === "invalid_text"
                  ? t.invalidText
                  : t.saveFailed;
      setStatus({ message, issues: body.issues ?? [] });
    } catch {
      setStatus({ message: t.saveFailed, issues: [] });
    } finally {
      setPending(false);
    }
  }

  const passage = {
    arabic: item.arabic,
    ayah_refs: item.ayah_refs,
    footnote_refs: item.footnote_refs,
  };
  return (
    <section className="border-separator space-y-4 border-t pt-5" aria-label={t.actions}>
      <Typography.Heading level={3} className="text-base">
        {t.actions}
      </Typography.Heading>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={mode === "confirm" ? "primary" : "secondary"}
          isDisabled={!item.can_confirm}
          onPress={() => setMode("confirm")}
        >
          {t.confirm}
        </Button>
        <Button
          variant={mode === "revise" ? "primary" : "secondary"}
          onPress={() => setMode("revise")}
        >
          {t.revise}
        </Button>
        {item.can_revert ? (
          <Button
            variant={mode === "revert" ? "primary" : "secondary"}
            onPress={() => setMode("revert")}
          >
            {t.revert}
          </Button>
        ) : null}
      </div>
      {!item.can_confirm ? (
        <Typography type="body-xs" color="muted">
          {t.confirmDisabled}
        </Typography>
      ) : null}

      {mode === "revise" ? (
        <div className="space-y-4">
          <TextField value={text} onChange={setText} maxLength={8000} variant="secondary">
            <Label>{t.textLabel}</Label>
            <TextArea rows={10} className="font-sans" />
            <Description>{t.textHint}</Description>
          </TextField>
          {live ? (
            <div className="space-y-2" aria-live="polite">
              <IssueList issues={live.errors} tone="danger" />
              <IssueList issues={live.warnings} tone="warning" />
            </div>
          ) : null}
          <div className="bg-surface-secondary space-y-2 rounded-xl p-3">
            <Typography type="body-xs" color="muted">
              {t.preview}
            </Typography>
            <TranslationPreview text={revised} passage={passage} quran={item.quran} />
          </div>
        </div>
      ) : null}

      {mode === "revert" && item.revert_to ? (
        <div className="space-y-2">
          <Typography type="body-sm">
            {t.revertTo(item.revert_to.kind === "ai" ? t.targetAi : stateLabel(item.revert_to))}
          </Typography>
          <div className="bg-surface-secondary rounded-xl p-3">
            <TranslationPreview text={item.revert_to.text} passage={passage} quran={item.quran} />
          </div>
        </div>
      ) : null}

      {mode !== null ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(mode);
          }}
        >
          <TextField
            value={reason}
            onChange={setReason}
            maxLength={500}
            isRequired={mode === "revise"}
            variant="secondary"
          >
            <Label>{mode === "revise" ? t.reason : t.note}</Label>
            <Input />
            <Description>{mode === "revise" ? t.reasonHint : t.noteHint}</Description>
          </TextField>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              isPending={pending}
              isDisabled={mode === "revise" && (!live?.ok || unchanged || reason.trim() === "")}
            >
              {mode === "revise" ? t.saveRevise : mode === "confirm" ? t.saveConfirm : t.saveRevert}
            </Button>
            <Button variant="tertiary" onPress={() => setMode(null)}>
              {t.cancel}
            </Button>
          </div>
          {mode === "revise" && unchanged ? (
            <Typography type="body-xs" color="muted">
              {t.unchanged}
            </Typography>
          ) : null}
        </form>
      ) : null}
      {status ? (
        <div role="alert" className="space-y-2">
          <Typography type="body-sm">{status.message}</Typography>
          <IssueList issues={status.issues} tone="danger" />
        </div>
      ) : null}
    </section>
  );
}

function ItemView({ item, onSaved }: { item: TrItem; onSaved: (message: string) => void }) {
  const passage = {
    arabic: item.arabic,
    ayah_refs: item.ayah_refs,
    footnote_refs: item.footnote_refs,
  };
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Typography type="body-xs" weight="semibold" className="text-accent tracking-wide">
            {item.location.label} · {item.anchor}
          </Typography>
          <a
            className="text-accent text-sm underline underline-offset-4"
            href={item.location.permalink}
            target="_blank"
            rel="noreferrer"
          >
            {t.openReader}
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip size="sm" variant="soft" color={item.state.kind === "ai" ? "default" : "success"}>
            {stateLabel(item.state)}
          </Chip>
          {item.reports > 0 ? (
            <Chip size="sm" variant="soft" color="danger">
              {t.reported(item.reports)}
            </Chip>
          ) : null}
          {item.cites > 0 ? (
            <Chip size="sm" variant="soft">
              {t.cited(item.cites)}
            </Chip>
          ) : null}
        </div>
        {item.state.stale ? (
          <Typography type="body-sm" className="text-warning" role="note">
            {t.stale[item.state.stale]}
          </Typography>
        ) : null}
        {item.state.kind === "confirmed" || item.state.kind === "revised" ? (
          <Typography type="body-xs" color="muted">
            {t.notLive}
          </Typography>
        ) : null}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="space-y-2 lg:order-2">
          <Typography type="body-xs" color="muted">
            {t.arabic}
          </Typography>
          <ArabicText as="blockquote">{item.arabic}</ArabicText>
        </section>
        <section className="space-y-3 lg:order-1">
          <Typography type="body-xs" color="muted">
            {t.current}
          </Typography>
          <TranslationPreview text={item.state.text} passage={passage} quran={item.quran} />
          <Typography type="body-xs" color="muted">
            {t.aiMeta(item.ai.model, item.ai.prompt_version, dateId(item.ai.created_at))}
          </Typography>
          <div className="space-y-1">
            <Typography type="body-xs" color="muted">
              {t.check}
            </Typography>
            {item.check.errors.length + item.check.warnings.length === 0 ? (
              <Typography type="body-sm">{t.checkOk}</Typography>
            ) : (
              <>
                <IssueList issues={item.check.errors} tone="danger" />
                <IssueList issues={item.check.warnings} tone="warning" />
              </>
            )}
          </div>
        </section>
      </div>

      <DecisionPanel key={`${item.passage_id}:${item.base_sha256}`} item={item} onSaved={onSaved} />

      <section className="border-separator space-y-3 border-t pt-5">
        <Typography.Heading level={3} className="text-base">
          {t.history}
        </Typography.Heading>
        {item.history.length === 0 ? (
          <Typography type="body-sm" color="muted">
            {t.noHistory}
          </Typography>
        ) : (
          <ol className="space-y-4">
            {item.history.map((r) => (
              <li key={r.id} className="space-y-1">
                <Typography type="body-sm" weight="medium">
                  #{r.id} · {t.kinds[r.kind]} · {r.author} · {dateId(r.created_at)} ·{" "}
                  {t.statuses[r.status]}
                </Typography>
                {r.kind === "reverted" ? (
                  <Typography type="body-sm" color="muted">
                    {t.restores(r.restores_id)}
                  </Typography>
                ) : null}
                {r.reason ? <Typography type="body-sm">{r.reason}</Typography> : null}
                {r.text ? (
                  <details>
                    <summary className="cursor-pointer text-sm">{t.textLabel}</summary>
                    <div className="mt-2">
                      <TranslationPreview text={r.text} passage={passage} quran={item.quran} />
                    </div>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export function TranslationReviewClient({ initial }: { initial: TrQueue }) {
  const [queue, setQueue] = useState(initial);
  const [selected, setSelected] = useState(initial.items[0]?.passage_id ?? 0);
  const [item, setItem] = useState<TrItem | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ref, setRef] = useState("");
  // Butir dibuka lewat tautan (bisa di luar halaman daftar ini).
  const [opened, setOpened] = useState<{ id: number; label: string } | null>(null);
  // Dinaikkan setiap daftar dimuat ulang: butir terpilih yang sama tetap diambil ulang.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    void fetch(`${API}?id=${selected}`, { signal: controller.signal, cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404) throw new Error("not_found");
        if (!r.ok) throw new Error("load_failed");
        return r.json() as Promise<TrItem>;
      })
      .then(setItem)
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error && e.message === "not_found" ? t.notFound : t.failed);
      });
    return () => controller.abort();
  }, [selected, version]);

  const load = async (filter: TrQueueFilter, offset: number, keepIndex = 0): Promise<void> => {
    setError("");
    try {
      const response = await fetch(`${API}?filter=${filter}&offset=${offset}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("load_failed");
      const data = (await response.json()) as TrQueue;
      // Butir terakhir halaman ini baru saja keluar dari daftar: mundur satu halaman.
      if (data.items.length === 0 && offset > 0)
        return load(filter, Math.max(0, offset - data.page), data.page - 1);
      setQueue(data);
      setOpened(null);
      setItem(null);
      setSelected(data.items[Math.min(keepIndex, data.items.length - 1)]?.passage_id ?? 0);
      setVersion((v) => v + 1);
    } catch {
      setError(t.failed);
    }
  };

  // Hitungan + daftar halaman ini diperbarui tanpa mengganti butir yang sedang dibuka.
  const refreshQueue = async () => {
    try {
      const response = await fetch(`${API}?filter=${queue.filter}&offset=${queue.offset}`, {
        cache: "no-store",
      });
      if (response.ok) setQueue((await response.json()) as TrQueue);
    } catch {
      // Hitungan lama tetap tampil; butir sudah tersimpan.
    }
  };

  const openRef = async () => {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API}?ref=${encodeURIComponent(ref.trim())}`, {
        cache: "no-store",
      });
      if (response.status === 400) {
        setError(t.openInvalid);
        return;
      }
      if (response.status === 404) {
        setError(t.notFound);
        return;
      }
      if (!response.ok) throw new Error("load_failed");
      const data = (await response.json()) as TrItem;
      setOpened({ id: data.passage_id, label: data.short_location });
      setItem(data);
      setSelected(data.passage_id);
    } catch {
      setError(t.failed);
    }
  };

  const total = queue.counts.todo + queue.counts.done + queue.counts.stale;
  const options = [
    ...(opened !== null && !queue.items.some((i) => i.passage_id === opened.id)
      ? [[String(opened.id), opened.label] as const]
      : []),
    ...queue.items.map(
      (i) =>
        [
          String(i.passage_id),
          t.itemOption(
            i.location,
            i.reasons.map((r) => t.reasons[r]),
            i.by,
          ),
        ] as const,
    ),
  ];
  return (
    <div className="space-y-8">
      <details className="bg-surface border-border rounded-2xl border p-4">
        <summary className="cursor-pointer">
          <Typography type="body-sm" weight="medium" className="inline">
            {t.howTitle}
          </Typography>
        </summary>
        <ul className="mt-3 list-disc space-y-2 ps-5">
          {t.how.map((line) => (
            <li key={line}>
              <Typography type="body-sm">{line}</Typography>
            </li>
          ))}
        </ul>
      </details>
      <div className="space-y-1">
        <Typography type="body-sm" color="muted">
          {t.progress(queue.counts.done, total)}
        </Typography>
        <Typography type="body-sm" color="muted">
          {t.daily(queue.daily.used, queue.daily.limit)}
        </Typography>
      </div>
      <div className="grid gap-4 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
        <Choice
          label={t.filter}
          value={queue.filter}
          onChange={(f) => void load(f as TrQueueFilter, 0)}
          options={FILTERS.map(
            (f) => [f, `${t.filters[f]} (${queue.counts[f].toLocaleString("id-ID")})`] as const,
          )}
        />
        <Choice
          label={t.list}
          value={String(selected)}
          onChange={(id) => {
            setSelected(Number(id));
            setItem(null);
            setError("");
            setNotice("");
          }}
          options={options}
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            isDisabled={queue.offset === 0}
            onPress={() => void load(queue.filter, Math.max(0, queue.offset - queue.page))}
          >
            {t.previous}
          </Button>
          <Button
            variant="secondary"
            isDisabled={queue.next === null}
            onPress={() => queue.next !== null && void load(queue.filter, queue.next)}
          >
            {t.next}
          </Button>
        </div>
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (ref.trim() !== "") void openRef();
        }}
      >
        <TextField value={ref} onChange={setRef} maxLength={300} className="flex-1">
          <Label>{t.openLabel}</Label>
          <Input />
          <Description>{t.openHint}</Description>
        </TextField>
        <Button type="submit" variant="secondary" isDisabled={ref.trim() === ""}>
          {t.open}
        </Button>
      </form>
      {error && <Typography role="alert">{error}</Typography>}
      {notice ? (
        <output className="block">
          <Typography type="body-sm">{notice}</Typography>
        </output>
      ) : null}
      {!selected && !error ? <Typography>{t.empty}</Typography> : null}
      {selected && !item && !error ? <output>{t.loading}</output> : null}
      {item ? (
        <div className="bg-surface border-border rounded-2xl border p-5">
          <ItemView
            item={item}
            onSaved={(message) => {
              setNotice(message);
              if (opened !== null && opened.id === item.passage_id) {
                setItem(null);
                setVersion((v) => v + 1);
                void refreshQueue();
                return;
              }
              const index = queue.items.findIndex((i) => i.passage_id === item.passage_id);
              void load(queue.filter, queue.offset, Math.max(0, index));
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Akun Access sah yang belum terdaftar: tampilkan kode akun untuk dikirim ke pemilik. */
export function TranslationNotRegistered({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="bg-surface border-border space-y-4 rounded-2xl border p-5">
      <Typography.Heading level={2} className="text-lg">
        {t.notRegisteredTitle}
      </Typography.Heading>
      <Typography>{t.notRegisteredBody}</Typography>
      <div className="space-y-2">
        <Typography type="body-xs" color="muted">
          {t.code}
        </Typography>
        <code className="bg-surface-secondary block rounded-xl p-3 text-sm break-all">{code}</code>
      </div>
      <Button
        variant="secondary"
        onPress={() => {
          void navigator.clipboard
            .writeText(code)
            .then(() => setCopied(true))
            .catch(() => setCopied(false));
        }}
      >
        {t.copy}
      </Button>
      {copied ? <output className="block text-sm">{t.copied}</output> : null}
    </section>
  );
}
