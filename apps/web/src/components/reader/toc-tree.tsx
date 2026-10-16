"use client";

import type { TocItem } from "../../lib/reader/toc";

import { FileTree } from "@heroui-pro/react";
import { useEffect, useMemo, useRef } from "react";
import { Collection } from "react-aria-components";

import { id } from "../../i18n/id";
import { tocPath } from "../../lib/reader/toc";

const t = id.reader;

// Pohon daftar isi (S09 langkah 4): bisa diciutkan per node, bagian aktif tersorot dan leluhurnya
// terbuka. Setiap baris adalah tautan ke halaman awal bagian (navigasi klien lewat RouterProvider).
// Judul Arab persis dari DB, diisolasi arahnya dengan <bdi> (halaman tetap LTR).
export function TocTree({
  items,
  activeIds = [],
  className,
}: {
  items: TocItem[];
  activeIds?: number[];
  className?: string;
}) {
  const active = useMemo(() => new Set(activeIds), [activeIds]);
  const expanded = useMemo(() => {
    const keys = new Set<number>();
    for (const activeId of activeIds) {
      for (const node of tocPath(items, activeId).slice(0, -1)) keys.add(node.id);
    }
    return [...keys];
  }, [items, activeIds]);

  // Di panel samping (berkelas `data-toc-scroll`), gulir panel ke bagian aktif saat halaman dibuka,
  // tanpa menggulir halaman itu sendiri.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current?.closest<HTMLElement>("[data-toc-scroll]");
    const target = ref.current?.querySelector<HTMLElement>(".toc-active");
    if (!box || !target) return;
    const offset = target.getBoundingClientRect().top - box.getBoundingClientRect().top;
    box.scrollTop += offset - box.clientHeight / 3;
  }, [activeIds]);

  return (
    <div ref={ref}>
      <FileTree
        aria-label={t.tocLabel}
        className={className ? `toc-tree ${className}` : "toc-tree"}
        defaultExpandedKeys={expanded}
        items={items}
        showGuideLines="hover"
        size="sm"
      >
        {function renderItem(item: TocItem) {
          const isActive = active.has(item.id);
          return (
            <FileTree.Item
              className={isActive ? "toc-active" : undefined}
              href={item.href}
              id={item.id}
              textValue={item.title}
              title={
                <span className="flex min-w-0 flex-col items-start">
                  <bdi className="arabic-inline toc-title" dir="rtl" lang="ar">
                    {item.title}
                  </bdi>
                  <span className="text-muted text-[0.7rem] tabular-nums">
                    {t.pageShort(item.juz, item.page)}
                    {isActive ? <span className="sr-only"> {t.tocActive}</span> : null}
                  </span>
                </span>
              }
            >
              {item.children.length > 0 ? (
                <Collection items={item.children}>{renderItem}</Collection>
              ) : null}
            </FileTree.Item>
          );
        }}
      </FileTree>
    </div>
  );
}
