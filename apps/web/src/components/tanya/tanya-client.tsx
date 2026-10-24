"use client";

import { Alert, Button, Typography } from "@heroui/react";
import { ChatMessage, PromptInput, TextShimmer, Widget } from "@heroui-pro/react";
import NextLink from "next/link";
import { useCallback, useEffect, useRef, useState, ViewTransition } from "react";
import { flushSync } from "react-dom";

import { tanyaText as t } from "../../i18n/tanya";
import { Book02, PlusSign } from "../../icons";
import type { JawabBlock, JawabResult, JawabStage, JawabStatus } from "../../lib/tanya/model";
import {
  HANDOFF_TRANSITION,
  HANDOFF_TRANSITION_CLASS,
  peekHandOff,
  takeHandOff,
} from "../../lib/tanya/handoff";
import { readSse } from "../../lib/tanya/model";
import { jawabUnavailable, loadJawabStatus } from "../../lib/tanya/status";
import { PageLead, PageTitle } from "../page-title";
import { useHeaderMenuReadMode } from "../shell/header-menu";

import { AnswerText, AnswerView } from "./answer-view";
import { STAGE_STEP, STAGE_TOTAL } from "./orb-frames";
import { MaknazNotice } from "./maknaz-notice";
import { TanyaInfo } from "./tanya-info";
import { TanyaOrb } from "./tanya-orb";
import { TurnstileWidget } from "./turnstile-widget";

// Halaman Tanya sebagai percakapan (ADR-073): setiap pertanyaan = satu giliran (gelembung penanya +
// balasan Surau). Alur per giliran tetap S21: status Jawab → (Turnstile bila server memintanya) → SSE
// bertahap → hasil akhir dari event `done`/`fallback` saja (pratinjau hanya blok yang sitasinya sudah
// lolos). Setiap pertanyaan dijawab TERPISAH (API tidak menerima riwayat), dan itu dikatakan di UI.
// Riwayat hanya di memori tab: tidak disimpan di perangkat maupun server. Penolakan sebelum stream
// (mati, anggaran, kuota, batas laju) diarahkan ke Cari.

const QUESTION_MAX = 1000;

type Phase =
  | { kind: "challenge"; sitekey: string }
  | { kind: "asking"; stage: JawabStage | null; preview: JawabBlock[] }
  | { kind: "result"; result: JawabResult; cached: boolean }
  | { kind: "error"; code: string };

interface Turn {
  id: number;
  question: string;
  phase: Phase;
}

const cari = (q: string) => (q.trim() === "" ? "/cari" : `/cari?q=${encodeURIComponent(q.trim())}`);

function SearchInstead({ question }: { question: string }) {
  return (
    <NextLink className="text-accent underline" href={cari(question)} prefetch={false}>
      {t.searchInstead}
    </NextLink>
  );
}

/** Balasan Surau untuk satu giliran: pemeriksaan keamanan, tahap berjalan, galat, atau hasil. */
// Nama transisi tampilan bersama: hilal di keadaan kosong dan orb balasan pertama, supaya bulan
// "terbang" dari tengah ke posisinya di percakapan (View Transitions; tanpa dukungan = langsung).
const ORB_TRANSITION = "tanya-orb";

