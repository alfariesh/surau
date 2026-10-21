"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Chip,
  Description,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import { TAKHRIJ_TERM_GLOSS, TAKHRIJ_TERM_KINDS, takhrijStatus } from "@surau/core";
import type { TakhrijReviewInput } from "@surau/core";
import type { TakhrijReviewDecision } from "@surau/db";
import { ArabicInline, ArabicText } from "../arabic";
import { takhrijReviewText as t } from "../../i18n/review-takhrij";
import { highlightPieces } from "../../lib/takhrij-highlight";
import type { QueueFilter, TakhrijQueue, TakhrijReviewItem } from "../../lib/takhrij-queue";
import { Choice } from "./review-client";

// Antrean tinjauan label status hadits (X07). Teks Arab hanya dari `item.text` (text_raw DB) dan
// potongannya lewat rentang istilah; penilai hanya memilih jenis istilah, tidak mengetik teks Arab.

type Kind = (typeof TAKHRIJ_TERM_KINDS)[number];

/** Teks takhrij dengan istilah yang dikenali disorot (potongan DB, bukan teks susunan ulang). */
export function TakhrijHighlight({ item }: { item: Pick<TakhrijReviewItem, "text" | "label"> }) {
  return (
    <ArabicText as="blockquote">
      {highlightPieces(item.text, item.label.terms).map((p, i) =>
        p.term === null ? (
          <span key={i}>{p.text}</span>
        ) : (
          <mark key={i} className="search-mark" title={p.term.gloss}>
            {p.text}
          </mark>
        ),
      )}
    </ArabicText>
  );
}

