"use client";

import { Magnifier } from "@gravity-ui/icons";
import { Button, Kbd } from "@heroui/react";
import { Command } from "@heroui-pro/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { id } from "../../i18n/id";
import { searchPageHref } from "../../lib/search/segments";
import { ExampleText } from "../search/example-text";

const t = id.search;

const noSubscribe = () => () => {};

// Palet pencarian global (S14 langkah 6): ⌘K / Ctrl+K dari halaman mana pun, atau tombol di
// navbar (juga di ponsel). Enter atau item pertama → /cari?q=…; contoh kueri sebagai pintasan.
// Command tidak punya pintasan bawaan, jadi listener keydown dipasang di sini.
export function SearchPalette() {
  const router = useRouter();
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Enter bisa memicu onSubmit dan aksi item terfokus sekaligus: hanya yang pertama yang jalan.
  const fired = useRef(false);
  // ⌘ di Apple, Ctrl di lainnya; server dan hidrasi pertama memakai Ctrl.
  const mac = useSyncExternalStore(
    noSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => false,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((wasOpen) => {
          if (!wasOpen) fired.current = false;
          return !wasOpen;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function open(next: boolean) {
    if (next) fired.current = false;
    setOpen(next);
  }

  function go(raw: string) {
    const q = raw.trim();
    if (q === "" || fired.current) return;
    fired.current = true;
    setOpen(false);
    setQuery("");
    router.push(searchPageHref(q, null));
  }

  const q = query.trim();

  return (
    <>
      <Button
        aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
        aria-label={t.paletteOpen}
        size="sm"
        variant="tertiary"
        onPress={() => open(true)}
      >
        <Magnifier className="size-4" />
        <span className="max-sm:hidden">{t.paletteOpen}</span>
        <Kbd className="max-sm:hidden" variant="light">
          <Kbd.Abbr keyValue={mac ? "command" : "ctrl"} />
          <Kbd.Content>K</Kbd.Content>
        </Kbd>
      </Button>
      <Command>
        <Command.Backdrop isOpen={isOpen} onOpenChange={open}>
          <Command.Container size="lg">
            <Command.Dialog aria-label={t.paletteLabel} inputValue={query} onInputChange={setQuery}>
              <Command.InputGroup aria-label={t.inputLabel} onSubmit={go}>
                <Command.InputGroup.Prefix>
                  <Magnifier className="size-4" />
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
                      <Magnifier className="size-4" />
                      <bdi>{t.paletteGo(q)}</bdi>
                    </Command.Item>
                  </Command.Group>
                ) : null}
                <Command.Group heading={t.paletteExamples}>
                  {t.examples.map((ex) => (
                    <Command.Item
                      key={ex}
                      id={`contoh-${ex}`}
                      textValue={ex}
                      onAction={() => go(ex)}
                    >
                      <ExampleText text={ex} />
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command.Dialog>
          </Command.Container>
        </Command.Backdrop>
      </Command>
    </>
  );
}