function Reply({
  turn,
  first,
  onToken,
  onChallengeError,
}: {
  turn: Turn;
  first: boolean;
  onToken: (token: string) => void;
  onChallengeError: () => void;
}) {
  const { phase } = turn;
  return (
    <ChatMessage.Assistant>
      <ChatMessage.Body className="min-w-0 max-sm:pe-0">
        {phase.kind === "challenge" ? (
          <div className="flex flex-col gap-2">
            <Typography type="body-sm" color="muted">
              {t.challenge}
            </Typography>
            <TurnstileWidget sitekey={phase.sitekey} onToken={onToken} onError={onChallengeError} />
          </div>
        ) : phase.kind === "asking" ? (
          <div className="flex flex-col gap-4">
            <div aria-live="polite" className="flex items-center gap-3">
              <span
                className="shrink-0"
                style={first ? { viewTransitionName: ORB_TRANSITION } : undefined}
              >
                <TanyaOrb
                  stage={phase.stage ?? "route"}
                  size={44}
                  enterFrom={first ? "rest" : undefined}
                />
              </span>
              <div className="flex flex-col">
                <Typography type="body-sm">
                  <TextShimmer className="tanya-stage">
                    {t.stages[phase.stage ?? "route"]}
                  </TextShimmer>
                </Typography>
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
                <AnswerText result={{ blocks: phase.preview }} idPrefix={`g${turn.id}-`} />
              </div>
            ) : null}
          </div>
        ) : phase.kind === "error" ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{t.errors[phase.code] ?? t.errors.internal}</Alert.Title>
              <Alert.Description>
                <SearchInstead question={turn.question} />
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : (
          <AnswerView
            question={turn.question}
            result={phase.result}
            cached={phase.cached}
            idPrefix={`g${turn.id}-`}
          />
        )}
      </ChatMessage.Body>
    </ChatMessage.Assistant>
  );
}

/** Gelembung penanya: aksen Zaitun, sudut kanan bawah 2px (ekor ke arah penanya). */
function QuestionBubble({ question, handedOff }: { question: string; handedOff: boolean }) {
  const bubble = (
    <ChatMessage.Bubble className="bg-accent text-accent-foreground rounded-br-[2px]">
      <ChatMessage.Content>
        <Typography className="text-accent-foreground whitespace-pre-line">{question}</Typography>
      </ChatMessage.Content>
    </ChatMessage.Bubble>
  );
  // Pertanyaan titipan Beranda: pasangan transisi kotak cari (kotak "menjadi" gelembung ini).
  return handedOff ? (
    <ViewTransition default="none" name={HANDOFF_TRANSITION} share={HANDOFF_TRANSITION_CLASS}>
      {bubble}
    </ViewTransition>
  ) : (
    bubble
  );
}

