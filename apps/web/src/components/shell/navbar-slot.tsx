"use client";

import type { ReactNode } from "react";

import { createContext, use, useState } from "react";
import { createPortal } from "react-dom";

// Slot di navbar untuk judul ringkas halaman (mis. pembaca kitab: lingkar progres + juz/halaman
// saat judul besar sudah tergulir). Halaman merender isinya lewat portal, jadi state-nya (progres
// gulir) tetap milik halaman dan navbar tidak ikut dirender ulang.

const SlotContext = createContext<{
  slot: HTMLElement | null;
  setSlot: (el: HTMLElement | null) => void;
} | null>(null);

export function NavbarSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return <SlotContext value={{ slot, setSlot }}>{children}</SlotContext>;
}

/** Wadah slot di dalam navbar. */
export function NavbarSlotTarget({ className }: { className?: string }) {
  const ctx = use(SlotContext);
  return <div ref={ctx?.setSlot} className={className} />;
}

/** Render `children` ke slot navbar (tidak merender apa-apa sebelum slot terpasang). */
export function NavbarSlot({ children }: { children: ReactNode }) {
  const slot = use(SlotContext)?.slot ?? null;
  return slot === null ? null : createPortal(children, slot);
}
