"use client";

import { Search01 } from "../../icons";
import { Command } from "@heroui-pro/react";
import { useState } from "react";

import { search as searchText } from "../../i18n/id/search";
import { ExampleText } from "../search/example-text";

const t = searchText;

// Isi palet pencarian (dialog Command). Diunduh saat palet pertama kali dibuka (X09), bukan bersama
// JS awal setiap halaman; tombol dan pintasan ⌘K / Ctrl+K ada di search-palette.tsx.
export function SearchPaletteDialog({
  isOpen,
  onOpenChange,
  onGo,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kueri dipilih (Enter atau item); `true` = diterima, kolom dikosongkan. */
  onGo: (raw: string) => boolean;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim();

  function go(raw: string) {
    if (onGo(raw)) setQuery("");
  }

  return (
    <Command>
      <Command.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Command.Container size="lg">
          <Command.Dialog aria-label={t.paletteLabel} inputValue={query} onInputChange={setQuery}>
            <Command.InputGroup aria-label={t.inputLabel} onSubmit={go}>
              <Command.InputGroup.Prefix>
                <Search01 className="size-4" />
              </Command.InputGroup.Prefix>
              <Command.InputGroup.Input
                dir="auto"
                maxLength={200}
                placeholder={t.palettePlaceholder}
              />
              <Command.InputGroup.ClearButton />
            </Command.InputGroup>
            <Command.List>
              {q !== "" ? (
                <Command.Group heading={t.paletteHint}>
                  <Command.Item id="cari" textValue={q} onAction={() => go(q)}>
                    <Search01 className="size-4" />
                    <bdi>{t.paletteGo(q)}</bdi>
                  </Command.Item>
                </Command.Group>
              ) : null}
              <Command.Group heading={t.paletteExamples}>
                {t.examples.map((ex) => (
                  <Command.Item key={ex} id={`contoh-${ex}`} textValue={ex} onAction={() => go(ex)}>
                    <ExampleText text={ex} />
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command.Dialog>
        </Command.Container>
      </Command.Backdrop>
    </Command>
  );
}