export function TanyaClient() {
  // Kartu kutipan ikut mode baca (X11): pilihannya ada di menu ⋮.
  useHeaderMenuReadMode();
  const [status, setStatus] = useState<JawabStatus | "closed" | null>(null);
  const [question, setQuestion] = useState("");
  // Pertanyaan titipan kotak cari Beranda (ADR-086): giliran pertamanya sudah ada di render pertama,
  // supaya gelembungnya tampil di komit yang sama dengan navigasi (transisi bersama dari kotak).
  // Memuat langsung /tanya: titipan kosong, server dan klien sama-sama mulai tanpa giliran.
  const [handedOff] = useState(peekHandOff);
  const [turns, setTurns] = useState<Turn[]>(() =>
    handedOff === null
      ? []
      : [
          {
            id: 1,
            question: handedOff.question,
            // Status Beranda meminta Turnstile: tantangan dulu (POST tanpa token pasti ditolak).
            phase: handedOff.sitekey
              ? { kind: "challenge", sitekey: handedOff.sitekey }
              : { kind: "asking", stage: null, preview: [] },
          },
        ],
  );
  const nextId = useRef(handedOff === null ? 1 : 2);
  const submitting = useRef(false);
  // Ref di pembungkus, bukan di PromptInput.TextArea: ref di sana menimpa ref internal HeroUI
  // (ukuran otomatis + fokus saat Shell diklik).
  const composerRef = useRef<HTMLDivElement>(null);
  const turnRefs = useRef(new Map<number, HTMLDivElement>());
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshStatus = useCallback(async () => {
    setStatus(await loadJawabStatus());
  }, []);

  useEffect(() => {
    let alive = true;
    void loadJawabStatus().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setPhase = useCallback((id: number, update: (p: Phase) => Phase) => {
    setTurns((all) =>
      all.map((turn) => (turn.id === id ? { ...turn, phase: update(turn.phase) } : turn)),
    );
  }, []);

  // Kirim pertanyaan untuk giliran yang fasenya sudah "asking" (state pertama baru diubah sesudah
  // respons tiba). `ask` = setel "asking" lalu kirim.
  const send = useCallback(
    async (id: number, q: string, token?: string) => {
      const onAsking = (f: (p: Extract<Phase, { kind: "asking" }>) => Phase) =>
        setPhase(id, (p) => (p.kind === "asking" ? f(p) : p));
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
        setPhase(id, () => ({ kind: "error", code: "network" }));
        return;
      }
      if (!(res.headers.get("content-type") ?? "").startsWith("text/event-stream")) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; sitekey?: string };
        const code = body.error ?? (res.status === 404 ? "closed" : "internal");
        if (code === "challenge_required" && token === undefined && body.sitekey) {
          setPhase(id, () => ({ kind: "challenge", sitekey: body.sitekey! }));
          return;
        }
        setPhase(id, () => ({ kind: "error", code: code === "not_found" ? "closed" : code }));
        void refreshStatus();
        return;
      }
      let finished = false;
      try {
        await readSse(res.body!, (e) => {
          if (e.event === "stage") onAsking((p) => ({ ...p, stage: e.stage }));
          else if (e.event === "block")
            onAsking((p) => ({ ...p, preview: [...p.preview, e.block] }));
          else if (e.event === "reset") onAsking((p) => ({ ...p, preview: [] }));
          else if (e.event === "done" || e.event === "fallback") {
            finished = true;
            setPhase(id, () => ({
              kind: "result",
              result: e.result,
              cached: e.event === "done" && e.cached,
            }));
          } else if (e.event === "error") {
            finished = true;
            setPhase(id, () => ({ kind: "error", code: "internal" }));
          }
        });
      } catch {
        if (!finished) setPhase(id, () => ({ kind: "error", code: "network" }));
        return;
      }
      if (!finished) setPhase(id, () => ({ kind: "error", code: "internal" }));
      void refreshStatus();
    },
    [refreshStatus, setPhase],
  );

  const ask = useCallback(
    (id: number, q: string, token?: string) => {
      setPhase(id, () => ({ kind: "asking", stage: null, preview: [] }));
      return send(id, q, token);
    },
    [send, setPhase],
  );

  // Kirim titipan sekali: `takeHandOff` mengosongkannya (tanpa memeriksa umur lagi: giliran sudah
  // tampil), jadi efek ganda StrictMode tidak bertanya dua kali (dua kuota). Dengan tantangan, kiriman
  // menunggu token dari Turnstile (onToken → ask). Bila status Beranda belum diketahui, server tetap
  // penentu (`challenge_required`).
  useEffect(() => {
    if (handedOff === null || takeHandOff() === null || handedOff.sitekey) return;
    // Efek ini memulai permintaan jaringan; `send` baru mengubah state sesudah `await fetch` (aturan
    // lint tidak melihat batas await itu).
    // oxlint-disable-next-line react/set-state-in-effect
    void send(1, handedOff.question);
  }, [send, handedOff]);

  const last = turns.at(-1);
  // Jawaban selesai: gulir ke awal giliran itu (pertanyaannya), supaya jawaban dibaca dari atas,
  // bukan dari ujung daftar kutipan tempat percakapan menempel saat menunggu.
  const lastId = last?.id;
  const lastDone = last?.phase.kind === "result";
  useEffect(() => {
    if (lastId === undefined || !lastDone) return;
    // Hanya wadah percakapan yang digulir (scrollIntoView ikut menggulir halaman di luarnya).
    const turnEl = turnRefs.current.get(lastId);
    if (turnEl) scrollRef.current?.scrollTo({ top: turnEl.offsetTop - 24, behavior: "smooth" });
  }, [lastId, lastDone]);
  // Pertanyaan baru: gulir ke bawah supaya gelembungnya dan tahap berjalan terlihat.
  useEffect(() => {
    if (lastId === undefined) return;
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [lastId]);
  const busy =
    last !== undefined && (last.phase.kind === "asking" || last.phase.kind === "challenge");
  const unavailable = jawabUnavailable(status);
  const trimmed = question.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 3;

  function submit() {
    // `submitting` = kunci sinkron: callback view transition berjalan asinkron, jadi tanpa kunci ini
    // Enter kedua sebelum giliran terpasang mengirim pertanyaan dua kali (dua kuota).
    if (trimmed.length < 3 || busy || unavailable !== null || submitting.current) return;
    submitting.current = true;
    const id = nextId.current++;
    const challenge = status !== null && status !== "closed" && status.challenge && status.sitekey;
    const add = () => {
      setTurns((all) => [
        ...all,
        {
          id,
          question: trimmed,
          phase: challenge
            ? { kind: "challenge", sitekey: status.sitekey! }
            : { kind: "asking", stage: null, preview: [] },
        },
      ]);
      setQuestion("");
      submitting.current = false;
      // Mulai SESUDAH giliran terpasang: setPhase(id) memetakan giliran yang sudah ada.
      if (!challenge) void ask(id, trimmed);
    };
    // Pertanyaan pertama: hilal di tengah berpindah mulus ke orb balasan (bila didukung dan gerak
    // tidak dikurangi). flushSync supaya DOM baru sudah ada saat browser memotret keadaan akhir.
    const moving =
      turns.length === 0 &&
      !challenge &&
      typeof document.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (moving) document.startViewTransition(() => flushSync(add));
    else add();
  }

  // Pengumuman singkat untuk pembaca layar (region selalu ada supaya perubahan terbaca).
  const announce =
    last?.phase.kind === "error"
      ? (t.errors[last.phase.code] ?? t.errors.internal)
      : last?.phase.kind === "result"
        ? last.phase.result.outcome === "answer"
          ? t.announceAnswer
          : last.phase.result.outcome === "not_found"
            ? t.notFoundHeading
            : (t.fallback[last.phase.result.reason ?? ""] ?? t.fallback.unverified)
        : "";

  return (
    <div className="flex h-[calc(100svh-var(--navbar-height,4rem))] flex-col overflow-hidden">
      {/* Wadah gulir sendiri, bukan ChatConversation: perilaku "menempel di bawah" milik HeroUI menarik
          tampilan kembali ke ujung daftar kutipan saat kutipan termuat, padahal jawaban harus dibaca
          dari atas (ADR-073). */}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex min-h-full flex-col">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pt-8 pb-6 sm:px-6">
            {turns.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6 text-center">
                <header className="flex flex-col items-center gap-3">
                  {/* Orb diam "siap" (hilal): belum ada pertanyaan, Surau menunggu. */}
                  <span style={{ viewTransitionName: ORB_TRANSITION }}>
                    <TanyaOrb stage="rest" size={64} />
                  </span>
                  <PageTitle compactTitle={false}>{t.heading}</PageTitle>
                  <PageLead className="max-w-xl text-center">{t.lead}</PageLead>
                </header>
                {/* Contoh pertanyaan: hanya mengisi komposer, tidak langsung mengirim (kuota). */}
                <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                  {t.suggestions.map((s) => (
                    <Button
                      key={s}
                      className="rounded-full"
                      isDisabled={unavailable !== null}
                      size="sm"
                      variant="secondary"
                      onPress={() => {
                        setQuestion(s);
                        composerRef.current?.querySelector("textarea")?.focus();
                      }}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <MaknazNotice />
                  <TanyaInfo />
                </div>
              </div>
            ) : (
              <>
                <Typography.Heading level={1} className="sr-only">
                  {t.heading}
                </Typography.Heading>
                {turns.map((turn) => (
                  <div
                    key={turn.id}
                    ref={(el) => {
                      if (el) turnRefs.current.set(turn.id, el);
                      else turnRefs.current.delete(turn.id);
                    }}
                    className="flex flex-col gap-6"
                  >
                    <ChatMessage.User>
                      <QuestionBubble
                        question={turn.question}
                        handedOff={handedOff !== null && turn.id === 1}
                      />
                    </ChatMessage.User>
                    <Reply
                      turn={turn}
                      first={turn.id === turns[0]?.id}
                      onToken={(token) => void ask(turn.id, turn.question, token)}
                      onChallengeError={() =>
                        setPhase(turn.id, () => ({ kind: "error", code: "challenge_unavailable" }))
                      }
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-background shrink-0 px-4 pt-2 pb-4 sm:px-6">
        <div ref={composerRef} className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          {unavailable !== null ? (
            <Alert status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{t.errors[unavailable] ?? t.errors.closed}</Alert.Title>
                <Alert.Description>
                  <SearchInstead question={question} />
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
          {/* Widget sama dengan kotak cari Beranda (radius = kotak 16px + jarak 6px). Kepala: sumber
              jawaban sebagai label (bukan pemilih): Jawab belum menerima batas kitab/bagian. */}
          <Widget className="w-full rounded-[calc(1rem+0.375rem)]">
            <Widget.Header className="py-1.5 ps-1.5">
              <span className="text-muted inline-flex h-8 items-center gap-1.5 ps-2.5 pe-3 text-xs leading-4 font-medium">
                <Book02 aria-hidden="true" className="size-4 shrink-0" />
                <span className="sr-only">{t.sourceLabel} </span>
                {t.source}
              </span>
            </Widget.Header>
            <div className="mx-1.5 mb-1.5">
              <PromptInput
                // Kotak tetap aktif selama giliran berjalan supaya fokus keyboard tidak hilang;
                // `submit()` sudah menolak kiriman saat `busy`.
                lockInputOnRun={false}
                isDisabled={unavailable !== null}
                status={busy ? "submitted" : "ready"}
                value={question}
                onSubmit={submit}
                onValueChange={(v) => setQuestion(v.slice(0, QUESTION_MAX))}
              >
                <PromptInput.Shell>
                  <PromptInput.Content>
                    <PromptInput.TextArea
                      aria-label={t.label}
                      maxLength={QUESTION_MAX}
                      // Sesudah giliran pertama: ingatkan bahwa pertanyaan sebelumnya tidak ikut dibaca.
                      placeholder={
                        turns.length > 0 ? t.composerPlaceholderNext : t.composerPlaceholder
                      }
                    />
                  </PromptInput.Content>
                  <PromptInput.Toolbar>
                    <PromptInput.ToolbarStart className="min-w-0">
                      {turns.length > 0 && !busy ? (
                        <PromptInput.Action
                          aria-label={t.newChat}
                          tooltip={t.newChat}
                          onPress={() => setTurns([])}
                        >
                          <PlusSign className="size-4" />
                        </PromptInput.Action>
                      ) : null}
                      {tooShort ? (
                        <Typography type="body-xs" color="muted">
                          {t.tooShort}
                        </Typography>
                      ) : status !== null && status !== "closed" && status.quota !== null ? (
                        <Typography type="body-xs" color="muted">
                          {t.quota(status.quota.used, status.quota.limit)}
                        </Typography>
                      ) : null}
                    </PromptInput.ToolbarStart>
                    <PromptInput.ToolbarEnd>
                      <PromptInput.Send
                        aria-label={t.submit}
                        isDisabled={unavailable !== null || trimmed.length < 3 || busy}
                      />
                    </PromptInput.ToolbarEnd>
                  </PromptInput.Toolbar>
                </PromptInput.Shell>
              </PromptInput>
            </div>
          </Widget>
          {/* Sesudah percakapan dimulai catatan atas hilang: catatan yang sama pindah ke bawah kotak. */}
          {turns.length > 0 ? <MaknazNotice /> : null}
        </div>
      </div>

      <output aria-live="polite" className="sr-only">
        {announce}
      </output>
    </div>
  );
}
