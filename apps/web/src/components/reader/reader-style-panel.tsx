"use client";

import type { ReactNode } from "react";

import type {
  ReaderAlign,
  ReaderFont,
  ReaderLeading,
  ReaderTrLayout,
} from "../../lib/reader/scale";

import type { AttrPref } from "../../lib/prefs";
import type { ReaderSample } from "../../lib/reader/preview";
import type { ReadMode } from "../../lib/reader/scale";

import { CellSelect, CellSlider, Widget } from "@heroui-pro/react";
import { ListBox, Typography } from "@heroui/react";
import { useTheme } from "next-themes";
import { useId, useSyncExternalStore } from "react";

import { reader as readerText } from "../../i18n/id/reader";
import { readMode as readModeText } from "../../i18n/id/readMode";
import { keepReadingPosition } from "../../lib/keep-position";
import { translationLabel } from "../../lib/translation-label";
import { applyAttr, notify, readAttr, store, subscribe } from "../../lib/prefs";
import {
  READER_ALIGNS,
  READER_FONTS,
  READER_LEADINGS,
  READER_SCALE_KEY,
  READER_SCALES,
  READER_TR_LAYOUTS,
  READER_TR_SCALE_KEY,
  READER_TR_SCALES,
} from "../../lib/reader/scale";
import { ArabicText } from "../arabic";
import { useReadMode } from "../read-mode";
import { ReadModeSegment } from "../read-mode-segment";
import { StableText } from "../stable-text";

import {
  ALIGN_PREF,
  FONT_PREF,
  LEADING_PREF,
  TR_LAYOUT_PREF,
  applyScale,
  applyTrScale,
  scaleIndex,
  trScaleIndex,
} from "./reader-style-prefs";

const t = readerText;
const m = readModeText;

// Isi panel Tampilan (kontrol + pratinjau). Diunduh saat panel pertama kali dibuka (X09): CellSlider,
// CellSelect, Segment, dan Widget tidak ikut JS awal halaman baca. Setiap perubahan lewat
// `keepReadingPosition` (X11): paragraf yang sedang dibaca di belakang panel tidak terlempar.

const noopSubscribe = () => () => {};

function FontSizeControl() {
  const index = useSyncExternalStore(subscribe, scaleIndex, () => 1);

  function change(value: number | number[]) {
    const next = READER_SCALES[Array.isArray(value) ? (value[0] ?? 1) : value] ?? 1;
    keepReadingPosition(() => applyScale(next));
    store(READER_SCALE_KEY, String(next));
    notify();
  }

  return (
    <CellSlider
      aria-label={t.styleFontSize}
      maxValue={READER_SCALES.length - 1}
      minValue={0}
      step={1}
      value={index}
      variant="secondary"
      onChange={change}
    >
      <CellSlider.Track>
        <CellSlider.Fill />
        <CellSlider.Thumb />
        <CellSlider.Label>{t.styleFontSize}</CellSlider.Label>
        <CellSlider.Output>
          {({ state }) => `${Math.round((READER_SCALES[state.values[0] ?? 1] ?? 1) * 100)}%`}
        </CellSlider.Output>
      </CellSlider.Track>
    </CellSlider>
  );
}

function TrSizeControl({ isDisabled }: { isDisabled: boolean }) {
  const index = useSyncExternalStore(subscribe, trScaleIndex, () => 1);

  function change(value: number | number[]) {
    const next = READER_TR_SCALES[Array.isArray(value) ? (value[0] ?? 1) : value] ?? 1;
    keepReadingPosition(() => applyTrScale(next));
    store(READER_TR_SCALE_KEY, String(next));
    notify();
  }

  return (
    <CellSlider
      aria-label={t.styleTrSize}
      isDisabled={isDisabled}
      maxValue={READER_TR_SCALES.length - 1}
      minValue={0}
      step={1}
      value={index}
      variant="secondary"
      onChange={change}
    >
      <CellSlider.Track>
        <CellSlider.Fill />
        <CellSlider.Thumb />
        <CellSlider.Label>{t.styleTrSize}</CellSlider.Label>
        <CellSlider.Output>
          {({ state }) => `${Math.round((READER_TR_SCALES[state.values[0] ?? 1] ?? 1) * 100)}%`}
        </CellSlider.Output>
      </CellSlider.Track>
    </CellSlider>
  );
}

