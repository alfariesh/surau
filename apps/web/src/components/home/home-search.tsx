"use client";

import type { Key } from "@heroui/react";

import type { SourceWork } from "./source-picker";

import { Button, Typography } from "@heroui/react";
import { PromptInput, Segment, Widget } from "@heroui-pro/react";
import { chipVariants } from "@heroui/styles";
import { Button as AriaButton } from "react-aria-components";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, ViewTransition } from "react";

import type { JawabStatus } from "../../lib/tanya/model";

import { home as homeText } from "../../i18n/id/home";
import { search as searchText } from "../../i18n/id/search";
import { tanyaText } from "../../i18n/tanya";
import { AiChat02, AiChat02Duotone, Search01, Search01Duotone } from "../../icons";
import { searchPageHref } from "../../lib/search/segments";
import {
  HANDOFF_TRANSITION,
  HANDOFF_TRANSITION_CLASS,
  handOffQuestion,
  takeHandOff,
} from "../../lib/tanya/handoff";
import { jawabUnavailable, loadJawabStatus } from "../../lib/tanya/status";
import { ExampleText } from "../search/example-text";
import { SourcePicker } from "./source-picker";

const t = homeText;

/** Sama dengan batas pertanyaan halaman Maknaz. */
const QUESTION_MAX = 1000;
/** Sama dengan `SEARCH_QUERY_MAX` (@surau/core; tidak diimpor supaya inti tidak ikut JS klien). */
export const SEARCH_MAX = 200;
const ASK_EXAMPLES = tanyaText.suggestions.slice(0, 3);

type Mode = "cari" | "tanya";

// Contoh = chip kecil yang bisa ditekan (tautan Cari / tombol Maknaz), bukan tombol penuh.
const EXAMPLE_CHIP = chipVariants({ size: "sm", variant: "secondary" }).base({
  className:
    "cursor-pointer px-2 transition-colors hover:bg-default-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[disabled]:cursor-default data-[disabled]:opacity-50",
});

