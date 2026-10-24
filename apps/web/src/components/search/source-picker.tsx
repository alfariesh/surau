"use client";

import type { Key } from "@heroui/react";

import { Autocomplete, ListBox, SearchField, Typography, useFilter } from "@heroui/react";

import type { SectionOption } from "../../lib/search/section-pick";

import { selectedSection } from "../../lib/search/section-pick";

import { home as homeText } from "../../i18n/id/home";
import { Book02 } from "../../icons";
import { ArabicInline } from "../arabic";

const t = homeText;

export interface SourceWork {
  slug: string;
  /** Judul Latin (teks biasa, bukan Arab: dipakai juga untuk pencarian di daftar). */
  title: string;
}

const ALL = "semua";
const sectionKey = (id: number) => `bagian-${id}`;

/** Bagian terpilih dari kunci daftar: null = seluruh kitab (semua / satu karya). */
function sectionOf(key: Key | null): number | null {
  const m = typeof key === "string" ? /^bagian-(\d+)$/.exec(key) : null;
  return m ? Number(m[1]) : null;
}

// Pemilih sumber di kepala kotak cari (ADR-086, ADR-087): Autocomplete HeroUI = Select + kolom cari
// di popover. Daftar bertingkat: pilihan teratas = seluruh kitab (judul kitab satu-satunya, atau
// "Semua kitab"), lalu rub' dan kitab di dalamnya (judul Arab dari DB lewat ArabicInline; dicari
// dengan huruf Arab). Satu pilihan: API Cari hanya menerima satu `bagian`. Bagian selalu milik
// SEARCH_WORK (Ihya); dengan lebih dari satu karya, daftar per karya perlu dibangun (ADR-087).
export function SourcePicker({
  works,
  sections,
  section,
  onChange,
}: {
  works: readonly SourceWork[];
  sections: readonly SectionOption[];
  section: number | null;
  onChange: (section: number | null) => void;
}) {
  const { contains } = useFilter({ sensitivity: "base" });
  const { rub, kitab } = selectedSection(sections, section);
  const picked = kitab ?? rub;
  const value = picked ? sectionKey(picked.id) : ALL;
  const allLabel = works.length === 1 ? works[0]!.title : t.sourceAll;
  return (
    <Autocomplete
      aria-label={t.sourceLabel}
      className="min-w-0"
      selectionMode="single"
      value={value}
      onChange={(key) => onChange(sectionOf(key))}
    >
      {/* Sejajar dengan Segment di kanan: tanpa latar (latar --default saat hover), tinggi 32px,
          bulat penuh, tanpa bayangan, teks 12px/500. */}
      <Autocomplete.Trigger className="hover:bg-default h-8 min-h-8 min-w-0 items-center gap-1.5 rounded-full bg-transparent py-0 ps-2.5 pe-7 shadow-none">
        <Book02 aria-hidden="true" className="text-muted size-4 shrink-0" />
        <Autocomplete.Value className="truncate text-xs leading-4 font-medium">
          {picked ? <ArabicInline>{picked.title}</ArabicInline> : allLabel}
        </Autocomplete.Value>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover className="max-h-96 min-w-72" placement="bottom start">
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
            <ListBox.Item id={ALL} textValue={allLabel}>
              {allLabel}
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {sections.flatMap((rub) => [
              <ListBox.Item
                key={rub.id}
                className="ps-6"
                id={sectionKey(rub.id)}
                textValue={rub.title}
              >
                <ArabicInline>{rub.title}</ArabicInline>
                <ListBox.ItemIndicator />
              </ListBox.Item>,
              ...rub.children.map((kitab) => (
                <ListBox.Item
                  key={kitab.id}
                  className="ps-10"
                  id={sectionKey(kitab.id)}
                  textValue={kitab.title}
                >
                  <ArabicInline>{kitab.title}</ArabicInline>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )),
            ])}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
