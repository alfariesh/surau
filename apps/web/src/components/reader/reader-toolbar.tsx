"use client";

import type { FormEvent } from "react";

import type { TocItem } from "../../lib/reader/toc";

import { CircleExclamation, Copy, ListUl, Minus, Plus } from "@gravity-ui/icons";
import { NativeSelect } from "@heroui-pro/react";
import {
  Button,
  ButtonGroup,
  Checkbox,
  Drawer,
  Label,
  NumberField,
  Popover,
  Tooltip,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { id } from "../../i18n/id";
import { READER_SCALE_KEY, READER_SCALES, READER_TRANSLATION_KEY } from "../../lib/reader/scale";

import { useReader } from "./reader-context";
import { TocTree } from "./toc-tree";

const t = id.reader;

const SCALE_EVENT = "surau:reader-scale";

function storedScale(): number {
  try {
    const stored = Number(window.localStorage.getItem(READER_SCALE_KEY));
    return READER_SCALES.some((s) => s === stored) ? stored : 1;
  } catch {
    return 1;
  }
}

function setScale(scale: number, persist: boolean) {
  document.documentElement.style.setProperty("--reader-scale", String(scale));
  if (persist) {
    try {
      window.localStorage.setItem(READER_SCALE_KEY, String(scale));
    } catch {
      // Mode privat / penyimpanan diblokir: ukuran tetap berlaku sampai halaman ditutup.
    }
  }
  window.dispatchEvent(new Event(SCALE_EVENT));
}

function subscribeScale(onChange: () => void) {
  window.addEventListener(SCALE_EVENT, onChange);
  return () => window.removeEventListener(SCALE_EVENT, onChange);
}

/** Skala yang sedang berlaku = variabel CSS di <html> (dipasang skrip awal atau tombol ini). */
function currentScaleIndex(): number {
  const value = Number(document.documentElement.style.getPropertyValue("--reader-scale") || "1");
  const i = READER_SCALES.findIndex((s) => s === value);
  return i === -1 ? 1 : i;
}

function FontSizeControl() {
  const index = useSyncExternalStore(subscribeScale, currentScaleIndex, () => 1);
  // Navigasi klien dari halaman lain tidak menjalankan skrip awal: pasang skala tersimpan di sini.
  useEffect(() => setScale(storedScale(), false), []);

  function change(delta: number) {
    const next = Math.min(READER_SCALES.length - 1, Math.max(0, index + delta));
    setScale(READER_SCALES[next] ?? 1, true);
  }

  return (
    <ButtonGroup aria-label={t.fontSize} size="sm" variant="tertiary">
      <Button
        isIconOnly
        aria-label={t.fontSmaller}
        isDisabled={index === 0}
        onPress={() => change(-1)}
      >
        <Minus className="size-4" />
      </Button>
      <Button
        isIconOnly
        aria-label={t.fontLarger}
        isDisabled={index === READER_SCALES.length - 1}
        onPress={() => change(1)}
      >
        <Plus className="size-4" />
      </Button>
    </ButtonGroup>
  );
}

const TRANSLATION_EVENT = "surau:reader-translation";

function translationShown(): boolean {
  return document.documentElement.getAttribute("data-translation") !== "off";
}

function subscribeTranslation(onChange: () => void) {
  window.addEventListener(TRANSLATION_EVENT, onChange);
  return () => window.removeEventListener(TRANSLATION_EVENT, onChange);
}

function setTranslation(shown: boolean, persist: boolean) {
  if (shown) document.documentElement.removeAttribute("data-translation");
  else document.documentElement.setAttribute("data-translation", "off");
  if (persist) {
    try {
      window.localStorage.setItem(READER_TRANSLATION_KEY, shown ? "1" : "0");
    } catch {
      // localStorage diblokir: pilihan berlaku sampai halaman ditutup.
    }
  }
  window.dispatchEvent(new Event(TRANSLATION_EVENT));
}

/** Tampil/sembunyikan terjemahan AI (S14), disimpan per browser seperti ukuran huruf. */
function TranslationToggle() {
  const shown = useSyncExternalStore(subscribeTranslation, translationShown, () => true);
  // Navigasi klien dari halaman lain tidak menjalankan skrip awal: pasang pilihan tersimpan di sini.
  useEffect(() => {
    try {
      setTranslation(window.localStorage.getItem(READER_TRANSLATION_KEY) !== "0", false);
    } catch {
      // localStorage diblokir: tetap tampil.
    }
  }, []);
  return (
    <Checkbox isSelected={shown} onChange={(v) => setTranslation(v, true)}>
      <Checkbox.Content className="text-foreground text-sm">
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        {t.translationToggle}
      </Checkbox.Content>
    </Checkbox>
  );
}

function JumpToPage({
  segment,
  volumes,
  juz,
  page,
}: {
  segment: string;
  volumes: number;
  juz: number;
  page: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const toJuz = Number(form.get("juz"));
    const toPage = Number(form.get("page"));
    if (!Number.isInteger(toJuz) || !Number.isInteger(toPage) || toJuz < 1 || toPage < 0) return;
    setOpen(false);
    router.push(`/kitab/${segment}/${toJuz}/${toPage}`);
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button size="sm" variant="tertiary">
        {t.jump}
      </Button>
      <Popover.Content className="w-72" placement="bottom">
        <Popover.Dialog>
          <Popover.Heading className="text-foreground mb-3 text-sm font-semibold">
            {t.jumpHeading}
          </Popover.Heading>
          <form className="flex items-end gap-2" onSubmit={submit}>
            <div className="flex flex-col gap-1">
              <label className="text-foreground text-sm font-medium" htmlFor="lompat-juz">
                {t.jumpJuz}
              </label>
              <NativeSelect>
                <NativeSelect.Trigger defaultValue={String(juz)} id="lompat-juz" name="juz">
                  {Array.from({ length: Math.max(volumes, juz) }, (_, i) => (
                    <NativeSelect.Option key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </NativeSelect.Option>
                  ))}
                  <NativeSelect.Indicator />
                </NativeSelect.Trigger>
              </NativeSelect>
            </div>
            <NumberField
              isRequired
              className="w-24"
              defaultValue={page}
              formatOptions={{ useGrouping: false }}
              maxValue={9999}
              minValue={0}
              name="page"
            >
              <Label>{t.jumpPage}</Label>
              <NumberField.Group>
                <NumberField.Input />
              </NumberField.Group>
            </NumberField>
            <Button type="submit">{t.jumpGo}</Button>
          </form>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function TocDrawer({ toc, activeIds }: { toc: TocItem[]; activeIds: number[] }) {
  return (
    <Drawer>
      <Button className="lg:hidden" size="sm" variant="tertiary">
        <ListUl className="size-4" />
        {t.tocOpen}
      </Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="left">
          <Drawer.Dialog>
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading>{t.tocHeading}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body data-toc-scroll>
              <TocTree activeIds={activeIds} items={toc} />
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

export function ReaderToolbar({
  toc,
  activeIds,
  segment,
  volumes,
  juz,
  page,
  pagePath,
}: {
  toc: TocItem[];
  activeIds: number[];
  segment: string;
  volumes: number;
  juz: number;
  page: number;
  pagePath: string;
}) {
  const reader = useReader();

  return (
    // Div biasa, bukan role="toolbar": pola toolbar ARIA memakai ←/→ antar-kontrol, padahal ←/→
    // di halaman ini membalik halaman (PageNav).
    <div className="flex flex-wrap items-center gap-2">
      <TocDrawer activeIds={activeIds} toc={toc} />
      <JumpToPage juz={juz} page={page} segment={segment} volumes={volumes} />
      <Button size="sm" variant="tertiary" onPress={() => void reader.copyCitation(pagePath)}>
        <Copy className="size-4" />
        {t.copyCitation}
      </Button>
      <FontSizeControl />
      <TranslationToggle />
      <Tooltip delay={300}>
        <Button
          isIconOnly
          aria-label={t.report}
          size="sm"
          variant="tertiary"
          onPress={() => reader.openReport(null)}
        >
          <CircleExclamation className="size-4" />
        </Button>
        <Tooltip.Content>{t.report}</Tooltip.Content>
      </Tooltip>
    </div>
  );
}
