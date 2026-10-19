"use client";

import type { Key } from "react";

import type { ReaderAlign, ReaderFont, ReaderLeading } from "../../lib/reader/scale";

import { CellSelect, CellSlider, Segment, Sheet, Widget } from "@heroui-pro/react";
import { Button, ButtonGroup, Description, Label, ListBox, Switch } from "@heroui/react";
import { useTheme } from "next-themes";
import { useEffect, useSyncExternalStore } from "react";

import { TextFont } from "../../icons";
import { id } from "../../i18n/id";
import {
  READER_ALIGN_KEY,
  READER_ALIGNS,
  READER_ATTR_PREFS,
  READER_FONT_KEY,
  READER_FONTS,
  READER_LEADING_KEY,
  READER_LEADINGS,
  READER_SCALE_KEY,
  READER_SCALES,
  READER_TRANSLATION_KEY,
} from "../../lib/reader/scale";
import { ArabicText } from "../arabic";

const t = id.reader;

// Semua preferensi tampilan hidup di <html> (variabel CSS dan atribut data-*), dipasang skrip awal
// halaman baca (READER_SCALE_SCRIPT) supaya tidak berkedip. Komponen membaca nilainya lewat
// useSyncExternalStore dan memberi tahu pembaca lain lewat satu event.

const PREFS_EVENT = "surau:reader-prefs";

function subscribe(onChange: () => void) {
  window.addEventListener(PREFS_EVENT, onChange);
  return () => window.removeEventListener(PREFS_EVENT, onChange);
}

function notify() {
  window.dispatchEvent(new Event(PREFS_EVENT));
}

function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Mode privat / penyimpanan diblokir: pilihan berlaku sampai halaman ditutup.
  }
}

function stored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

// --- Ukuran huruf Arab (--reader-scale) ---

function scaleIndex(): number {
  const value = Number(document.documentElement.style.getPropertyValue("--reader-scale") || "1");
  const i = READER_SCALES.findIndex((s) => s === value);
  return i === -1 ? 1 : i;
}

function applyScale(scale: number) {
  document.documentElement.style.setProperty("--reader-scale", String(scale));
}

// --- Terjemahan AI (data-translation="off") ---

function translationShown(): boolean {
  return document.documentElement.getAttribute("data-translation") !== "off";
}

function applyTranslation(shown: boolean) {
  if (shown) document.documentElement.removeAttribute("data-translation");
  else document.documentElement.setAttribute("data-translation", "off");
}

// --- Font dan jarak baris (data-reader-font, data-reader-leading) ---

type AttrPref = (typeof READER_ATTR_PREFS)[number];

function prefOf(key: string): AttrPref {
  const pref = READER_ATTR_PREFS.find((p) => p.key === key);
  if (pref === undefined) throw new Error(`Preferensi tidak dikenal: ${key}`);
  return pref;
}

function readAttr(pref: AttrPref): string {
  return document.documentElement.getAttribute(pref.attr) ?? pref.fallback;
}

function applyAttr(pref: AttrPref, value: string) {
  if (value === pref.fallback) document.documentElement.removeAttribute(pref.attr);
  else document.documentElement.setAttribute(pref.attr, value);
}

const FONT_PREF = prefOf(READER_FONT_KEY);
const LEADING_PREF = prefOf(READER_LEADING_KEY);
const ALIGN_PREF = prefOf(READER_ALIGN_KEY);

/**
 * Navigasi klien dari halaman lain tidak menjalankan skrip awal: pasang semua pilihan tersimpan
 * saat pembaca pertama kali tampil.
 */
function useRestorePrefs() {
  useEffect(() => {
    const scale = Number(stored(READER_SCALE_KEY));
    applyScale(READER_SCALES.some((s) => s === scale) ? scale : 1);
    applyTranslation(stored(READER_TRANSLATION_KEY) !== "0");
    for (const pref of READER_ATTR_PREFS) {
      const value = stored(pref.key);
      const values: readonly string[] = pref.values;
      applyAttr(pref, value !== null && values.includes(value) ? value : pref.fallback);
    }
    notify();
  }, []);
}

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

