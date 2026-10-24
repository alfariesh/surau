"use client";

import type { FormEvent } from "react";
import type { Key } from "@heroui/react";

import type { SectionOption } from "../../lib/search/section-pick";
import type { SourceWork } from "./source-picker";

import { Button, Typography } from "@heroui/react";
import { PromptInput, Segment, Widget } from "@heroui-pro/react";
import { chipVariants } from "@heroui/styles";
import { Button as AriaButton } from "react-aria-components";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, ViewTransition } from "react";

import type { JawabStatus } from "../../lib/tanya/model";

import { home as homeText } from "../../i18n/id/home";
import { search as searchText } from "../../i18n/id/search";
import { tanyaText } from "../../i18n/tanya";
import {
  AiChat02,
  AiChat02Duotone,
  Search01,
  SearchList02,
  SearchList02Duotone,
} from "../../icons";
import { searchPageHref } from "../../lib/search/segments";
import {
  HANDOFF_TRANSITION,
  HANDOFF_TRANSITION_CLASS,
  handOffQuestion,
  takeHandOff,
} from "../../lib/tanya/handoff";
import { jawabUnavailable, loadJawabStatus } from "../../lib/tanya/status";
import { selectedSection } from "../../lib/search/section-pick";
import { MaknazNotice } from "../tanya/maknaz-notice";
import { ExampleText } from "./example-text";
import { SourcePicker } from "./source-picker";

const t = homeText;

/** Sama dengan batas pertanyaan halaman Maknaz. */
const QUESTION_MAX = 1000;
/** Sama dengan `SEARCH_QUERY_MAX` (@surau/core; tidak diimpor supaya inti tidak ikut JS klien). */
export const SEARCH_MAX = 200;
const ASK_EXAMPLES = tanyaText.suggestions.slice(0, 3);

type Mode = "cari" | "tanya";

const noSubscribe = () => () => {};

// Contoh = chip kecil yang bisa ditekan (tautan Cari / tombol Maknaz), bukan tombol penuh.
const EXAMPLE_CHIP = chipVariants({ size: "sm", variant: "secondary" }).base({
  className:
    "cursor-pointer px-2 transition-colors hover:bg-default-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[disabled]:cursor-default data-[disabled]:opacity-50",
});