function ItemView({ item }: { item: TakhrijReviewItem }) {
  const rows = [
    ...new Map(
      item.label.terms.map((term) => {
        const phrase = item.text.slice(term.char_start, term.char_end);
        return [`${phrase}|${term.gloss}`, { phrase, gloss: term.gloss }] as const;
      }),
    ).values(),
  ];
  return (
    <div className="min-w-0 space-y-6">
      <section className="space-y-2">
        <Typography type="body-xs" weight="semibold" className="text-accent tracking-wide">
          {t.footnote} · {item.location.label}
        </Typography>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a
            className="text-accent underline underline-offset-4"
            href={item.location.permalink}
            target="_blank"
            rel="noreferrer"
          >
            {t.openReader}
          </a>
          {item.hadith ? (
            <a
              className="text-accent underline underline-offset-4"
              href={item.hadith.permalink}
              target="_blank"
              rel="noreferrer"
            >
              {t.hadithAt}: {item.hadith.label}
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {item.cites > 0 ? (
            <Chip size="sm" variant="soft">
              {t.cites(item.cites)}
            </Chip>
          ) : null}
          {item.label.mixed ? (
            <Chip size="sm" variant="soft" color="warning">
              {t.mixed}
            </Chip>
          ) : null}
          {item.label.weak ? (
            <Chip size="sm" variant="soft" color="danger">
              {t.weak}
            </Chip>
          ) : null}
          {item.own?.stale ? (
            <Chip size="sm" variant="soft" color="warning">
              {t.staleReview}
            </Chip>
          ) : null}
        </div>
      </section>
      <section className="space-y-2">
        <Typography type="body-xs" color="muted">
          {t.takhrijText}
        </Typography>
        <TakhrijHighlight item={item} />
      </section>
      <section className="border-separator space-y-3 border-t pt-5">
        <Typography.Heading level={3} className="text-base">
          {t.autoLabel}
        </Typography.Heading>
        <Typography>{item.label.text}</Typography>
        <Typography type="body-xs" color="muted">
          {t.terms}
        </Typography>
        {rows.length === 0 ? (
          <Typography type="body-sm" color="muted">
            {t.noTerms}
          </Typography>
        ) : (
          <ul className="flex flex-col gap-1">
            {rows.map((r) => (
              <li key={`${r.phrase}|${r.gloss}`}>
                <Typography type="body-sm">
                  <ArabicInline>{r.phrase}</ArabicInline> — {r.gloss}
                </Typography>
              </li>
            ))}
          </ul>
        )}
        <Typography type="body-xs" color="muted">
          {t.rules(item.rules_version)}
        </Typography>
      </section>
      <section className="border-separator space-y-2 border-t pt-5">
        <Typography type="body-xs" color="muted">
          {t.currentLabel}
        </Typography>
        <div className="flex flex-wrap items-center gap-2">
          <Typography type="body-sm">{item.current.text}</Typography>
          <Chip
            size="sm"
            variant="soft"
            color={item.current.review === "rule" ? "default" : "success"}
          >
            {t.current[item.current.review]}
          </Chip>
        </div>
        {item.current.added.length > 0 ? (
          <Typography type="body-sm" color="muted">
            {t.added}: {item.current.added.map((a) => a.gloss).join("; ")}
          </Typography>
        ) : null}
      </section>
      <section className="border-separator space-y-3 border-t pt-5">
        <Typography.Heading level={3} className="text-base">
          {t.past}
        </Typography.Heading>
        {item.reviews.length === 0 ? (
          <Typography type="body-sm" color="muted">
            {t.noReviews}
          </Typography>
        ) : (
          item.reviews.map((r, i) => (
            <div className="space-y-1" key={i}>
              <Typography type="body-sm" weight="medium">
                {r.reviewer_name} · {t.decisions[r.decision]}
                {r.stale ? ` (${t.pastStale})` : ""}
              </Typography>
              {r.kinds ? (
                <Typography type="body-sm">
                  {r.kinds.map((k) => TAKHRIJ_TERM_GLOSS[k as Kind] ?? k).join("; ")}
                </Typography>
              ) : null}
              {r.note ? <Typography type="body-sm">{r.note}</Typography> : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function DecisionForm({
  item,
  name,
  onName,
  onSaved,
}: {
  item: TakhrijReviewItem;
  name: string;
  onName: (name: string) => void;
  onSaved: () => void;
}) {
  const detected = [...new Set(item.label.terms.map((x) => x.kind))] as Kind[];
  const own = item.own !== null && !item.own.stale ? item.own : null;
  const [decision, setDecision] = useState<TakhrijReviewDecision | "">(own?.decision ?? "");
  const [kinds, setKinds] = useState<string[]>(own?.kinds ?? detected);
  const [note, setNote] = useState(own?.note ?? "");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const preview = takhrijStatus([
    ...detected.filter((k) => kinds.includes(k)),
    ...TAKHRIJ_TERM_KINDS.filter((k) => kinds.includes(k) && !detected.includes(k)),
  ]).text;
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (decision === "") return;
        setPending(true);
        setStatus("");
        const input: TakhrijReviewInput = {
          passage_id: item.passage_id,
          rules_version: item.rules_version,
          label_hash: item.label_hash,
          reviewer_name: name,
          decision,
          kinds: decision === "corrected" ? (kinds as Kind[]) : null,
          note,
        };
        try {
          const response = await fetch("/api/review/takhrij", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          if (response.status === 409) {
            setStatus(t.stale);
            return;
          }
          if (!response.ok) throw new Error("save_failed");
          setStatus(t.saved);
          onSaved();
        } catch {
          setStatus(t.saveFailed);
        } finally {
          setPending(false);
        }
      }}
    >
      <TextField isRequired value={name} onChange={onName} maxLength={80} variant="secondary">
        <Label>{t.reviewer}</Label>
        <Input />
        <Description>{t.reviewerHint}</Description>
      </TextField>
      <RadioGroup
        isRequired
        value={decision}
        onChange={(v) => setDecision(v as TakhrijReviewDecision)}
        name="decision"
        variant="secondary"
      >
        <Label>{t.decision}</Label>
        {(["approved", "corrected", "unsure"] as const).map((d) => (
          <Radio key={d} value={d}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t.decisions[d]}
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
      {decision === "corrected" ? (
        <div className="space-y-3">
          <CheckboxGroup value={kinds} onChange={setKinds} name="kinds" variant="secondary">
            <Label>{t.kinds}</Label>
            <Description>{t.kindsHint}</Description>
            {TAKHRIJ_TERM_KINDS.map((k) => (
              <Checkbox key={k} value={k}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  {detected.includes(k)
                    ? `${TAKHRIJ_TERM_GLOSS[k]} (${t.detected})`
                    : TAKHRIJ_TERM_GLOSS[k]}
                </Checkbox.Content>
              </Checkbox>
            ))}
          </CheckboxGroup>
          <div className="bg-surface-secondary space-y-1 rounded-xl p-3">
            <Typography type="body-xs" color="muted">
              {t.preview}
            </Typography>
            <Typography type="body-sm">{preview}</Typography>
          </div>
        </div>
      ) : null}
      <TextField value={note} onChange={setNote} maxLength={2000} variant="secondary">
        <Label>{t.note}</Label>
        <TextArea rows={3} />
        <Description>{t.noteHint}</Description>
      </TextField>
      <Button type="submit" isPending={pending} isDisabled={decision === "" || name.trim() === ""}>
        {t.save}
      </Button>
      <output className="block text-sm">{status}</output>
    </form>
  );
}

export function TakhrijReviewClient({ initial }: { initial: TakhrijQueue }) {
  const [queue, setQueue] = useState(initial);
  const [selected, setSelected] = useState(initial.items[0]?.passage_id ?? 0);
  const [item, setItem] = useState<TakhrijReviewItem | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  // Dinaikkan setiap daftar dimuat ulang: butir terpilih yang sama tetap diambil ulang.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    void fetch(`/api/review/takhrij?id=${selected}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("load_failed");
        return r.json() as Promise<TakhrijReviewItem>;
      })
      .then((data) => {
        setItem(data);
        if (data.own) setName((n) => (n === "" ? data.own!.reviewer_name : n));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t.failed);
      });
    return () => controller.abort();
  }, [selected, version]);
  const load = async (filter: QueueFilter, offset: number, keepIndex = 0) => {
    setError("");
    try {
      const response = await fetch(`/api/review/takhrij?filter=${filter}&offset=${offset}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("load_failed");
      const data = (await response.json()) as TakhrijQueue;
      setQueue(data);
      const nextItem = data.items[Math.min(keepIndex, data.items.length - 1)];
      setItem(null);
      setSelected(nextItem?.passage_id ?? 0);
      setVersion((v) => v + 1);
    } catch {
      setError(t.failed);
    }
  };
  const total = queue.counts.todo + queue.counts.unsure + queue.counts.done;
  return (
    <div className="space-y-8">
      <details className="bg-surface border-border rounded-2xl border p-4">
        <summary className="cursor-pointer text-sm font-medium">{t.howTitle}</summary>
        <ul className="mt-3 list-disc space-y-2 ps-5">
          {t.how.map((line) => (
            <li key={line}>
              <Typography type="body-sm">{line}</Typography>
            </li>
          ))}
        </ul>
      </details>
      <Typography type="body-sm" color="muted">
        {t.progress(queue.counts.done, total)}
      </Typography>
      <div className="grid gap-4 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
        <Choice
          label={t.filter}
          value={queue.filter}
          onChange={(f) => void load(f as QueueFilter, 0)}
          options={(["todo", "unsure", "done"] as const).map(
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
          }}
          options={queue.items.map(
            (i) => [String(i.passage_id), t.itemOption(i.location, i.cites, i.mixed)] as const,
          )}
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            isDisabled={queue.offset === 0}
            onPress={() => void load(queue.filter, Math.max(0, queue.offset - 20))}
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
      {error && <Typography role="alert">{error}</Typography>}
      {!selected && <Typography>{t.empty}</Typography>}
      {selected && !item && !error ? <output>{t.loading}</output> : null}
      {item && (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <ItemView item={item} />
          <aside className="bg-surface border-border space-y-5 rounded-2xl border p-5">
            <DecisionForm
              key={`${item.passage_id}:${item.label_hash}`}
              item={item}
              name={name}
              onName={setName}
              onSaved={() => {
                const index = queue.items.findIndex((i) => i.passage_id === item.passage_id);
                void load(queue.filter, queue.offset, Math.max(0, index));
              }}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
