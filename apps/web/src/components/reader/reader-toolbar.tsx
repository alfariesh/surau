"use client";

import type { TitleSource } from "../../lib/reader/reader-toc";
import type { TocItem } from "../../lib/reader/toc";

import {
  AlertCircle,
  ArrowRightDouble,
  Copy01,
  LeftToRightListBullet,
  MoreVertical,
} from "../../icons";
import { Sheet } from "@heroui-pro/react";
import { Button, ButtonGroup, Dropdown, Label, Popover, Spinner } from "@heroui/react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { common as commonText } from "../../i18n/id/common";
import { reader as readerText } from "../../i18n/id/reader";

import { useReader } from "./reader-context";
import { ReaderStyle } from "./reader-style";
import { TocTree } from "./toc-tree";

import type { JumpProps } from "./jump-form";

const t = readerText;

const JumpForm = dynamic(() => import("./jump-form").then((m) => m.JumpForm), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-16 items-center justify-center">
      <Spinner aria-label={commonText.loading} size="sm" />
    </div>
  ),
});

/** Tablet/desktop: tombol "Lompat" (ikon + teks) dengan popover. */
function JumpToPage(props: JumpProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      {/* Di desktop tombol Daftar isi tersembunyi, jadi tombol ini menjadi ujung awal grup. */}
      <Button className="lg:rounded-s-3xl" size="sm" variant="tertiary">
        <ButtonGroup.Separator className="lg:hidden" />
        <ArrowRightDouble className="size-4" />
        {t.jump}
      </Button>
      <Popover.Content className="w-72" placement="bottom">
        <Popover.Dialog>
          <Popover.Heading className="text-foreground mb-3 text-sm font-semibold">
            {t.jumpHeading}
          </Popover.Heading>
          <JumpForm {...props} onDone={() => setOpen(false)} />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

/**
 * Ponsel: menu ⋮ di ujung grup (Lompat ke halaman, Salin sitasi, Laporkan kesalahan). "Lompat ke
 * halaman" membuka sheet bawah berisi formulir yang sama.
 */
function MobileMenu({ pagePath, ...jump }: JumpProps & { pagePath: string }) {
  const reader = useReader();
  const [jumpOpen, setJumpOpen] = useState(false);

  return (
    <>
      <Dropdown>
        <Button isIconOnly aria-label={t.moreActions} size="sm" variant="tertiary">
          <ButtonGroup.Separator />
          <MoreVertical className="size-4" />
        </Button>
        <Dropdown.Popover className="min-w-56" placement="bottom end">
          <Dropdown.Menu
            aria-label={t.moreActions}
            onAction={(key) => {
              if (key === "jump") setJumpOpen(true);
              if (key === "copy") void reader.copyCitation(pagePath);
              if (key === "report") reader.openReport(null);
            }}
          >
            <Dropdown.Item id="jump" textValue={t.jumpHeading}>
              <ArrowRightDouble className="size-4" />
              <Label>{t.jumpHeading}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="copy" textValue={t.copyCitation}>
              <Copy01 className="size-4" />
              <Label>{t.copyCitation}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="report" textValue={t.report}>
              <AlertCircle className="size-4" />
              <Label>{t.report}</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      <Sheet isOpen={jumpOpen} onOpenChange={setJumpOpen}>
        <Sheet.Backdrop variant="blur">
          <Sheet.Content>
            <Sheet.Dialog>
              <Sheet.Handle />
              <Sheet.CloseTrigger />
              <Sheet.Header>
                <Sheet.Heading>{t.jumpHeading}</Sheet.Heading>
              </Sheet.Header>
              <Sheet.Body className="pb-8">
                <JumpForm {...jump} onDone={() => setJumpOpen(false)} />
              </Sheet.Body>
            </Sheet.Dialog>
          </Sheet.Content>
        </Sheet.Backdrop>
      </Sheet>
    </>
  );
}

/** Ponsel/tablet: daftar isi di sheet bawah berlatar buram (desktop: kolom kiri halaman). */
function TocSheet({
  toc,
  titleSource,
  activeIds,
  className,
  scope,
  segment,
}: {
  /** Pohon ringkas (`pruneToc`); pohon lengkap dimuat saat sheet dibuka (X09). */
  toc: TocItem[];
  segment: string;
  titleSource: TitleSource | null;
  activeIds: number[];
  className?: string;
  /** Permalink halaman baca: sorotan mengikuti halaman sambungan yang sedang dibaca. */
  scope: string;
}) {
  return (
    <Sheet>
      <Sheet.Trigger>
        <Button className={className} size="sm" variant="tertiary">
          <LeftToRightListBullet className="size-4" />
          {t.tocOpen}
        </Button>
      </Sheet.Trigger>
      <Sheet.Backdrop variant="blur">
        <Sheet.Content className="max-h-[85dvh]">
          <Sheet.Dialog>
            <Sheet.Handle />
            <Sheet.CloseTrigger />
            <Sheet.Header>
              <Sheet.Heading>{t.tocHeading}</Sheet.Heading>
            </Sheet.Header>
            <Sheet.Body data-toc-scroll className="pb-6">
              <TocTree
                activeIds={activeIds}
                fullFrom={segment}
                items={toc}
                scope={scope}
                titleSource={titleSource}
              />
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

export function ReaderToolbar({
  toc,
  titleSource,
  activeIds,
  segment,
  volumes,
  juz,
  page,
  pagePath,
  sample,
}: {
  /**
   * Pohon daftar isi TAMPILAN (`loadReaderToc`: + subjudul kurasi + judul Indonesia), versi ringkas
   * (`pruneToc`, X09): pohon lengkap dimuat saat sheet dibuka.
   */
  toc: TocItem[];
  titleSource: TitleSource | null;
  activeIds: number[];
  segment: string;
  volumes: number;
  juz: number;
  page: number;
  pagePath: string;
  /** Awal paragraf pertama halaman (teks DB) untuk pratinjau di panel Tampilan. */
  sample: string | null;
}) {
  const reader = useReader();
  const jump = { juz, page, segment, volumes };

  // Dua susunan (CSS memilih salah satu): ponsel = Daftar isi · Tampilan (melebar) · ⋮ menu;
  // tablet/desktop = Daftar isi (sampai lg) · Lompat · Salin sitasi · Tampilan. role="group" dari
  // ButtonGroup, bukan role="toolbar": pola toolbar ARIA memakai ←/→ antar-kontrol, padahal ←/→
  // di halaman ini membalik halaman (PageNav).
  return (
    <>
      <ButtonGroup
        fullWidth
        aria-label={t.toolbarLabel}
        className="sm:hidden"
        size="sm"
        variant="tertiary"
      >
        <TocSheet
          activeIds={activeIds}
          className="flex-1"
          scope={pagePath}
          segment={segment}
          titleSource={titleSource}
          toc={toc}
        />
        <ReaderStyle separator className="flex-1" sample={sample} />
        <MobileMenu pagePath={pagePath} {...jump} />
      </ButtonGroup>
      <ButtonGroup
        aria-label={t.toolbarLabel}
        className="self-start max-sm:hidden"
        size="sm"
        variant="tertiary"
      >
        <TocSheet
          activeIds={activeIds}
          className="lg:hidden"
          scope={pagePath}
          segment={segment}
          titleSource={titleSource}
          toc={toc}
        />
        <JumpToPage {...jump} />
        <Button onPress={() => void reader.copyCitation(pagePath)}>
          <ButtonGroup.Separator />
          <Copy01 className="size-4" />
          {t.copyCitation}
        </Button>
        <ReaderStyle separator sample={sample} />
      </ButtonGroup>
    </>
  );
}

/** Lapor kesalahan untuk seluruh halaman (di bagian Sumber, bawah halaman). */
export function ReportPageButton() {
  const reader = useReader();
  return (
    <Button
      className="self-start"
      size="sm"
      variant="ghost"
      onPress={() => reader.openReport(null)}
    >
      <AlertCircle className="size-4" />
      {t.report}
    </Button>
  );
}
