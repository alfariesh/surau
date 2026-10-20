"use client";

import { Button, Dropdown, Label, Typography } from "@heroui/react";
import { useEffect, useState } from "react";

import { LeftToRightListBullet } from "../icons";
import { id } from "../i18n/id";

export interface OnThisPageItem {
  /** ID elemen bagian (jangkar `#<id>`, lihat PageSection). */
  id: string;
  label: string;
}

/**
 * Bagian yang sedang dibaca: bagian terakhir yang judulnya sudah melewati batas atas layar (di
 * bawah navbar). Dihitung dari posisi, bukan IntersectionObserver, supaya bagian pendek di akhir
 * halaman tetap bisa aktif saat halaman mentok di bawah.
 */
function useActiveSection(ids: readonly string[]): string | undefined {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const offset = 120;
      let current = ids[0];
      for (const sectionId of ids) {
        const el = document.getElementById(sectionId);
        if (el && el.getBoundingClientRect().top <= offset) current = sectionId;
      }
      const scroller = document.scrollingElement;
      if (
        scroller &&
        scroller.scrollHeight > window.innerHeight &&
        scroller.scrollTop + window.innerHeight >= scroller.scrollHeight - 4
      ) {
        current = ids.at(-1) ?? current;
      }
      setActive(current);
    }
    function schedule() {
      if (frame === 0) frame = requestAnimationFrame(update);
    }
    update();
    // `capture`: halaman bisa digulir oleh window atau oleh wadah utama AppLayout.
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [ids]);

  return active;
}

/** Ponsel/tablet: tombol menu ringkas "Di halaman ini" di bawah judul halaman. */
export function OnThisPageMenu({ items }: { items: OnThisPageItem[] }) {
  const heading = id.common.onThisPage;
  return (
    <div className="lg:hidden">
      <Dropdown>
        <Button size="sm" variant="tertiary">
          <LeftToRightListBullet className="size-4" />
          {heading}
        </Button>
        <Dropdown.Popover placement="bottom start">
          <Dropdown.Menu aria-label={heading}>
            {items.map((item) => (
              <Dropdown.Item key={item.id} href={`#${item.id}`} id={item.id} textValue={item.label}>
                <Label>{item.label}</Label>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}

/** Desktop: kolom kanan yang menempel saat digulir, bagian yang sedang dibaca ditandai. */
export function OnThisPageNav({ items }: { items: OnThisPageItem[] }) {
  const [ids] = useState(() => items.map((item) => item.id));
  const active = useActiveSection(ids);
  const heading = id.common.onThisPage;

  return (
    <nav aria-label={heading} className="sticky top-24 hidden flex-col gap-3 lg:flex">
      <Typography type="body-sm" weight="semibold">
        {heading}
      </Typography>
      <ul className="border-separator flex flex-col border-s">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <li key={item.id}>
              <a
                aria-current={isActive ? "location" : undefined}
                className={`-ms-px block border-s-2 py-1.5 ps-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${
                  isActive
                    ? "border-accent text-foreground font-medium"
                    : "text-muted hover:text-foreground border-transparent"
                }`}
                href={`#${item.id}`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