// Kotak cari bersama Beranda dan /cari (ADR-086, ADR-087): satu kotak untuk dua cara. "Cari" →
// /cari?q=…&bagian=…; "Maknaz" → /tanya, pertanyaan dititipkan di memori tab lalu langsung dikirim di
// sana, dan kotak ini berubah menjadi gelembung pertanyaan (transisi bersama). Segmen Maknaz hanya ada
// bila rute Jawab menyala (`ask`); status (kuota, mati, anggaran) baru dimuat saat Maknaz dipilih.
// Tanpa JS: formulir GET biasa ke /cari (tombol kirim = submit, bagian lewat input tersembunyi, #76).
export function SearchBox({
  works,
  sections,
  ask,
  query = "",
  section = null,
  onSectionChange,
}: {
  works: readonly SourceWork[];
  sections: readonly SectionOption[];
  ask: boolean;
  /** Kueri di URL (/cari): kotak ikut bila URL berubah (kembali/maju, contoh, palet ⌘K). */
  query?: string;
  /** Bagian di URL (/cari). */
  section?: number | null;
  /** /cari: ganti bagian langsung menjalankan pencarian. Tanpa ini (Beranda) dipakai saat kirim. */
  onSectionChange?: (section: number | null) => void;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const [mode, setMode] = useState<Mode>("cari");
  const [value, setValue] = useState(query);
  const [shownQuery, setShownQuery] = useState(query);
  const [picked, setPicked] = useState(section);
  const [shownSection, setShownSection] = useState(section);
  // URL berubah: kotak dan pemilih ikut (disetel saat render, pola search-client).
  if (query !== shownQuery) {
    setShownQuery(query);
    setValue(query);
  }
  if (section !== shownSection) {
    setShownSection(section);
    setPicked(section);
  }
  // undefined = belum dimuat (Maknaz belum pernah dipilih).
  const [status, setStatus] = useState<JawabStatus | "closed" | null | undefined>(undefined);
  const statusRequested = useRef(false);
  // State (bukan ref): kunci kiriman ganda sekaligus status tombol kirim selama berpindah halaman.
  const [sent, setSent] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  // Kembali ke Beranda = titipan lama (navigasi ke /tanya yang batal) ditinggalkan, supaya kunjungan
  // /tanya berikutnya tidak bertanya sendiri.
  useEffect(() => {
    takeHandOff();
  }, []);

  const asking = mode === "tanya";
  // Bagian dari URL yang tidak dikenal (ID lama/salah ketik) diabaikan: tampilan pemilih dan
  // penyaring yang dikirim selalu sama.
  const sectionId = (() => {
    const { rub, kitab } = selectedSection(sections, picked);
    return (kitab ?? rub)?.id ?? null;
  })();
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
      router.push(searchPageHref(trimmed.replace(/\s+/g, " "), sectionId));
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

  function pick(next: number | null) {
    setPicked(next);
    onSectionChange?.(next);
  }

  // Dengan JS kiriman lewat PromptInput (Enter/tombol); formulir hanya jalur tanpa JS.
  function blockForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  function fill(example: string) {
    setValue(example);
    shellRef.current?.querySelector("textarea")?.focus();
  }

  return (
    <search aria-label={t.searchLabel} className="flex w-full flex-col gap-3">
      {/* Radius luar = radius kotak masukan (16px) + jarak ke tepi widget (6px, mx-1.5). */}
      <form action="/cari" method="get" onSubmit={blockForm}>
        {sectionId !== null && !asking ? (
          <input name="bagian" type="hidden" value={sectionId} />
        ) : null}
        <Widget className="w-full rounded-[calc(1rem+0.375rem)] text-start">
          {works.length > 0 || sections.length > 0 || ask ? (
            <Widget.Header className="flex-nowrap gap-2 py-1.5 ps-1.5">
              {/* Maknaz belum menerima batas bagian: pemilih disembunyikan di mode Maknaz supaya
                  tidak terkesan membatasi jawaban (dan tidak menjalankan Cari di /cari). */}
              {!asking && (works.length > 0 || sections.length > 0) ? (
                <SourcePicker
                  section={sectionId}
                  sections={sections}
                  works={works}
                  onChange={pick}
                />
              ) : (
                <span />
              )}
              {ask ? (
                <Segment
                  aria-label={t.modeLabel}
                  // Wadah tanpa latar; item terpilih memakai latar wadah lama (--default), tanpa bayangan.
                  className="shrink-0 bg-transparent [--segment:var(--default)] [&_.segment\_\_indicator]:shadow-none"
                  selectedKey={mode}
                  size="sm"
                  onSelectionChange={choose}
                >
                  {/* Ikon item terpilih bergaya duotone, seperti menu aktif di sidebar. */}
                  <Segment.Item id="cari">
                    {asking ? (
                      <SearchList02 aria-hidden="true" className="size-4" />
                    ) : (
                      <SearchList02Duotone aria-hidden="true" className="size-4" />
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
                      name="q"
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
                        // Sebelum hidrasi (atau tanpa JS) tombol aktif dan mengirim formulir GET.
                        isDisabled={hydrated && !canSend}
                        type="submit"
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
      </form>

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
                href={searchPageHref(example, sectionId)}
                prefetch={false}
              >
                <ExampleText text={example} />
              </NextLink>
            ))}
      </div>
      {/* Catatan Maknaz di bawah contoh, di luar kotak (permintaan pemilik). */}
      {asking && unavailable !== null ? (
        <Typography className="text-center" color="muted" type="body-xs">
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
        </Typography>
      ) : asking ? (
        <MaknazNotice />
      ) : null}
    </search>
  );
}
