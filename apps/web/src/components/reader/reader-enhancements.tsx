"use client";

import { useEffect } from "react";

import type { CopyPiece } from "../../lib/reader/id-text";

import { reader as readerText } from "../../i18n/id/reader";
import { revealFor, toggleArabic, toggleTranslation } from "../../lib/reader/fold";
import { labelledCopy } from "../../lib/reader/id-text";

const t = readerText;

// Perilaku halaman baca yang bekerja lewat satu pendengar di dokumen (X04), sehingga berlaku juga
// untuk halaman sambungan gulir bersambung tanpa memasang ulang apa pun:
// 1. Salin teks: bila seleksi menyentuh terjemahan atau ringkasan AI, salinan diberi label per
//    segmen ("(Terjemahan AI, <permalink>)", "(Ringkasan AI, …)", label ayat Kemenag); teks lain
//    (Arab) tetap apa adanya. Skrip, gaya, dan teks yang tidak dirender tidak ikut.
//    Seleksi yang hanya berisi teks Arab memakai salin bawaan browser (verbatim).
// 2. Mode "terjemahan dilipat" (dan paragraf yang dibuka sementara di mode Arab, X11): tombol
//    `.translation-toggle` membuka/menutup terjemahan paragrafnya; di mode Terjemahan tombol
//    `.arabic-toggle` membuka/menutup teks Arabnya (lib/reader/fold.ts).
// 3. Tautan `#…` ke teks yang tersembunyi mode baca atau lipatan membukanya lebih dulu (X11).

const BLOCKS =
  ".passage-translation, .arabic-text, .reader-inline-subheading, .verse-row, li, h1, h2, h3, p";

function ids() {
  const map = new WeakMap<Element, string>();
  let next = 0;
  return (el: Element) => {
    let v = map.get(el);
    if (v === undefined) {
      v = String(next++);
      map.set(el, v);
    }
    return v;
  };
}

/** Potongan seleksi beserta asalnya, atau `null` bila seleksi tidak menyentuh terjemahan. */
export function selectionPieces(selection: Selection, origin: string): CopyPiece[] | null {
  if (selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const common = range.commonAncestorContainer;
  const rootEl = common instanceof Element ? common : common.parentElement;
  if (rootEl === null) return null;
  const touches =
    rootEl.closest("[data-tr-seg]") !== null ||
    [...rootEl.querySelectorAll("[data-tr-seg]")].some((el) => range.intersectsNode(el));
  if (!touches) return null;

  const groupId = ids();
  const blockId = ids();
  const pieces: CopyPiece[] = [];
  const labelled = new Set<string>();
  const walker = document.createTreeWalker(common, NodeFilter.SHOW_TEXT);
  let node: Node | null = common.nodeType === Node.TEXT_NODE ? common : walker.nextNode();
  for (; node !== null; node = walker.nextNode()) {
    if (!range.intersectsNode(node)) continue;
    const parent = node.parentElement;
    if (
      parent === null ||
      parent.closest(
        '[data-copy-skip], [aria-hidden="true"], script, style, noscript, template',
      ) !== null ||
      // Teks yang tidak dirender (display: none, mis. terjemahan dilipat atau duplikat responsif)
      // tidak ikut, sama dengan salin bawaan browser.
      (typeof parent.checkVisibility === "function" &&
        !parent.checkVisibility({ checkVisibilityCSS: true }))
    ) {
      continue;
    }
    let text = node.textContent ?? "";
    if (node === range.endContainer) text = text.slice(0, range.endOffset);
    if (node === range.startContainer) text = text.slice(range.startOffset);
    if (text === "") continue;
    const seg = parent.closest<HTMLElement>("[data-tr-seg]");
    const block = parent.closest(BLOCKS) ?? rootEl;
    const segKind = seg?.dataset.trSeg;
    const kind =
      segKind === "ai" || segKind === "ayah" || segKind === "summary" ? segKind : "plain";
    const group = seg === null ? `b${blockId(block)}` : `s${groupId(seg)}`;
    const owner = seg?.closest<HTMLElement>("[data-permalink]");
    const permalink = owner?.dataset.permalink;
    if (kind === "ayah" && parent.closest("[data-copy-label]") !== null) labelled.add(group);
    pieces.push({
      text,
      kind,
      group,
      block: blockId(block),
      url:
        (kind === "ai" || kind === "summary") && permalink
          ? new URL(permalink, origin).href
          : undefined,
      aiLabel: kind === "ai" ? owner?.dataset.trLabel : undefined,
      label:
        kind === "ayah"
          ? (seg?.querySelector("[data-copy-label]")?.textContent ?? undefined)
          : undefined,
    });
  }
  return pieces.map((p) => (labelled.has(p.group) ? { ...p, labelIncluded: true } : p));
}

export function ReaderEnhancements() {
  useEffect(() => {
    function onCopy(event: ClipboardEvent) {
      const selection = window.getSelection();
      if (selection === null || event.clipboardData === null) return;
      const pieces = selectionPieces(selection, window.location.origin);
      if (pieces === null) return;
      event.clipboardData.setData(
        "text/plain",
        labelledCopy(pieces, { ai: t.aiTranslation, summary: t.aiSummary }),
      );
      event.preventDefault();
    }
    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest(".translation-toggle, .arabic-toggle");
      if (button === null || button === undefined) return;
      if (button.classList.contains("arabic-toggle")) toggleArabic(button);
      else toggleTranslation(button);
    }
    // Tautan ke teks yang tersembunyi mode baca/tata letak (X11): buka dulu, lalu tampilkan.
    function onHash() {
      const hash = window.location.hash.slice(1);
      let id = hash;
      try {
        id = decodeURIComponent(hash);
      } catch {
        // Fragmen rusak (mis. "#%"): pakai apa adanya; id pembaca ASCII.
      }
      const target = id === "" ? null : document.getElementById(id);
      // Gulir ke paragrafnya (punya scroll-margin navbar), bukan elemen dalamnya.
      if (target !== null && revealFor(target)) {
        (target.closest(".passage") ?? target).scrollIntoView({ block: "start" });
      }
    }
    onHash();
    document.addEventListener("copy", onCopy);
    document.addEventListener("click", onClick);
    window.addEventListener("hashchange", onHash);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("click", onClick);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);
  return null;
}
