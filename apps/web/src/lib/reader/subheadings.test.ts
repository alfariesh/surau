import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vite-plus/test";

import type { SubSpan } from "./blocks";

import { blocksText, passageBlocks, VERSE_SEPARATOR } from "./blocks";
import { tocHeadings } from "./page-model";
import { splitPassage } from "./segments";
import { sha16, subheadingFile, subheadingOf } from "./subheadings";

import raw from "../../../../../data/patches/ihya-9472-subjudul.json";

describe("daftar kurasi subjudul", () => {
  it("bentuknya sah dan hanya berlaku untuk edisinya", () => {
    expect(subheadingFile.safeParse(raw).success).toBe(true);
    expect(subheadingOf(1, 13553)?.kind).toBe("heading");
    expect(subheadingOf(2, 13553)).toBeUndefined();
  });

  it("sha16 web sama dengan sha256 Node (16 hex awal)", async () => {
    const text = "\u0628\u064e\u064a\u064e\u0627\u0646\u064f Penjelasan";
    expect(await sha16(text)).toBe(createHash("sha256").update(text).digest("hex").slice(0, 16));
  });
});

// Tes integrasi korpus lokal (dilewati bila data/build tidak berisi tepat satu korpus, mis. CI):
// setiap entri kurasi cocok dengan text_raw dan dipotong tanpa mengubah satu karakter pun.
const repo = resolve(import.meta.dirname, "../../../../..");
const build = join(repo, "data/build");
const files = existsSync(build)
  ? readdirSync(build).filter((f) => /^surau-corpus-.+\.sqlite$/.test(f))
  : [];

describe.skipIf(files.length !== 1)("korpus lokal", () => {
  const db =
    files.length === 1 ? new DatabaseSync(join(build, files[0]!), { readOnly: true }) : null;
  const passageRow = (seq: number) => {
    const id = 10_000_000 + seq;
    const row = db!.prepare("SELECT text_raw FROM passage WHERE id = ?").get(id);
    const refs = db!
      .prepare(
        "SELECT char_start, char_end, marker, footnote_passage_id FROM footnote_ref WHERE passage_id = ?",
      )
      .all(id)
      .map((r) => ({
        char_start: Number(r.char_start),
        char_end: Number(r.char_end),
        marker: String(r.marker),
        footnote_id: Number(r.footnote_passage_id),
      }));
    return { text: String(row?.text_raw), refs };
  };

  it("semua entri: sidik cocok, potongan sah, gabungan blok = text_raw byte demi byte", async () => {
    const entries = Object.keys(raw.entries).map(
      (key) => [Number(key), subheadingOf(1, Number(key))!] as const,
    );
    const cut: string[] = [];
    for (const [seq, entry] of entries) {
      const { text, refs } = passageRow(seq);
      expect(await sha16(text), `p${seq}`).toBe(entry.sha);
      const sub: SubSpan | null =
        entry.kind === "lead"
          ? { kind: "lead", end: entry.end }
          : entry.kind === "tail"
            ? { kind: "tail", start: entry.start }
            : null;
      const blocks = passageBlocks(text, splitPassage(text, refs, []).segments, sub);
      expect(blocksText(blocks), `p${seq}`).toBe(text);
      if (sub !== null && blocks.some((b) => b.kind === "subheading")) cut.push(sub.kind);
    }
    const bayan = entries.filter(([, e]) => e.kind === "heading" && e.src === "bayan").length;
    // Selesai bila X04: ≥ 180 dari 191 calon "bayan" dirender sebagai subjudul (184 utuh + 2 di awal).
    expect(bayan + 2).toBeGreaterThanOrEqual(180);
    // Setiap subjudul awal/akhir benar-benar terpotong (offset sah, tidak di tengah penanda).
    expect(cut.filter((k) => k === "lead")).toHaveLength(16);
    // 6 subjudul akhir + 2 judul node yang dipindah dari butir daftar (node_tail, X04 bagian B).
    expect(cut.filter((k) => k === "tail")).toHaveLength(8);
  });

  it("judul node: 8 node berjangkar terlalu awal dikenali di paragraf judulnya; butir daftar node_tail bukan h2", async () => {
    const nodes = db!
      .prepare("SELECT id, parent_id, level, title_ar, start_page_id FROM toc_node ORDER BY id")
      .all();
    const late: number[] = [];
    const plainIds = new Set<number>();
    for (const [key, e] of Object.entries(raw.entries)) {
      const seq = Number(key);
      if (e.kind === "plain" && (await sha16(passageRow(seq).text)) === e.sha)
        plainIds.add(10_000_000 + seq);
    }
    const viaPlain: number[] = [];
    for (const n of nodes) {
      const body = db!
        .prepare(
          "SELECT id, toc_node_id, text_raw FROM passage WHERE page_id = ? AND kind = 'body' AND toc_node_id = ? ORDER BY ord",
        )
        .all(Number(n.start_page_id), Number(n.id))
        .map((r) => ({
          id: Number(r.id),
          toc_node_id: Number(r.toc_node_id),
          text_raw: String(r.text_raw),
        }));
      const section = {
        id: Number(n.id),
        parentId: n.parent_id === null ? null : Number(n.parent_id),
        level: Number(n.level),
        title: String(n.title_ar),
      };
      const found = [...tocHeadings([section], body, plainIds).keys()][0];
      if (found !== undefined && found !== body[0]?.id) late.push(section.id);
      if (body.some((p) => plainIds.has(p.id)) && found === undefined) viaPlain.push(section.id);
    }
    // ADR-078: judul kitab sesudah kolofon kitab sebelumnya (6) + 100223 + 100243.
    expect(late).toEqual([100077, 100092, 100098, 100117, 100122, 100164, 100223, 100243]);
    // Butir daftar pembuka (node_tail): node-nya tanpa h2 paragraf utuh; judulnya di akhir p16600/p18645.
    expect(viaPlain).toEqual([100224, 100285]);
    expect(subheadingOf(1, 16600)).toMatchObject({ kind: "tail", node: 100224 });
    expect(subheadingOf(1, 18645)).toMatchObject({ kind: "tail", node: 100285 });
  });

  it("syair: paragraf berpemisah ' ... ' tetap utuh (round-trip); paragraf bait utuh ditata per syatr", () => {
    const rows = db!
      .prepare("SELECT id, text_raw FROM passage WHERE kind = 'body' AND instr(text_raw, ?) > 0")
      .all(VERSE_SEPARATOR);
    let verse = 0;
    for (const r of rows) {
      const text = String(r.text_raw);
      const { refs } = passageRow(Number(r.id) - 10_000_000);
      const blocks = passageBlocks(text, splitPassage(text, refs, []).segments, null);
      expect(blocksText(blocks)).toBe(text);
      if (blocks.some((b) => b.kind === "syatr")) verse++;
    }
    expect(rows.length).toBe(450);
    expect(verse).toBeGreaterThanOrEqual(429);
  });
});
