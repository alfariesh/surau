"use client";

import { Sheet } from "@heroui-pro/react";
import { Button, ButtonGroup, Spinner } from "@heroui/react";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

import { TextFont } from "../../icons";
import { reader as readerText } from "../../i18n/id/reader";

import { useRestorePrefs } from "./reader-style-prefs";

const t = readerText;

// Tombol "Tampilan" + kerangka panel. Semua preferensi tampilan hidup di <html> (variabel CSS dan
// atribut data-*), dipasang skrip awal root layout (READER_SCALE_SCRIPT) supaya tidak berkedip; di
// sini hanya dipulihkan saat navigasi klien (`useRestorePrefs`). Isi panel (kontrol) dimuat saat
// panel dibuka atau tombolnya didekati (X09), bukan bersama JS awal halaman baca.
const loadPanel = () => import("./reader-style-panel");
const preloadPanel = () => void loadPanel();
const ReaderStylePanel = dynamic(() => loadPanel().then((m) => m.ReaderStylePanel), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-48 items-center justify-center">
      <Spinner size="sm" />
    </div>
  ),
});

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
          // Unduh isi panel lebih awal saat tombol disentuh/didekati, supaya panel langsung lengkap.
          onFocus={preloadPanel}
          onHoverStart={preloadPanel}
          onPressStart={preloadPanel}
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
              <ReaderStylePanel preview={preview} />
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}
