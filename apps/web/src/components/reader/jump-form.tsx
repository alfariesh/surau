"use client";

import type { FormEvent } from "react";

import { NativeSelect } from "@heroui-pro/react";
import { Button, Label, NumberField } from "@heroui/react";
import { useRouter } from "next/navigation";

import { reader as readerText } from "../../i18n/id/reader";

const t = readerText;

// Formulir "Lompat ke halaman" (popover desktop, sheet ponsel). Diunduh saat pertama kali dibuka
// (X09): NumberField dan NativeSelect tidak ikut JS awal halaman baca.

export interface JumpProps {
  segment: string;
  volumes: number;
  juz: number;
  page: number;
}

/** Isi "Lompat ke halaman": pilih juz + nomor halaman cetak. */
export function JumpForm({
  segment,
  volumes,
  juz,
  page,
  onDone,
}: JumpProps & { onDone: () => void }) {
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const toJuz = Number(form.get("juz"));
    const toPage = Number(form.get("page"));
    if (!Number.isInteger(toJuz) || !Number.isInteger(toPage) || toJuz < 1 || toPage < 0) return;
    onDone();
    router.push(`/kitab/${segment}/${toJuz}/${toPage}`);
  }

  return (
    <form className="flex items-end gap-2" onSubmit={submit}>
      <div className="flex flex-col gap-1">
        <label className="text-foreground text-sm font-medium" htmlFor={`lompat-juz-${segment}`}>
          {t.jumpJuz}
        </label>
        <NativeSelect>
          <NativeSelect.Trigger defaultValue={String(juz)} id={`lompat-juz-${segment}`} name="juz">
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
  );
}