function FontPicker() {
  const font = useSyncExternalStore(
    subscribe,
    () => readAttr(FONT_PREF),
    () => FONT_PREF.fallback,
  );

  function change(key: Key | null) {
    if (key === null) return;
    const value = String(key);
    applyAttr(FONT_PREF, value);
    store(FONT_PREF.key, value);
    notify();
  }

  return (
    <CellSelect aria-label={t.styleFont} value={font} onChange={(v) => change(v as Key | null)}>
      <CellSelect.Trigger>
        <CellSelect.Label>{t.styleFont}</CellSelect.Label>
        <CellSelect.Value />
        <CellSelect.Indicator />
      </CellSelect.Trigger>
      <CellSelect.Popover>
        <ListBox>
          {READER_FONTS.map((f) => (
            <ListBox.Item key={f.id} id={f.id satisfies ReaderFont} textValue={f.name}>
              {f.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </CellSelect.Popover>
    </CellSelect>
  );
}

function LeadingPicker() {
  const leading = useSyncExternalStore(
    subscribe,
    () => readAttr(LEADING_PREF),
    () => LEADING_PREF.fallback,
  );

  function change(key: Key) {
    const value = String(key);
    applyAttr(LEADING_PREF, value);
    store(LEADING_PREF.key, value);
    notify();
  }

  return (
    <div className="flex flex-col gap-2">
      <Label id="tampilan-jarak">{t.styleLeading}</Label>
      <Segment
        aria-labelledby="tampilan-jarak"
        className="w-full"
        selectedKey={leading}
        size="sm"
        onSelectionChange={change}
      >
        {READER_LEADINGS.map((value) => (
          <Segment.Item key={value} id={value satisfies ReaderLeading}>
            {t.styleLeadings[value]}
          </Segment.Item>
        ))}
      </Segment>
    </div>
  );
}

function AlignPicker() {
  const align = useSyncExternalStore(
    subscribe,
    () => readAttr(ALIGN_PREF),
    () => ALIGN_PREF.fallback,
  );

  function change(key: Key) {
    const value = String(key);
    applyAttr(ALIGN_PREF, value);
    store(ALIGN_PREF.key, value);
    notify();
  }

  return (
    <div className="flex flex-col gap-2">
      <Label id="tampilan-rata">{t.styleAlign}</Label>
      <Segment
        aria-labelledby="tampilan-rata"
        className="w-full"
        selectedKey={align}
        size="sm"
        onSelectionChange={change}
      >
        {READER_ALIGNS.map((value) => (
          <Segment.Item key={value} id={value satisfies ReaderAlign}>
            {t.styleAligns[value]}
          </Segment.Item>
        ))}
      </Segment>
    </div>
  );
}

const PAPERS = ["light", "sepia", "dark"] as const;

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
    <div className="flex flex-col gap-2">
      <Label id="tampilan-kertas">{t.stylePaper}</Label>
      <Segment
        aria-labelledby="tampilan-kertas"
        className="w-full"
        selectedKey={paper}
        size="sm"
        onSelectionChange={(key) => setTheme(String(key))}
      >
        {PAPERS.map((value) => (
          <Segment.Item key={value} id={value}>
            <span aria-hidden="true" className={`paper-swatch paper-swatch-${value}`} />
            {t.stylePapers[value]}
          </Segment.Item>
        ))}
      </Segment>
    </div>
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
    <Switch
      className="flex w-full flex-row items-center justify-between gap-4"
      isSelected={shown}
      onChange={change}
    >
      <Switch.Content className="flex flex-col items-start gap-0.5">
        <Label>{t.translationToggle}</Label>
        <Description>{t.translationToggleHint}</Description>
      </Switch.Content>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch>
  );
}

const PREVIEW_MAX_CHARS = 60;

/** Potong di batas kata (bukan di tengah huruf + harakat) supaya contoh tetap pendek. */
function previewText(sample: string): string {
  if (sample.length <= PREVIEW_MAX_CHARS) return sample;
  const cut = sample.lastIndexOf(" ", PREVIEW_MAX_CHARS);
  return `${sample.slice(0, cut > 0 ? cut : PREVIEW_MAX_CHARS).trimEnd()}…`;
}

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Tombol "Tampilan" + panel pengaturan baca: dari kanan di desktop, dari bawah di ponsel, latar
 * buram. Pratinjau di atas memakai paragraf halaman ini dengan font, ukuran, dan jarak terpilih.
 */
export function ReaderStyle({
  sample,
  className,
  iconOnly = false,
  separator = false,
}: {
  /** Awal paragraf pertama halaman (teks DB apa adanya) untuk pratinjau huruf. */
  sample: string | null;
  className?: string;
  iconOnly?: boolean;
  /** Pemisah ButtonGroup di awal tombol (saat berada di dalam grup). */
  separator?: boolean;
}) {
  useRestorePrefs();
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
  const placement = isDesktop ? "right" : "bottom";
  const preview = sample ? previewText(sample) : null;

  return (
    <Sheet placement={placement}>
      <Sheet.Trigger>
        <Button
          aria-label={iconOnly ? t.style : undefined}
          className={className}
          isIconOnly={iconOnly}
          size="sm"
          variant="tertiary"
        >
          {separator ? <ButtonGroup.Separator /> : null}
          <TextFont className="size-4" />
          {iconOnly ? null : t.style}
        </Button>
      </Sheet.Trigger>
      <Sheet.Backdrop variant="blur">
        <Sheet.Content className={isDesktop ? "w-[400px]" : "max-h-[90dvh]"}>
          <Sheet.Dialog>
            {isDesktop ? null : <Sheet.Handle />}
            <Sheet.CloseTrigger />
            <Sheet.Header>
              <Sheet.Heading>{t.styleHeading}</Sheet.Heading>
            </Sheet.Header>
            <Sheet.Body className="flex flex-col gap-6 pb-6">
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
              <FontPicker />
              <LeadingPicker />
              <AlignPicker />
              <PaperPicker />
              <TranslationSwitch />
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}
