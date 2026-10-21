"use client";

import type { FormEvent } from "react";

import {
  Alert,
  Button,
  Card,
  Description,
  Label,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import NextLink from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { tanyaText as t } from "../../i18n/tanya";
import type { JawabBlock, JawabResult, JawabStage, JawabStatus } from "../../lib/tanya/model";
import { readSse } from "../../lib/tanya/model";
import { AnswerText, AnswerView } from "./answer-view";
import { STAGE_STEP, STAGE_TOTAL } from "./orb-frames";
import { TanyaOrb } from "./tanya-orb";
import { TurnstileWidget } from "./turnstile-widget";

// Halaman Tanya (S21): status Jawab → komposer → (Turnstile bila server memintanya) → SSE bertahap →
// hasil akhir dari event `done`/`fallback` saja (pratinjau hanya blok yang sitasinya sudah lolos).
// Semua penolakan sebelum stream (mati, anggaran, kuota, batas laju) diarahkan ke Cari.

const QUESTION_MAX = 1000;

type Phase =
  | { kind: "idle" }
  | { kind: "challenge"; sitekey: string }
  | { kind: "asking"; stage: JawabStage | null; preview: JawabBlock[] }
  | { kind: "result"; result: JawabResult; cached: boolean }
  | { kind: "error"; code: string };

/**
 * Status Jawab untuk UI: rute mati (404) = "closed" (UI mengarahkan ke Cari); galat sementara
 * (429/5xx/jaringan) = null (tidak diketahui: komposer tetap aktif, server yang memutuskan).
 */
async function loadStatus(): Promise<JawabStatus | "closed" | null> {
  try {
    const res = await fetch("/api/jawab", { cache: "no-store" });
    if (res.status === 404) return "closed";
    return res.ok ? ((await res.json()) as JawabStatus) : null;
  } catch {
    return null;
  }
}

export function TanyaClient() {
  const [status, setStatus] = useState<JawabStatus | "closed" | null>(null);
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const pending = useRef<string>("");

  const refreshStatus = useCallback(async () => {
    setStatus(await loadStatus());
  }, []);

  useEffect(() => {
    let alive = true;
    void loadStatus().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const ask = useCallback(
    async (q: string, token?: string) => {
      setAsked(q);
      setPhase({ kind: "asking", stage: null, preview: [] });
      let res: Response;
      try {
        res = await fetch("/api/jawab", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            token === undefined ? { question: q } : { question: q, turnstile: token },
          ),
        });
      } catch {
        setPhase({ kind: "error", code: "network" });
        return;
      }
      if (!(res.headers.get("content-type") ?? "").startsWith("text/event-stream")) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; sitekey?: string };
        const code = body.error ?? (res.status === 404 ? "closed" : "internal");
        if (code === "challenge_required" && token === undefined && body.sitekey) {
          pending.current = q;
          setPhase({ kind: "challenge", sitekey: body.sitekey });
          return;
        }
        setPhase({ kind: "error", code: code === "not_found" ? "closed" : code });
        void refreshStatus();
        return;
      }
      let finished = false;
      try {
        await readSse(res.body!, (e) => {
          if (e.event === "stage")
            setPhase((p) => (p.kind === "asking" ? { ...p, stage: e.stage } : p));
          else if (e.event === "block")
            setPhase((p) => (p.kind === "asking" ? { ...p, preview: [...p.preview, e.block] } : p));
          else if (e.event === "reset")
            setPhase((p) => (p.kind === "asking" ? { ...p, preview: [] } : p));
          else if (e.event === "done" || e.event === "fallback") {
            finished = true;
            setPhase({
              kind: "result",
              result: e.result,
              cached: e.event === "done" && e.cached,
            });
          } else if (e.event === "error") {
            finished = true;
            setPhase({ kind: "error", code: "internal" });
          }
        });
      } catch {
        if (!finished) setPhase({ kind: "error", code: "network" });
        return;
      }
      if (!finished) setPhase({ kind: "error", code: "internal" });
      void refreshStatus();
    },
    [refreshStatus],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = question.trim();
    if (q.length < 3 || phase.kind === "asking" || phase.kind === "challenge") return;
    if (status !== null && status !== "closed" && status.challenge && status.sitekey) {
      pending.current = q;
      setAsked(q);
      setPhase({ kind: "challenge", sitekey: status.sitekey });
      return;
    }
    void ask(q);
  }

  const busy = phase.kind === "asking" || phase.kind === "challenge";
  const unavailable =
    status === "closed"
      ? "closed"
      : status !== null && !status.available
        ? (status.reason ?? "disabled")
        : null;
  const cari = (q: string) =>
    q.trim() === "" ? "/cari" : `/cari?q=${encodeURIComponent(q.trim())}`;
  const tooShort = question.trim().length > 0 && question.trim().length < 3;
  // Pengumuman singkat untuk pembaca layar (region selalu ada supaya perubahan terbaca).
  const announce =
    phase.kind === "error"
      ? (t.errors[phase.code] ?? t.errors.internal)
      : phase.kind === "result"
        ? phase.result.outcome === "answer"
          ? t.announceAnswer
          : phase.result.outcome === "not_found"
            ? t.notFoundHeading
            : (t.fallback[phase.result.reason ?? ""] ?? t.fallback.unverified)
        : "";

  return (
    <div className="flex flex-col gap-6">
      <Alert status="default">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t.notice}</Alert.Title>
          <Alert.Description>{t.noticeBody}</Alert.Description>
        </Alert.Content>
      </Alert>

      {unavailable !== null ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t.errors[unavailable] ?? t.errors.closed}</Alert.Title>
            <Alert.Description>
              <NextLink className="text-accent underline" href={cari(question)} prefetch={false}>
                {t.searchInstead}
              </NextLink>
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <Card>
        <Card.Content>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <TextField
              isDisabled={unavailable !== null}
              isRequired
              maxLength={QUESTION_MAX}
              name="question"
              value={question}
              onChange={setQuestion}
            >
              <Label>{t.label}</Label>
              <TextArea rows={3} placeholder={t.placeholder} />
              <Description>
                {t.privacy}{" "}
                <NextLink className="underline" href="/privasi">
                  {t.privacyLink}
                </NextLink>
              </Description>
            </TextField>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {tooShort ? (
                <Typography type="body-xs" color="muted">
                  {t.tooShort}
                </Typography>
              ) : status !== null && status !== "closed" && status.quota !== null ? (
                <Typography type="body-xs" color="muted">
                  {t.quota(status.quota.used, status.quota.limit)}
                </Typography>
              ) : (
                <span />
              )}
              <Button
                type="submit"
                isDisabled={unavailable !== null || question.trim().length < 3}
                isPending={busy}
              >
                {busy ? t.asking : t.submit}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>

      {phase.kind === "challenge" ? (
        <div className="flex flex-col gap-2">
          <Typography type="body-sm" color="muted">
            {t.challenge}
          </Typography>
          <TurnstileWidget
            sitekey={phase.sitekey}
            onToken={(token) => void ask(pending.current, token)}
            onError={() => setPhase({ kind: "error", code: "challenge_unavailable" })}
          />
        </div>
      ) : null}

      {asked !== "" && phase.kind !== "idle" ? (
        <div className="flex flex-col gap-1">
          <Typography type="body-xs" color="muted">
            {t.label}
          </Typography>
          <Typography className="whitespace-pre-line">{asked}</Typography>
        </div>
      ) : null}

      {phase.kind === "asking" ? (
        <div aria-live="polite" className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <TanyaOrb stage={phase.stage ?? "route"} size={44} />
            <div className="flex flex-col">
              <Typography type="body-sm">{t.stages[phase.stage ?? "route"]}</Typography>
              <Typography type="body-xs" color="muted">
                {t.step(STAGE_STEP[phase.stage ?? "route"] ?? 1, STAGE_TOTAL)}
              </Typography>
            </div>
          </div>
          {phase.preview.length > 0 ? (
            <div className="flex flex-col gap-2 opacity-80">
              <Typography type="body-xs" color="muted">
                {t.preview}
              </Typography>
              <AnswerText result={{ blocks: phase.preview }} />
            </div>
          ) : null}
        </div>
      ) : null}

      {phase.kind === "error" ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t.errors[phase.code] ?? t.errors.internal}</Alert.Title>
            <Alert.Description>
              <NextLink className="text-accent underline" href={cari(asked)} prefetch={false}>
                {t.searchInstead}
              </NextLink>
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {phase.kind === "result" ? (
        <AnswerView question={asked} result={phase.result} cached={phase.cached} />
      ) : null}

      <output aria-live="polite" className="sr-only">
        {announce}
      </output>
    </div>
  );
}
