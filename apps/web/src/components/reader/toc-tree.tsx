"use client";

import type { TocItem } from "../../lib/reader/toc";

import { Book02, Book02Duotone, ChevronRight, FileEmpty02, FileEmpty02Duotone } from "../../icons";
import { useEffect, useMemo, useRef } from "react";
import {
  Button,
  Collection,
  Link,
  NavigationTree,
  NavigationTreeItem,
  NavigationTreeItemContent,
} from "react-aria-components";

import { id } from "../../i18n/id";
import { ArabicInline } from "../arabic";
import { tocHref, tocPath, tocRows } from "../../lib/reader/toc";

const t = id.reader;

// Pohon daftar isi (S09 langkah 4, gaya garis pemandu menyusul): bisa diciutkan per node, setiap
// baris tautan ke judul bagian (`#bab-<id>`, navigasi klien lewat RouterProvider). Hanya SATU baris
// aktif berlatar (bagian terakhir yang tampil di halaman ini, `activeIds.at(-1)`); garis dari
// induknya ke baris itu berwarna aksen. Judul Arab persis dari DB lewat ArabicInline (<bdi>).
export function TocTree({
  items,
  activeIds = [],
  className,
}: {
  items: TocItem[];
  activeIds?: number[];
  className?: string;
}) {
  const activeId = activeIds.at(-1);
  const active = useMemo(
    () => (activeId === undefined ? undefined : tocPath(items, activeId)),
    [items, activeId],
  );
  const rows = useMemo(() => tocRows(items, activeId), [items, activeId]);
  const expanded = useMemo(() => (active ?? []).slice(0, -1).map((n) => n.id), [active]);
  const current = active?.at(-1);
  // Baris aktif dan semua induknya (jalur dari akar) berikon duotone, supaya posisi pembaca terlihat.
  const pathIds = useMemo(() => new Set((active ?? []).map((n) => n.id)), [active]);
  const currentParent = active?.at(-2);

  // Di panel samping (berkelas `data-toc-scroll`), gulir panel ke bagian aktif saat halaman dibuka,
  // tanpa menggulir halaman itu sendiri.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current?.closest<HTMLElement>("[data-toc-scroll]");
    const target = ref.current?.querySelector<HTMLElement>("[data-current]");
    if (!box || !target) return;
    const offset = target.getBoundingClientRect().top - box.getBoundingClientRect().top;
    box.scrollTop += offset - box.clientHeight / 3;
  }, [activeId]);

  return (
    <NavigationTree
      ref={ref}
      aria-label={t.tocLabel}
      className={className ? `toc-tree ${className}` : "toc-tree"}
      // Garis dan batang aksen dibaca dari closure: cache baris react-aria ikut diperbarui.
      dependencies={[rows, currentParent, pathIds]}
      defaultExpandedKeys={expanded}
      items={items}
      selectedRoute={current ? tocHref(current) : null}
    >
      {function renderItem(item: TocItem) {
        const row = rows.get(item.id);
        return (
          <NavigationTreeItem
            className="toc-item"
            href={tocHref(item)}
            id={item.id}
            textValue={item.title}
          >
            <NavigationTreeItemContent>
              {({ hasChildItems, isExpanded, isCurrent, isFocusVisible }) => (
                <>
                  {row?.guides.map((g, i) => (
                    <span
                      key={`${i}-${g.kind}`}
                      aria-hidden="true"
                      className="toc-guide"
                      data-accent={g.accent}
                      data-kind={g.kind}
                    />
                  ))}
                  <div
                    className="toc-row"
                    data-current={isCurrent || undefined}
                    data-expanded={(hasChildItems && isExpanded) || undefined}
                    data-focus-visible={isFocusVisible || undefined}
                    data-stem-accent={item === currentParent || undefined}
                  >
                    {hasChildItems ? (
                      <Button className="toc-chevron" slot="chevron">
                        <ChevronRight
                          aria-hidden="true"
                          className="toc-chevron-icon"
                          data-expanded={isExpanded || undefined}
                        />
                      </Button>
                    ) : row?.chevronSlot ? (
                      <span aria-hidden="true" className="toc-chevron" />
                    ) : null}
                    <Link className="toc-link">
                      {/* Tingkat pertama (kitab/rub') berikon buku, tingkat di bawahnya berikon berkas;
                          baris aktif dan induknya memakai gaya duotone seperti menu aktif di sidebar. */}
                      {(() => {
                        const Icon =
                          row && row.guides.length > 0
                            ? pathIds.has(item.id)
                              ? FileEmpty02Duotone
                              : FileEmpty02
                            : pathIds.has(item.id)
                              ? Book02Duotone
                              : Book02;
                        return <Icon aria-hidden="true" className="toc-icon" />;
                      })()}
                      <ArabicInline className="toc-title">{item.title}</ArabicInline>
                    </Link>
                  </div>
                </>
              )}
            </NavigationTreeItemContent>
            {item.children.length > 0 ? (
              <Collection dependencies={[rows, currentParent, pathIds]} items={item.children}>
                {renderItem}
              </Collection>
            ) : null}
          </NavigationTreeItem>
        );
      }}
    </NavigationTree>
  );
}
