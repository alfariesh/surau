"use client";

import { Search01 } from "../../icons";
import { Button, Kbd, Tooltip } from "@heroui/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { search as searchText } from "../../i18n/id/search";
import { searchPageHref } from "../../lib/search/segments";

const t = searchText;

const noSubscribe = () => () => {};

// Dialog Command (palet) diunduh saat pertama dibuka atau tombolnya didekati (X09).
const loadDialog = () => import("./search-palette-dialog");
const preloadDialog = () => void loadDialog();
const SearchPaletteDialog = dynamic(() => loadDialog().then((m) => m.SearchPaletteDialog), {
  ssr: false,
});

// Palet pencarian global (S14 langkah 6): ⌘K / Ctrl+K dari halaman mana pun, atau tombol di
// navbar (ikon, juga di ponsel). Enter atau item pertama → /cari?q=…; contoh kueri sebagai pintasan.
// Command tidak punya pintasan bawaan, jadi listener keydown dipasang di sini.
export function SearchPalette() {
  const router = useRouter();
  const [isOpen, setOpen] = useState(false);
  // Dialog dipasang sejak pertama dibuka dan tetap terpasang (animasi tutup, isian terakhir).
  const [mounted, setMounted] = useState(false);
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
        setMounted(true);
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
    if (next) {
      fired.current = false;
      setMounted(true);
    }
    setOpen(next);
  }

  function go(raw: string): boolean {
    const q = raw.trim();
    if (q === "" || fired.current) return false;
    fired.current = true;
    setOpen(false);
    router.push(searchPageHref(q, null));
    return true;
  }

  return (
    <>
      {/* Ikon saja (navbar ringkas); nama dan pintasannya ada di aria-label dan tooltip. */}
      <Tooltip delay={300}>
        <Button
          isIconOnly
          aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
          aria-label={t.paletteOpen}
          size="sm"
          variant="ghost"
          onFocus={preloadDialog}
          onHoverStart={preloadDialog}
          onPress={() => open(true)}
        >
          <Search01 className="size-4" />
        </Button>
        <Tooltip.Content className="flex items-center gap-2" placement="bottom">
          {t.paletteOpen}
          <Kbd aria-hidden="true" variant="light">
            <Kbd.Abbr keyValue={mac ? "command" : "ctrl"} />
            <Kbd.Content>K</Kbd.Content>
          </Kbd>
        </Tooltip.Content>
      </Tooltip>
      {mounted ? <SearchPaletteDialog isOpen={isOpen} onGo={go} onOpenChange={open} /> : null}
    </>
  );
}
