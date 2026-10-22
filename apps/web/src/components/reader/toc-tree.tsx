"use client";

import type { TitleSource } from "../../lib/reader/reader-toc";
import type { TocItem } from "../../lib/reader/toc";

import { Typography } from "@heroui/react";
import { Book02, Book02Duotone, ChevronRight, FileEmpty02, FileEmpty02Duotone } from "../../icons";
import { useEffect, useId, useMemo, useRef, useSyncExternalStore } from "react";
import {
  Button,
  Collection,
  Link,
  NavigationTree,
  NavigationTreeItem,
  NavigationTreeItemContent,
} from "react-aria-components";

import { reader as readerText } from "../../i18n/id/reader";
import { modelName } from "../../lib/model-names";
import { ArabicInline } from "../arabic";
import { fullTocFor, loadFullToc, subscribeFullToc } from "../../lib/reader/full-toc";
import { readerPageFor, subscribeReaderPage } from "../../lib/reader/reader-page-event";
import { tocHref, tocPath, tocRows } from "../../lib/reader/toc";

const t = readerText;

/** Tanggal ISO (YYYY-MM-DD) → "21 Oktober 2026" (UTC, sama di server dan klien). */
const longDate = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/**
 * Label judul Indonesia di kepala daftar isi (X04 W8): satu label "terjemahan AI" untuk semua
 * judul, dengan model, versi prompt, dan tanggalnya (teks-arab.md aturan 8).
 */
function TitleNote({ id: noteId, source }: { id: string; source: TitleSource }) {
  const dates =
    source.from === source.to
      ? longDate(source.from)
      : `${longDate(source.from)}–${longDate(source.to)}`;
  return (
    <Typography className="toc-title-note" color="muted" id={noteId} type="body-xs">
      <span aria-hidden="true" className="ai-badge">
        {t.tocTitleBadge}
      </span>{" "}
      {t.tocTitleNote(
        source.models.map(modelName).join(", "),
        source.prompts.join(", "),
        dates,
        source.statuses.map((st) => t.aiReview[st]).join(" / "),
      )}
    </Typography>
  );
}

// Pohon daftar isi (S09 langkah 4, gaya garis pemandu menyusul): bisa diciutkan per node, setiap
// baris tautan ke judul bagian (`#bab-<id>`, navigasi klien lewat RouterProvider) atau, untuk
// subjudul kurasi (X04 W7), ke paragrafnya (`#pN`). Hanya SATU baris aktif berlatar (bagian
// terakhir yang tampil di halaman ini, `activeIds.at(-1)`); garis dari induknya ke baris itu
// berwarna aksen. Judul Arab persis dari DB lewat ArabicInline (<bdi>); judul Indonesia (terjemahan
// AI, X04 W8) di atasnya bila ada, dengan satu label di kepala pohon.
export function TocTree({
  items: given,
  activeIds = [],
  className,
  fullFrom,
  scope,
  titleSource = null,
}: {
  items: TocItem[];
  activeIds?: number[];
  className?: string;
  /**
   * Segmen karya bila `items` hanya pohon ringkas (`pruneToc`, halaman baca, X09): pohon lengkap
   * diambil begitu pohon ini tampil di layar (panel samping desktop, sheet ponsel saat dibuka).
   */
  fullFrom?: string;
  /** Permalink halaman baca (server): bagian aktif mengikuti halaman sambungan yang sedang dibaca. */
  scope?: string;
  /** Sumber judul Indonesia (model, prompt, tanggal); `null` = pohon tanpa judul Indonesia. */
  titleSource?: TitleSource | null;
}) {
  const noteId = useId();
  const full = useSyncExternalStore(
    subscribeFullToc,
    () => (fullFrom === undefined ? null : fullTocFor(fullFrom)),
    () => null,
  );
  const items = full?.items ?? given;
  // Gulir bersambung (X04 W6): bagian aktif mengikuti halaman yang sedang dibaca, juga untuk pohon
  // di sheet ponsel yang baru dipasang saat dibuka (nilai terakhir disimpan di modul).
  const live = useSyncExternalStore(
    subscribeReaderPage,
    () => (scope === undefined ? null : (readerPageFor(scope)?.activeIds ?? null)),
    () => null,
  );
  const activeId = (live ?? activeIds).at(-1);
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

  // Pohon ringkas → lengkap (X09): ambil hanya bila pohon ini terlihat (panel samping disembunyikan
  // di ponsel tidak pernah berpotongan dengan layar), dan pada muat pertama baru sesudah halaman
  // selesai dimuat, supaya tidak berebut jaringan dengan isi halaman.
  useEffect(() => {
    const el = ref.current;
    if (fullFrom === undefined || full !== null || !el) return;
    let cancel = () => {};
    const start = () => {
      if (document.readyState === "complete") {
        loadFullToc(fullFrom);
        return;
      }
      const onLoad = () => loadFullToc(fullFrom);
      window.addEventListener("load", onLoad, { once: true });
      cancel = () => window.removeEventListener("load", onLoad);
    };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        start();
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancel();
    };
  }, [fullFrom, full]);
  useEffect(() => {
    const box = ref.current?.closest<HTMLElement>("[data-toc-scroll]");
    const target = ref.current?.querySelector<HTMLElement>("[data-current]");
    if (!box || !target) return;
    const offset = target.getBoundingClientRect().top - box.getBoundingClientRect().top;
    box.scrollTop += offset - box.clientHeight / 3;
  }, [activeId]);

  return (
    <>
      {titleSource ? <TitleNote id={noteId} source={titleSource} /> : null}
      <NavigationTree
        ref={ref}
        aria-describedby={titleSource ? noteId : undefined}
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
              textValue={item.titleId ?? item.title}
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
                      data-sub={item.kind === "sub" || undefined}
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
                        {item.titleId ? (
                          <span className="toc-titles">
                            <span className="toc-title-id" lang="id">
                              {item.titleId}
                            </span>
                            <ArabicInline className="toc-title toc-title-ar">
                              {item.title}
                            </ArabicInline>
                          </span>
                        ) : (
                          <ArabicInline className="toc-title">{item.title}</ArabicInline>
                        )}
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
    </>
  );
}
