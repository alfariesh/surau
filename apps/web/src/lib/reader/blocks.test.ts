import type { FootnoteRef } from "@surau/core";

import { describe, expect, it } from "vite-plus/test";

import { blocksText, cutSegments, passageBlocks, verseBounds } from "./blocks";
import { splitPassage } from "./segments";

// Teks buatan (bukan teks kitab). Huruf Arab biasa, penanda catatan kaki (١) dengan offset DB.
const A = "قال النبي"; // قال النبي
const B = "من صلى"; // من صلى
const C = "فله أجر"; // فله أجر
const SEP = " ... ";

function ref(text: string, marker: string, footnoteId: number): FootnoteRef {
  const start = text.indexOf(`(${marker})`);
  return { marker, char_start: start, char_end: start + 3, footnote_id: footnoteId };
}

describe("verseBounds", () => {
  it("paragraf bait utuh: batas di kedua sisi setiap pemisah", () => {
    const text = `${A}${SEP}${B}`;
    expect(verseBounds(text)).toEqual([A.length, A.length + SEP.length]);
    expect(verseBounds(`${A}${SEP}${B}${SEP}${C}`)).toHaveLength(4);
  });

  it("bukan bait: tanpa pemisah, bagian panjang (bait di tengah prosa), atau bagian kosong", () => {
    expect(verseBounds(A)).toBeNull();
    expect(verseBounds(`${`${A} `.repeat(12)}${SEP}${B}`)).toBeNull();
    expect(verseBounds(`${A}${SEP}${`${B} `.repeat(12)}`)).toBeNull();
    expect(verseBounds(`${SEP}${B}`)).toBeNull();
    expect(verseBounds(`${A}${SEP}`)).toBeNull();
  });
});

describe("cutSegments", () => {
  it("memotong hanya di offset; penanda dan label ayat tetap utuh di kelompoknya", () => {
    const text = `${A} (١) ${B} ${C}`;
    const split = splitPassage(text, [ref(text, "١", 9)], []);
    const cut = text.indexOf(B);
    const groups = cutSegments(split.segments, [cut])!;
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.map((s) => (s.kind === "ayah-end" ? "" : s.text)).join(""))).toEqual(
      [text.slice(0, cut), text.slice(cut)],
    );
    expect(groups[0]!.some((s) => s.kind === "marker")).toBe(true);
  });

  it("batas di tengah penanda = null (tidak dipotong)", () => {
    const text = `${A} (١) ${B}`;
    const split = splitPassage(text, [ref(text, "١", 9)], []);
    const inside = text.indexOf("(١)") + 1;
    expect(cutSegments(split.segments, [inside])).toBeNull();
  });
});

describe("passageBlocks", () => {
  it("subjudul awal/akhir: dua blok, gabungannya = text_raw", () => {
    const text = `${A} ${B} ${C}`;
    const split = splitPassage(text, [], []);
    const lead = passageBlocks(text, split.segments, { kind: "lead", end: A.length });
    expect(lead.map((b) => b.kind)).toEqual(["subheading", "text"]);
    expect(blocksText(lead)).toBe(text);
    const tail = passageBlocks(text, split.segments, { kind: "tail", start: text.indexOf(C) });
    expect(tail.map((b) => b.kind)).toEqual(["text", "subheading"]);
    expect(blocksText(tail)).toBe(text);
  });

  it("offset tidak sah: paragraf tampil utuh", () => {
    const text = `${A} ${B}`;
    const split = splitPassage(text, [], []);
    for (const sub of [
      { kind: "lead", end: 0 },
      { kind: "lead", end: text.length },
      { kind: "tail", start: 999 },
    ] as const) {
      const blocks = passageBlocks(text, split.segments, sub);
      expect(blocks.map((b) => b.kind)).toEqual(["text"]);
      expect(blocksText(blocks)).toBe(text);
    }
  });

  it("bait: syatr dan pemisah bergantian, pemisah tetap di teks (round-trip)", () => {
    const text = `${A} (١)${SEP}${B}${SEP}${C}`;
    const split = splitPassage(text, [ref(text, "١", 9)], []);
    const blocks = passageBlocks(text, split.segments, null);
    expect(blocks.map((b) => b.kind)).toEqual([
      "syatr",
      "syatr-sep",
      "syatr",
      "syatr-sep",
      "syatr",
    ]);
    expect(blocksText(blocks)).toBe(text);
  });
});
