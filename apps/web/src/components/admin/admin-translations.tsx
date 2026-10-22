"use client";

import { useState } from "react";
import { Button, Card, Chip, Input, Label, TextField, Typography } from "@heroui/react";
import { adminText } from "../../i18n/admin";
import type { AdminTranslationOverview, BulkRevertResult } from "../../lib/translation-review";
import { Choice } from "../review/review-client";

// /admin · koreksi terjemahan terbaru (X08, ADR-081): pengganti persetujuan kedua. Pemilik memeriksa
// sekilas (nama editor, alasan, diff kata) dan bisa membatalkan sebelum korpus berikutnya dibangun.
// Diff hanya teks Indonesia; teks Arab tidak ditampilkan di sini.

const t = adminText.translations;
const API = "/api/admin/terjemahan";
const time = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export function AdminTranslations({
  initial,
  today,
}: {
  initial: AdminTranslationOverview;
  /** Tanggal UTC hari ini (YYYY-MM-DD), dihitung di server. */
  today: string;
}) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [author, setAuthor] = useState(initial.authors[0]?.author_key ?? "");
  const [since, setSince] = useState(today);
  // Langkah konfirmasi: Batalkan hanya mundur, jadi salah tekan tidak bisa diulang otomatis.
  const [confirming, setConfirming] = useState<number | "bulk" | null>(null);

  async function post(body: unknown, done: (json: unknown) => string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as {
        overview: AdminTranslationOverview;
        result?: BulkRevertResult;
      };
      setData(json.overview);
      setMessage(done(json));
    } catch {
      setMessage(adminText.failed);
    } finally {
      setBusy(false);
    }
  }

  async function more() {
    if (data.next_before === null) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}?before=${data.next_before}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const next = (await res.json()) as AdminTranslationOverview;
      setData((d) => ({ ...next, recent: [...d.recent, ...next.recent] }));
    } catch {
      setMessage(adminText.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title>{t.heading}</Card.Title>
        <Card.Description>{t.intro}</Card.Description>
      </Card.Header>
      <Card.Content className="space-y-5">
        {message ? (
          <output className="block">
            <Typography type="body-sm" color="muted">
              {message}
            </Typography>
          </output>
        ) : null}
        {data.recent.length === 0 ? (
          <Typography type="body-sm" color="muted">
            {t.empty}
          </Typography>
        ) : (
          <ul className="space-y-5">
            {data.recent.map((r) => (
              <li key={r.id} className="border-separator space-y-2 border-b pb-4 last:border-b-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip
                    size="sm"
                    variant="soft"
                    color={r.kind === "revised" ? "accent" : "default"}
                  >
                    {t.kinds[r.kind]}
                  </Chip>
                  <Typography type="body-sm" weight="medium">
                    {r.author}
                  </Typography>
                  <Typography type="body-xs" color="muted">
                    {r.location} · {time.format(new Date(r.created_at))}
                  </Typography>
                </div>
                {r.kind === "reverted" ? (
                  <Typography type="body-sm" color="muted">
                    {r.restores === null ? t.restoresAi : t.restores(r.restores)}
                  </Typography>
                ) : null}
                {r.reason ? <Typography type="body-sm">{r.reason}</Typography> : null}
                {r.kind === "revised" ? (
                  r.diff === null ? (
                    <Typography type="body-xs" color="muted">
                      {t.tooLong}
                    </Typography>
                  ) : (
                    <Typography type="body-sm" className="whitespace-pre-line">
                      {r.diff.map((p, i) =>
                        p.op === "same" ? (
                          <span key={i}>{p.text}</span>
                        ) : p.op === "del" ? (
                          <del key={i} className="text-danger">
                            {p.text}
                          </del>
                        ) : (
                          <ins key={i} className="text-success">
                            {p.text}
                          </ins>
                        ),
                      )}
                    </Typography>
                  )
                ) : null}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {r.permalink ? (
                    <a
                      className="text-accent underline underline-offset-4"
                      href={r.permalink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.open}
                    </a>
                  ) : null}
                  {r.active && confirming !== r.id ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={busy}
                      onPress={() => setConfirming(r.id)}
                    >
                      {t.revert}
                    </Button>
                  ) : null}
                  {r.active && confirming === r.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="danger"
                        isDisabled={busy}
                        onPress={() => {
                          setConfirming(null);
                          void post({ action: "revert", id: r.id }, () => t.reverted);
                        }}
                      >
                        {t.confirmRevert}
                      </Button>
                      <Button size="sm" variant="tertiary" onPress={() => setConfirming(null)}>
                        {t.cancel}
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {data.next_before !== null ? (
          <Button variant="tertiary" isDisabled={busy} onPress={() => void more()}>
            {t.more}
          </Button>
        ) : null}
        {data.authors.length > 0 ? (
          <form
            className="border-separator space-y-3 border-t pt-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (author === "" || since === "") return;
              if (confirming !== "bulk") {
                setConfirming("bulk");
                return;
              }
              setConfirming(null);
              void post({ action: "revert_author", author_key: author, since }, (json) => {
                const r = (json as { result?: BulkRevertResult }).result;
                return r === undefined
                  ? adminText.saved
                  : t.bulkResult(r.reverted, r.skipped, r.remaining);
              });
            }}
          >
            <Typography.Heading level={3} className="text-base">
              {t.bulkHeading}
            </Typography.Heading>
            <Typography type="body-sm" color="muted">
              {t.bulkHint}
            </Typography>
            <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
              <Choice
                label={t.bulkEditor}
                value={author}
                onChange={setAuthor}
                options={data.authors.map(
                  (a) => [a.author_key, `${a.author_name} · ${t.count(a.n)}`] as const,
                )}
              />
              <TextField value={since} onChange={setSince} type="date" variant="secondary">
                <Label>{t.bulkSince}</Label>
                <Input />
              </TextField>
              <Button type="submit" variant="danger" isDisabled={busy || author === ""}>
                {confirming === "bulk"
                  ? t.confirmBulk(
                      data.authors.find((a) => a.author_key === author)?.author_name ?? "",
                      since,
                    )
                  : t.bulkRun}
              </Button>
            </div>
          </form>
        ) : null}
      </Card.Content>
    </Card>
  );
}