// Kotak cari Beranda (ADR-086): satu kotak untuk dua cara. "Cari" → /cari?q=…; "Maknaz" → /tanya,
// pertanyaan dititipkan di memori tab lalu langsung dikirim di sana, dan kotak ini berubah menjadi
// gelembung pertanyaan (transisi bersama). Segmen Maknaz hanya ada bila rute Jawab menyala (`ask`);
// status (kuota, mati, anggaran) baru dimuat saat Maknaz dipilih, bukan di setiap kunjungan Beranda.
export function HomeSearch({ works, ask }: { works: readonly SourceWork[]; ask: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("cari");
  const [value, setValue] = useState("");
  // undefined = belum dimuat (Maknaz belum pernah dipilih).
  const [status, setStatus] = useState<JawabStatus | "closed" | null | undefined>(undefined);
  const statusRequested = useRef(false);
  // State (bukan ref): kunci kiriman ganda sekaligus status tombol kirim selama berpindah halaman.
  const [sent, setSent] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  // Kitab terpilih (kosong = semua). Belum dikirim ke API: lihat SourcePicker.
  const [kitab, setKitab] = useState<Key[]>([]);

  // Kembali ke Beranda = titipan lama (navigasi ke /tanya yang batal) ditinggalkan, supaya kunjungan
  // /tanya berikutnya tidak bertanya sendiri.
  useEffect(() => {
    takeHandOff();
  }, []);

  const asking = mode === "tanya";
  const trimmed = value.trim();
  const unavailable = asking && status !== undefined ? jawabUnavailable(status) : null;
  const tooShort = asking && trimmed.length > 0 && trimmed.length < 3;
  // Teks panjang dari mode Maknaz tetap ada saat pindah ke Cari, tetapi Cari menolak > SEARCH_MAX.
  const tooLong = !asking && trimmed.length > SEARCH_MAX;
  const canSend = asking ? trimmed.length >= 3 && unavailable === null : trimmed !== "" && !tooLong;

  function choose(key: Key) {
    const next: Mode = key === "tanya" ? "tanya" : "cari";
    setMode(next);
    if (next === "tanya" && !statusRequested.current) {
      statusRequested.current = true;
      // Halaman Maknaz sudah di cache saat dikirim: gelembungnya tampil di komit yang sama dengan
      // navigasi, syarat transisi bersama terbentuk.
      router.prefetch("/tanya");
      void loadJawabStatus().then(setStatus);
    }
  }

  function submit() {
    if (!canSend || sent) return;
    if (!asking) {
      router.push(searchPageHref(trimmed.replace(/\s+/g, " "), null));
      return;
    }
    setSent(true);
    // Status meminta Turnstile: /tanya membuka tantangan dulu (tanpa POST yang pasti ditolak dan
    // memakan jatah batas laju), seperti kiriman dari komposer /tanya sendiri.
    const sitekey =
      status && status !== "closed" && status.challenge && status.sitekey ? status.sitekey : null;
    handOffQuestion(trimmed, sitekey);
    router.push("/tanya");
  }

  function fill(example: string) {
    setValue(example);
    shellRef.current?.querySelector("textarea")?.focus();
  }

  return (
    <search aria-label={t.searchLabel} className="flex w-full flex-col gap-3">
      {/* Radius luar = radius kotak masukan (16px) + jarak ke tepi widget (6px, mx-1.5). */}
      <Widget className="w-full rounded-[calc(1rem+0.375rem)] text-start">
        {works.length > 0 || ask ? (
          <Widget.Header className="flex-wrap gap-y-1.5 py-1.5 ps-1.5">
            {works.length > 0 ? (
              <SourcePicker value={kitab} works={works} onChange={setKitab} />
            ) : (
              <span />
            )}
            {ask ? (
              <Segment
                aria-label={t.modeLabel}
                // Wadah tanpa latar; item terpilih memakai latar wadah lama (--default), tanpa bayangan.
                className="bg-transparent [--segment:var(--default)] [&_.segment\_\_indicator]:shadow-none"
                selectedKey={mode}
                size="sm"
                onSelectionChange={choose}
              >
                {/* Ikon item terpilih bergaya duotone, seperti menu aktif di sidebar. */}
                <Segment.Item id="cari">
                  {asking ? (
                    <Search01 aria-hidden="true" className="size-4" />
                  ) : (
                    <Search01Duotone aria-hidden="true" className="size-4" />
                  )}
                  {t.modeSearch}
                </Segment.Item>
                <Segment.Item id="tanya">
                  {asking ? (
                    <AiChat02Duotone aria-hidden="true" className="size-4" />
                  ) : (
                    <AiChat02 aria-hidden="true" className="size-4" />
                  )}
                  {t.modeAsk}
                </Segment.Item>
              </Segment>
            ) : null}
          </Widget.Header>
        ) : null}
        <div ref={shellRef} className="mx-1.5 mb-1.5 first:mt-1.5">
          <PromptInput
            isDisabled={unavailable !== null}
            status={sent ? "submitted" : "ready"}
            value={value}
            onSubmit={submit}
            onValueChange={(v) => setValue(v.slice(0, QUESTION_MAX))}
          >
            {/* Pasangan transisi gelembung pertanyaan di /tanya; tanpa pasangan (ke /cari) diam. */}
            <ViewTransition
              default="none"
              name={HANDOFF_TRANSITION}
              share={HANDOFF_TRANSITION_CLASS}
            >
              <PromptInput.Shell>
                <PromptInput.Content>
                  <PromptInput.TextArea
                    aria-label={asking ? tanyaText.label : searchText.inputLabel}
                    dir="auto"
                    maxLength={asking ? QUESTION_MAX : SEARCH_MAX}
                    placeholder={asking ? tanyaText.composerPlaceholder : t.searchPlaceholder}
                  />
                </PromptInput.Content>
                <PromptInput.Toolbar>
                  <PromptInput.ToolbarStart className="min-w-0">
                    {tooShort || tooLong ? (
                      <Typography color="muted" type="body-xs">
                        {tooLong ? t.searchTooLong(SEARCH_MAX) : tanyaText.tooShort}
                      </Typography>
                    ) : asking && status && status !== "closed" && status.quota !== null ? (
                      <Typography color="muted" type="body-xs">
                        {tanyaText.quota(status.quota.used, status.quota.limit)}
                      </Typography>
                    ) : null}
                  </PromptInput.ToolbarStart>
                  <PromptInput.ToolbarEnd>
                    <PromptInput.Send
                      aria-label={asking ? tanyaText.submit : searchText.submit}
                      isDisabled={!canSend}
                    >
                      {asking ? undefined : <Search01 aria-hidden="true" className="size-4" />}
                    </PromptInput.Send>
                  </PromptInput.ToolbarEnd>
                </PromptInput.Toolbar>
              </PromptInput.Shell>
            </ViewTransition>
          </PromptInput>
        </div>
      </Widget>

      {/* Contoh: Cari langsung membuka hasil (tanpa biaya); Maknaz hanya mengisi kotak (kuota). */}
      <div
        aria-label={t.examplesLabel}
        className="flex flex-wrap items-center justify-center gap-2"
        // Pembungkus bernama untuk deretan tautan/tombol contoh; fieldset menuntut legend dan
        // ditujukan untuk kontrol formulir.
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="group"
      >
        {asking
          ? ASK_EXAMPLES.map((example) => (
              <AriaButton
                key={example}
                className={EXAMPLE_CHIP}
                isDisabled={unavailable !== null}
                onPress={() => fill(example)}
              >
                {example}
              </AriaButton>
            ))
          : searchText.examples.map((example) => (
              <NextLink
                key={example}
                className={EXAMPLE_CHIP}
                href={searchPageHref(example, null)}
                prefetch={false}
              >
                <ExampleText text={example} />
              </NextLink>
            ))}
      </div>
      {/* Catatan Maknaz di bawah contoh, di luar kotak (permintaan pemilik). */}
      {asking ? (
        <Typography className="text-center" color="muted" type="body-xs">
          {unavailable !== null ? (
            <>
              {tanyaText.errors[unavailable] ?? tanyaText.errors.closed}{" "}
              {/* Pindah ke Cari dengan teks yang sudah diketik (bukan /cari kosong). */}
              <Button
                className="h-auto min-w-0 p-0 underline"
                size="sm"
                variant="ghost"
                onPress={() => setMode("cari")}
              >
                {t.askUseSearch}
              </Button>
            </>
          ) : (
            <>
              {tanyaText.footer}{" "}
              <NextLink className="underline" href="/privasi">
                {tanyaText.footerPrivacyLink}
              </NextLink>
            </>
          )}
        </Typography>
      ) : null}
    </search>
  );
}
