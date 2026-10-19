import type { ReactNode } from "react";

import type { OnThisPageItem } from "./on-this-page";

import { PAGE_FRAME } from "../lib/layout";

import { OnThisPageMenu, OnThisPageNav } from "./on-this-page";

/**
 * Kerangka halaman teks (Tentang, MCP, Lisensi): kolom baca ±42rem di kiri, daftar isi "Di halaman
 * ini" di kanan (desktop) atau tombol menu di bawah judul (ponsel). `sections` = urutan PageSection.
 */
export function TextPage({
  header,
  sections,
  children,
}: {
  header: ReactNode;
  sections: OnThisPageItem[];
  children: ReactNode;
}) {
  return (
    <div
      className={`${PAGE_FRAME} grid gap-10 pt-8 pb-16 sm:pt-12 lg:grid-cols-[minmax(0,42rem)_13rem] lg:justify-between`}
    >
      <article className="flex min-w-0 flex-col gap-10">
        <div className="flex flex-col gap-5">
          {header}
          <OnThisPageMenu items={sections} />
        </div>
        {children}
      </article>
      <aside className="hidden lg:block">
        <OnThisPageNav items={sections} />
      </aside>
    </div>
  );
}