type CellOption = { id: string; label: string; icon?: ReactNode };

/**
 * Satu baris pilihan bergaya sel (CellSelect secondary): label di kiri, nilai terpilih di kanan.
 * Nama pemicu harus memuat teks terlihat "label nilai" secara berurutan (WCAG 2.5.3, axe
 * label-content-name-mismatch sejak axe 4.14). React Aria menyusunnya sebagai "nilai + aria-label",
 * jadi aria-label berisi label dan nilai, dan ada spasi di antara keduanya di DOM.
 */
function CellPicker({
  label,
  value,
  options,
  onSelect,
  isDisabled = false,
}: {
  label: string;
  value: string | null;
  options: readonly CellOption[];
  onSelect: (value: string) => void;
  isDisabled?: boolean;
}) {
  const selectedLabel = options.find((o) => o.id === value)?.label;
  return (
    <CellSelect
      aria-label={selectedLabel ? `${label} ${selectedLabel}` : label}
      isDisabled={isDisabled}
      value={value}
      variant="secondary"
      onChange={(key) => {
        if (key !== null) onSelect(String(key));
      }}
    >
      <CellSelect.Trigger>
        <CellSelect.Label>{label}</CellSelect.Label>{" "}
        <CellSelect.Value>
          {({ defaultChildren, isPlaceholder, state }: any) => {
            const selected = options.find((o) => o.id === state.selectedItems[0]?.key);
            if (isPlaceholder || selected === undefined) return defaultChildren;
            return (
              <span className="flex items-center justify-end gap-1.5 text-end">
                {selected.icon}
                {selected.label}
              </span>
            );
          }}
        </CellSelect.Value>
        <CellSelect.Indicator />
      </CellSelect.Trigger>
      <CellSelect.Popover>
        <ListBox>
          {options.map((o) => (
            <ListBox.Item key={o.id} id={o.id} textValue={o.label}>
              {o.icon}
              {o.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </CellSelect.Popover>
    </CellSelect>
  );
}

const FONT_OPTIONS: readonly CellOption[] = READER_FONTS.map((f) => ({
  id: f.id satisfies ReaderFont,
  label: f.name,
}));
const LEADING_OPTIONS: readonly CellOption[] = READER_LEADINGS.map((v) => ({
  id: v satisfies ReaderLeading,
  label: t.styleLeadings[v],
}));
const ALIGN_OPTIONS: readonly CellOption[] = READER_ALIGNS.map((v) => ({
  id: v satisfies ReaderAlign,
  label: t.styleAligns[v],
}));
const TR_LAYOUT_OPTIONS: readonly CellOption[] = READER_TR_LAYOUTS.map((v) => ({
  id: v satisfies ReaderTrLayout,
  label: t.styleTrLayouts[v],
}));

function AttrPicker({
  pref,
  label,
  options,
  isDisabled = false,
}: {
  pref: AttrPref;
  label: string;
  options: readonly CellOption[];
  isDisabled?: boolean;
}) {
  const value = useSyncExternalStore(
    subscribe,
    () => readAttr(pref),
    () => pref.fallback,
  );

  function change(next: string) {
    keepReadingPosition(() => applyAttr(pref, next));
    store(pref.key, next);
    notify();
  }

  return (
    <CellPicker
      isDisabled={isDisabled}
      label={label}
      options={options}
      value={value}
      onSelect={change}
    />
  );
}

const PAPERS = ["light", "sepia", "dark"] as const;
const PAPER_OPTIONS: readonly CellOption[] = PAPERS.map((v) => ({
  id: v,
  label: t.stylePapers[v],
  icon: <span aria-hidden="true" className={`paper-swatch paper-swatch-${v}`} />,
}));

function PaperPicker() {
  const { resolvedTheme, setTheme } = useTheme();
  // Tema baru diketahui setelah hidrasi; sebelum itu tidak ada pilihan yang ditandai.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const paper = mounted ? (resolvedTheme ?? null) : null;

  return (
    <CellPicker label={t.stylePaper} options={PAPER_OPTIONS} value={paper} onSelect={setTheme} />
  );
}

const hint = (text: string) => (
  <Typography className="px-1" color="muted" type="body-xs">
    {text}
  </Typography>
);

/** Mode baca (X11) di paling atas panel: pilihan + penjelasan mode terpilih. */
function ReadModeControl({ mode, hasTranslation }: { mode: ReadMode; hasTranslation: boolean }) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Typography className="px-1" color="muted" id={labelId} type="body-xs" weight="medium">
        {m.label}
      </Typography>
      <ReadModeSegment labelId={labelId} size="md" />
      <StableText
        active={mode}
        variants={{
          ar: hint(m.hints.ar),
          both: hint(hasTranslation ? m.hints.both : m.noTranslation),
          tr: hint(hasTranslation ? m.hints.tr : m.noTranslation),
        }}
      />
    </div>
  );
}

/**
 * Pratinjau dari halaman ini menurut mode baca: Arab + terjemahan AI berlencana, atau Arab dengan
 * keterangan bahwa terjemahan tidak tampil (tinggi sama di semua mode, `StableText`).
 */
function Preview({ preview, mode }: { preview: ReaderSample; mode: ReadMode }) {
  const tr = preview.translation;
  const translationSample = tr ? (
    <p className="passage-translation" lang={tr.lang}>
      {tr.text} <span className="ai-badge">{translationLabel(tr.review).badge}</span>
    </p>
  ) : null;
  return (
    // `shrink-0`: badan lembar ponsel adalah kolom flex yang bisa digulir; tanpa ini widget
    // (overflow tersembunyi) menyusut dan memotong pratinjau beserta lencana AI-nya.
    <Widget aria-hidden="true" className="shrink-0">
      <Widget.Header>
        <Widget.Title>{t.stylePreviewNote}</Widget.Title>
      </Widget.Header>
      <Widget.Content>
        <div className="reader-text reader-style-preview">
          {preview.arabic ? (
            <ArabicText className="text-foreground">{preview.arabic}</ArabicText>
          ) : null}
          {tr ? (
            <StableText
              active={mode}
              variants={{
                // Di tengah ruang yang dicadangkan untuk contoh terjemahan (tinggi tetap).
                ar: <div className="flex h-full items-center">{hint(m.previewNoTranslation)}</div>,
                // Mode Terjemahan: contoh huruf terjemahan sama dengan Keduanya (Arab dilipat per
                // paragraf di pembaca, penjelasannya di atas).
                tr: translationSample,
                both: translationSample,
              }}
            />
          ) : null}
        </div>
      </Widget.Content>
    </Widget>
  );
}

/** Isi `Sheet.Body` panel Tampilan; `preview` = awal paragraf pertama halaman (teks DB) + terjemahannya. */
export function ReaderStylePanel({ preview }: { preview: ReaderSample }) {
  const mode = useReadMode();
  return (
    <>
      <ReadModeControl hasTranslation={preview.hasTranslation} mode={mode} />
      {preview.arabic || preview.translation ? <Preview mode={mode} preview={preview} /> : null}
      <FontSizeControl />
      <AttrPicker label={t.styleFont} options={FONT_OPTIONS} pref={FONT_PREF} />
      <AttrPicker label={t.styleLeading} options={LEADING_OPTIONS} pref={LEADING_PREF} />
      <div className="flex flex-col gap-1.5">
        <AttrPicker label={t.styleAlign} options={ALIGN_OPTIONS} pref={ALIGN_PREF} />
        <Typography type="body-xs" color="muted" className="px-1">
          {t.styleAlignHint}
        </Typography>
      </div>
      <PaperPicker />
      {/* Kontrol terjemahan tetap di tempat, nonaktif bila tidak berlaku (tidak disembunyikan). */}
      <TrSizeControl isDisabled={mode === "ar"} />
      <div className="flex flex-col gap-1.5">
        <AttrPicker
          isDisabled={mode !== "both"}
          label={t.styleTrLayout}
          options={TR_LAYOUT_OPTIONS}
          pref={TR_LAYOUT_PREF}
        />
        <StableText
          active={mode}
          variants={{
            ar: hint(m.trControlsOff),
            both: hint(t.styleTrLayoutHint),
            tr: hint(m.layoutOnlyBoth),
          }}
        />
      </div>
    </>
  );
}
