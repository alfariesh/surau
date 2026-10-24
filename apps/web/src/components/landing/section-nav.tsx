"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@heroui/react";

import { ArrowDown01, PlusSign } from "../../icons";
import { LANDING_SECTIONS, landingNav as t } from "../../i18n/id/landing";

const number = (i: number) => String(i + 1).padStart(2, "0");

// Menu bagian bernomor yang menempel di atas saat digulir (pola template buku, ADR-096), muncul
// sesudah pengantar, bukan menu header. Bagian aktif mengikuti posisi gulir. Ponsel: satu baris
// "nomor + nama bagian aktif" dengan daftar yang bisa dibuka.
export function SectionNav() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const listId = useId();

  useEffect(() => {
    function update() {
      const bar = ref.current;
      if (!bar) return;
      const offset = bar.offsetHeight + 1;
      // Sudah di dasar halaman: bagian terakhir aktif walau judulnya belum mencapai menu.
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
        setActive(LANDING_SECTIONS.length - 1);
        return;
      }
      let next: number | null = null;
      LANDING_SECTIONS.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - offset <= 0) next = i;
      });
      setActive(next);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const shown = active ?? 0;
  return (
    <nav ref={ref} aria-label={t.label} className="sticky top-0 z-40">
      {/* Ponsel */}
      <div className="sm:hidden">
        <div className="bg-background/90 relative flex items-center px-4 py-3 backdrop-blur-sm">
          {open ? null : (
            <>
              <span aria-hidden="true" className="text-accent font-mono text-sm">
                {number(shown)}
              </span>
              <span className="text-foreground ms-4 font-medium">
                {t.sections[LANDING_SECTIONS[shown]!]}
              </span>
            </>
          )}
          <Button
            isIconOnly
            aria-controls={listId}
            aria-expanded={open}
            aria-label={t.toggle}
            className="ms-auto"
            size="sm"
            variant="ghost"
            onPress={() => setOpen((v) => !v)}
          >
            {open ? <PlusSign className="size-5 rotate-45" /> : <ArrowDown01 className="size-5" />}
          </Button>
        </div>
        {open ? (
          <ol
            className="bg-background/95 absolute inset-x-0 top-0 -z-10 pt-14 pb-3 backdrop-blur-sm"
            id={listId}
          >
            {LANDING_SECTIONS.map((id, i) => (
              <li key={id}>
                <a
                  className="flex items-center px-4 py-2"
                  href={`#${id}`}
                  onClick={() => setOpen(false)}
                >
                  <span aria-hidden="true" className="text-accent font-mono text-sm">
                    {number(i)}
                  </span>
                  <span className="text-foreground ms-4 font-medium">{t.sections[id]}</span>
                </a>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {/* Layar lebar: tab tinggi bernomor, garis bawah pada bagian aktif */}
      <div className="border-separator bg-background/90 hidden h-28 justify-center border-b backdrop-blur-sm sm:flex">
        <ol className="-mb-px grid auto-cols-[minmax(0,15rem)] grid-flow-col">
          {LANDING_SECTIONS.map((id, i) => {
            const current = i === active;
            return (
              <li key={id} className="flex">
                <a
                  aria-current={current ? "true" : undefined}
                  className={`focus-visible:ring-focus flex w-full flex-col items-center justify-center gap-1.5 border-b-2 px-3 font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset ${
                    current
                      ? "border-accent bg-accent-soft text-accent"
                      : "text-foreground hover:bg-accent-soft/40 border-transparent"
                  }`}
                  href={`#${id}`}
                >
                  <span
                    aria-hidden="true"
                    className={`font-mono text-sm ${current ? "text-accent" : "text-muted"}`}
                  >
                    {number(i)}
                  </span>
                  <span className="text-center">{t.sections[id]}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
