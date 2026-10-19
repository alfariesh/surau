"use client";

import type { FormEvent } from "react";

import type { TocItem } from "../../lib/reader/toc";

import { AlertCircle, Copy01, LeftToRightListBullet } from "../../icons";
import { NativeSelect, Sheet } from "@heroui-pro/react";
import { Button, ButtonGroup, Label, NumberField, Popover } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { id } from "../../i18n/id";

import { useReader } from "./reader-context";
import { ReaderStyle } from "./reader-style";
import { TocTree } from "./toc-tree";

const t = id.reader;

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
      {/* Di desktop tombol Daftar isi tersembunyi, jadi tombol ini menjadi ujung awal grup. */}
      <Button className="lg:rounded-s-3xl" size="sm" variant="tertiary">
        <ButtonGroup.Separator className="lg:hidden" />
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

/** Ponsel/tablet: daftar isi di sheet bawah berlatar buram (desktop: kolom kiri halaman). */
function TocSheet({ toc, activeIds }: { toc: TocItem[]; activeIds: number[] }) {
  return (
    <Sheet>
      <Sheet.Trigger>
        <Button className="lg:hidden" size="sm" variant="tertiary">
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
              <TocTree activeIds={activeIds} items={toc} />
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
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
  sample,
}: {
  toc: TocItem[];
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

  return (
    // Satu grup tombol: Daftar isi (ponsel) · Lompat · Salin sitasi · Tampilan. role="group" dari
    // ButtonGroup, bukan role="toolbar": pola toolbar ARIA memakai ←/→ antar-kontrol, padahal ←/→
    // di halaman ini membalik halaman (PageNav).
    <ButtonGroup
      aria-label={t.toolbarLabel}
      className="max-w-full self-start"
      size="sm"
      variant="tertiary"
    >
      <TocSheet activeIds={activeIds} toc={toc} />
      <JumpToPage juz={juz} page={page} segment={segment} volumes={volumes} />
      <Button onPress={() => void reader.copyCitation(pagePath)}>
        <ButtonGroup.Separator />
        <Copy01 className="size-4" />
        {/* Ponsel: ikon saja (label tetap dibacakan), supaya grup muat di layar 360 px. */}
        <span className="max-sm:sr-only">{t.copyCitation}</span>
      </Button>
      <ReaderStyle separator sample={sample} />
    </ButtonGroup>
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
