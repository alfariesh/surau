"use client";

import type { Key } from "@heroui/react";

import { Autocomplete, ListBox, SearchField, Typography, useFilter } from "@heroui/react";

import { home as homeText } from "../../i18n/id/home";

const t = homeText;

export interface SourceWork {
  slug: string;
  /** Judul Latin (teks biasa, bukan Arab: dipakai juga untuk pencarian di daftar). */
  title: string;
}

// Pemilih kitab di kepala kotak cari Beranda (ADR-086): Autocomplete HeroUI = Select bisa banyak
// pilihan + kolom cari di popover. Kosong = semua kitab. Selama korpus baru satu kitab, pilihan ini
// belum mengubah hasil (API Cari/Jawab belum menerima batas per kitab); pemilik ingin bentuknya
// sudah ada sejak sekarang.
export function SourcePicker({
  works,
  value,
  onChange,
}: {
  works: readonly SourceWork[];
  value: Key[];
  onChange: (value: Key[]) => void;
}) {
  const { contains } = useFilter({ sensitivity: "base" });
  const first = works.find((w) => w.slug === value[0]);
  const summary =
    value.length === 0
      ? t.sourceAll
      : value.length === 1 && first
        ? first.title
        : t.sourceCount(value.length);
  return (
    <Autocomplete
      aria-label={t.sourceLabel}
      className="min-w-0"
      selectionMode="multiple"
      value={value}
      onChange={(keys) => onChange(Array.isArray(keys) ? keys : keys === null ? [] : [keys])}
    >
      <Autocomplete.Trigger className="min-w-0">
        <Autocomplete.Value className="truncate">{summary}</Autocomplete.Value>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover className="min-w-64" placement="bottom start">
        <Autocomplete.Filter filter={contains}>
          {/* Fokus pindah ke kolom cari saat popover dibuka (pola resmi HeroUI; popover = dialog). */}
          {/* oxlint-disable-next-line jsx-a11y/no-autofocus */}
          <SearchField aria-label={t.sourceSearch} autoFocus variant="secondary">
            {/* Kolom cari bulat penuh tanpa bayangan. */}
            <SearchField.Group className="rounded-full shadow-none">
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t.sourceSearch} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox
            renderEmptyState={() => (
              <Typography className="px-3 py-2" color="muted" type="body-sm">
                {t.sourceEmpty}
              </Typography>
            )}
          >
            {works.map((work) => (
              <ListBox.Item key={work.slug} id={work.slug} textValue={work.title}>
                {work.title}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
