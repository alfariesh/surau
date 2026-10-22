"use client";

import type { ReactNode } from "react";

import type {
  ReaderAlign,
  ReaderFont,
  ReaderLeading,
  ReaderTrLayout,
} from "../../lib/reader/scale";

import { CellSelect, CellSlider, CellSwitch, Widget } from "@heroui-pro/react";
import { ListBox, Typography } from "@heroui/react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { reader as readerText } from "../../i18n/id/reader";
import {
  READER_ALIGNS,
  READER_FONTS,
  READER_LEADINGS,
  READER_SCALE_KEY,
  READER_SCALES,
  READER_TR_LAYOUTS,
  READER_TR_SCALE_KEY,
  READER_TR_SCALES,
  READER_TRANSLATION_KEY,
} from "../../lib/reader/scale";
import { ArabicText } from "../arabic";

import type { AttrPref } from "./reader-style-prefs";

import {
  ALIGN_PREF,
  FONT_PREF,
  LEADING_PREF,
  TR_LAYOUT_PREF,
  applyAttr,
  applyScale,
  applyTrScale,
  applyTranslation,
  notify,
  readAttr,
  scaleIndex,
  store,
  subscribe,
  trScaleIndex,
  translationShown,
} from "./reader-style-prefs";

const t = readerText;

// Isi panel Tampilan (kontrol + pratinjau). Diunduh saat panel pertama kali dibuka (X09): CellSlider,
// CellSelect, CellSwitch, dan Widget tidak ikut JS awal halaman baca.

const noopSubscribe = () => () => {};

function FontSizeControl() {
  const index = useSyncExternalStore(subscribe, scaleIndex, () => 1);

  function change(value: number | number[]) {
    const next = READER_SCALES[Array.isArray(value) ? (value[0] ?? 1) : value] ?? 1;
    applyScale(next);
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

function TrSizeControl() {
  const index = useSyncExternalStore(subscribe, trScaleIndex, () => 1);

  function change(value: number | number[]) {
    const next = READER_TR_SCALES[Array.isArray(value) ? (value[0] ?? 1) : value] ?? 1;
    applyTrScale(next);
    store(READER_TR_SCALE_KEY, String(next));
    notify();
  }

  return (
    <CellSlider
      aria-label={t.styleTrSize}
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
}: {
  label: string;
  value: string | null;
  options: readonly CellOption[];
  onSelect: (value: string) => void;
}) {
  const selectedLabel = options.find((o) => o.id === value)?.label;
  return (
    <CellSelect
      aria-label={selectedLabel ? `${label} ${selectedLabel}` : label}
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
}: {
  pref: AttrPref;
  label: string;
  options: readonly CellOption[];
}) {
  const value = useSyncExternalStore(
    subscribe,
    () => readAttr(pref),
    () => pref.fallback,
  );

  function change(next: string) {
    applyAttr(pref, next);
    store(pref.key, next);
    notify();
  }

  return <CellPicker label={label} options={options} value={value} onSelect={change} />;
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

function TranslationSwitch() {
  const shown = useSyncExternalStore(subscribe, translationShown, () => true);

  function change(value: boolean) {
    applyTranslation(value);
    store(READER_TRANSLATION_KEY, value ? "1" : "0");
    notify();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <CellSwitch
        aria-label={t.translationToggle}
        isSelected={shown}
        variant="secondary"
        onChange={change}
      >
        <CellSwitch.Trigger>
          <CellSwitch.Label>{t.translationToggle}</CellSwitch.Label>
          <CellSwitch.Control />
        </CellSwitch.Trigger>
      </CellSwitch>
      <Typography type="body-xs" color="muted" className="px-1">
        {t.translationToggleHint}
      </Typography>
    </div>
  );
}

/** Isi `Sheet.Body` panel Tampilan; `preview` = awal paragraf pertama halaman (teks DB). */
export function ReaderStylePanel({ preview }: { preview: string | null }) {
  return (
    <>
      {preview ? (
        <Widget aria-hidden="true">
          <Widget.Header>
            <Widget.Title>{t.stylePreviewNote}</Widget.Title>
          </Widget.Header>
          <Widget.Content>
            <div className="reader-text">
              <ArabicText className="text-foreground">{preview}</ArabicText>
            </div>
          </Widget.Content>
        </Widget>
      ) : null}
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
      <TranslationSwitch />
      <TrSizeControl />
      <div className="flex flex-col gap-1.5">
        <AttrPicker label={t.styleTrLayout} options={TR_LAYOUT_OPTIONS} pref={TR_LAYOUT_PREF} />
        <Typography type="body-xs" color="muted" className="px-1">
          {t.styleTrLayoutHint}
        </Typography>
      </div>
    </>
  );
}
