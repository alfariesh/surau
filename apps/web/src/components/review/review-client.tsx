"use client";

import { useEffect, useId, useState } from "react";
import { Button, Description, Input, Label, TextArea, TextField } from "@heroui/react";
import { NativeSelect } from "@heroui-pro/react";
import type { ReviewInput } from "@surau/db";
import type { EvalSource } from "@surau/core";
import { ArabicText } from "../arabic/arabic-text";
import { reviewText as t } from "../../i18n/review";
import type { ReviewItem } from "../../lib/review-data";

export interface ReviewSummary {
  id: string;
  question_id: string;
  run_id: string;
  created_at: string;
}

function Choice({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect className="w-full">
        <NativeSelect.Trigger
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map(([key, name]) => (
            <NativeSelect.Option value={key} key={key}>
              {name}
            </NativeSelect.Option>
          ))}
          <NativeSelect.Indicator />
        </NativeSelect.Trigger>
      </NativeSelect>
    </div>
  );
}

function Sources({ items }: { items: EvalSource[] }) {
  return (
    <div className="space-y-5">
      {items.map((s, i) => (
        <figure key={`${s.pointer.passage_id}-${i}`} className="border-separator border-s-2 ps-4">
          <ArabicText as="blockquote">{s.text}</ArabicText>
          <figcaption className="text-muted mt-2 text-xs leading-relaxed">
            <a
              className="text-accent underline underline-offset-4"
              href={s.citation.permalink}
              target="_blank"
              rel="noreferrer"
            >
              {s.citation.label} · {t.sourceLink}
            </a>
            <p>
              {s.citation.source.license} · {s.citation.source.attribution}
            </p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function ReviewForm({ item, onSaved }: { item: ReviewItem; onSaved: () => void }) {
  const [name, setName] = useState(item.ownReview?.reviewer_name ?? "");
  const [approval, setApproval] = useState<string>(item.ownReview?.question_verdict ?? "");
  const [verdict, setVerdict] = useState<string>(item.ownReview?.verdict ?? "");
  const [language, setLanguage] = useState(String(item.ownReview?.language_score ?? ""));
  const [faithfulness, setFaithfulness] = useState(String(item.ownReview?.faithfulness ?? ""));
  const [attribution, setAttribution] = useState(String(item.ownReview?.attribution ?? ""));
  const [reason, setReason] = useState(item.ownReview?.reason ?? "");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setStatus("");
        const input: ReviewInput = {
          answer_id: item.id,
          answer_hash: item.answerHash,
          reviewer_name: name,
          question_verdict: (approval || null) as ReviewInput["question_verdict"],
          verdict: (verdict || null) as ReviewInput["verdict"],
          language_score: verdict && language ? Number(language) : null,
          faithfulness: verdict && faithfulness ? (Number(faithfulness) as 0 | 1) : null,
          attribution: verdict && attribution ? (Number(attribution) as 0 | 1) : null,
          reason,
        };
        try {
          const response = await fetch("/api/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
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
      <TextField isRequired value={name} onChange={setName} maxLength={80}>
        <Label>{t.reviewer}</Label>
        <Input />
        <Description>{t.reviewerHint}</Description>
      </TextField>
      <Choice
        label={t.approval}
        value={approval}
        onChange={setApproval}
        options={Object.entries(t.approvals)}
      />
      <Choice
        label={t.verdict}
        value={verdict}
        onChange={setVerdict}
        options={Object.entries(t.verdicts)}
      />
      <Choice
        label={t.language}
        value={language}
        onChange={setLanguage}
        disabled={!verdict}
        options={[["", t.unscored], ...t.scores.map((s, i) => [String(i + 1), s] as const)]}
      />
      <Choice
        label={t.faithfulness}
        value={faithfulness}
        onChange={setFaithfulness}
        disabled={!verdict}
        options={Object.entries(t.binary)}
      />
      <Choice
        label={t.attribution}
        value={attribution}
        onChange={setAttribution}
        disabled={!verdict}
        options={Object.entries(t.binary)}
      />
      <TextField isRequired value={reason} onChange={setReason} maxLength={2000}>
        <Label>{t.reason}</Label>
        <TextArea rows={4} />
        <Description>{t.reasonHint}</Description>
      </TextField>
      <Button
        type="submit"
        isPending={pending}
        isDisabled={item.stale || (!approval && !verdict) || (!!verdict && !language)}
      >
        {t.save}
      </Button>
      <output className="text-sm">{status}</output>
    </form>
  );
}

export function ReviewClient({ initialItems }: { initialItems: ReviewSummary[] }) {
  const [items, setItems] = useState(initialItems);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(initialItems[0]?.id ?? "");
  const [item, setItem] = useState<ReviewItem | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    void fetch(`/api/review?id=${encodeURIComponent(selected)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("load_failed");
        return r.json() as Promise<ReviewItem>;
      })
      .then(setItem)
      .catch(() => {
        if (!controller.signal.aborted) setError(t.failed);
      });
    return () => controller.abort();
  }, [selected, version]);
  const page = async (next: number) => {
    setError("");
    try {
      const response = await fetch(`/api/review?offset=${next}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load_failed");
      const data = (await response.json()) as { items: ReviewSummary[] };
      setItems(data.items);
      setOffset(next);
      setSelected(data.items[0]?.id ?? "");
      setItem(null);
    } catch {
      setError(t.failed);
    }
  };
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Choice
          label={t.list}
          value={selected}
          onChange={(id) => {
            setSelected(id);
            setItem(null);
            setError("");
          }}
          options={items.map((i) => [i.id, `${i.question_id} · ${i.run_id}`])}
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            isDisabled={offset === 0}
            onPress={() => void page(Math.max(0, offset - 50))}
          >
            {t.previous}
          </Button>
          <Button
            variant="secondary"
            isDisabled={items.length < 50}
            onPress={() => void page(offset + 50)}
          >
            {t.next}
          </Button>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {!selected && <p>{t.empty}</p>}
      {selected && !item && !error && <output>{t.loading}</output>}
      {item && (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-8">
            <section className="space-y-3">
              <p className="text-accent text-xs font-semibold tracking-wide">
                {item.private ? t.private : t.draft} · {item.question.jenis}
              </p>
              <h2 className="text-xl font-semibold">{item.question.pertanyaan}</h2>
              <p className="text-muted text-xs">
                {item.corpusVersion} ·{" "}
                {item.answer.model === "agent-draft" ? t.example : t.modes[item.answer.mode]}
              </p>
            </section>
            <section className="space-y-4">
              <h3 className="font-semibold">{t.answer}</h3>
              {item.answer.model === "agent-draft" && (
                <p className="text-muted text-sm">{t.exampleHint}</p>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">
                {item.answer.text || t.noAnswer}
              </p>
              {item.invalidCitations > 0 && (
                <p role="alert" className="text-danger">
                  {t.invalid}
                </p>
              )}
              <Sources items={item.citations} />
            </section>
            <section className="border-separator space-y-3 border-t pt-6">
              <h3 className="font-semibold">{t.key}</h3>
              <ul className="list-disc space-y-2 ps-5">
                {item.question.poin_kunci.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
              <p className="text-muted text-sm">{item.question.catatan}</p>
            </section>
            <section className="space-y-4">
              <h3 className="font-semibold">{t.sources}</h3>
              <Sources items={item.sources} />
            </section>
            <section className="border-separator space-y-3 border-t pt-6">
              <h3 className="font-semibold">{t.past}</h3>
              {item.reviews.length ? (
                item.reviews.map((r, i) => (
                  <div className="text-sm" key={i}>
                    <p className="font-medium">
                      {r.reviewer_name} ·{" "}
                      {r.verdict ?? (r.question_verdict && t.approvals[r.question_verdict])}
                    </p>
                    <p>{r.reason}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted text-sm">{t.noReviews}</p>
              )}
            </section>
          </div>
          <aside className="bg-surface border-border space-y-5 rounded-2xl border p-5">
            <p className="text-muted text-sm leading-relaxed">{t.rubric}</p>
            {item.stale && (
              <p role="alert" className="text-danger text-sm">
                {t.stale}
              </p>
            )}
            <ReviewForm key={item.id} item={item} onSaved={() => setVersion((v) => v + 1)} />
          </aside>
        </div>
      )}
      <footer className="border-separator text-muted space-y-2 border-t pt-6 text-xs leading-relaxed">
        <a href={`/api/review/export?offset=${offset}`} className="text-accent underline">
          {t.export}
        </a>
        <p>{t.exportHint}</p>
        <p>{t.retention}</p>
      </footer>
    </div>
  );
}
