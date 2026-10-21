import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, test } from "vite-plus/test";

import {
  bayanCandidates,
  buildSubheadings,
  subheadingDecisions,
  subheadingFile,
  wordCut,
  type SubPassage,
} from "./subheadings.ts";

// Teks buatan (bukan teks kitab). Kata "bayan" ditulis dengan escape: berharakat dan tanpa harakat.
const BAYAN = "\u0628\u064a\u0627\u0646";
const BAYAN_V = "\u0628\u064e\u064a\u064e\u0627\u0646\u064f"; // بَيَانُ
const W1 = "\u0641\u0636\u0644"; // فضل
const W2 = "\u0627\u0644\u0635\u0628\u0631"; // الصبر
const W2_V = "\u0627\u0644\u0635\u0651\u064e\u0628\u0652\u0631\u0650"; // الصَّبْرِ
const W3 = "\u0642\u0627\u0644"; // قال
const W4 = "\u0627\u0644\u0646\u0628\u064a"; // النبي

const sha16 = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 16);

let nextSeq = 100;
function passage(text: string, over: Partial<SubPassage> = {}): SubPassage {
  return {
    seq: nextSeq++,
    pageId: 1,
    text,
    tocNodeId: null,
    translation: null,
    locked: [],
    ...over,
  };
}
const decisions = (over: object = {}) => subheadingDecisions.parse({ corpus: "uji-v1", ...over });

describe("wordCut", () => {
  test("awal: akhir kata ke-n termasuk harakat yang menempel; akhir: awal kata ke-n dari belakang", () => {
    const text = `${BAYAN_V} ${W1} ${W2_V} ${W3} ${W4}`;
    const lead = wordCut(text, 3, "start")!;
    expect(text.slice(0, lead)).toBe(`${BAYAN_V} ${W1} ${W2_V}`);
    const tail = wordCut(text, 2, "end")!;
    expect(text.slice(tail)).toBe(`${W3} ${W4}`);
  });

  test("tidak ada sisa teks atau jumlah kata tidak sah = null", () => {
    expect(wordCut(`${BAYAN} ${W1}`, 2, "start")).toBeNull();
    expect(wordCut(`${BAYAN} ${W1}`, 0, "end")).toBeNull();
  });
});

describe("bayanCandidates", () => {
  test("paragraf pendek berawalan bayan, bukan judul node yang mulai di halamannya", () => {
    const heading = passage(`${BAYAN} ${W1} ${W2}`);
    const tocHeading = passage(`${BAYAN} ${W2}`, { tocNodeId: 7, pageId: 3 });
    const otherPageNode = passage(`${BAYAN} ${W2}`, { tocNodeId: 8, pageId: 4 });
    const long = passage(`${BAYAN} ${`${W1} `.repeat(60)}`);
    const prose = passage(`${W3} ${BAYAN} ${W2}`);
    const nodes = [
      { id: 7, title: `${BAYAN} ${W2}`, startPageId: 3 },
      { id: 8, title: `${BAYAN} ${W2}`, startPageId: 2 },
    ];
    expect(bayanCandidates([heading, tocHeading, otherPageNode, long, prose], nodes)).toEqual([
      heading.seq,
      otherPageNode.seq,
    ]);
  });
});

describe("buildSubheadings", () => {
  test("bayan otomatis, pengecualian, lanjutan judul, subjudul awal/akhir dengan terjemahan", () => {
    const a = passage(`${BAYAN} ${W1}`);
    const aCont = passage(W2);
    const excluded = passage(`${BAYAN} ${W2}`);
    const lead = passage(`${BAYAN_V} ${W1} ${W2_V} ${W3} ${W4}`, {
      translation: "Penjelasan keutamaan sabar. Nabi bersabda.",
    });
    const tail = passage(`${W3} ${W4} ${BAYAN} ${W1}`, {
      translation: "Nabi bersabda. Penjelasan keutamaan.",
    });
    const built = buildSubheadings(
      1,
      [a, aCont, excluded, lead, tail],
      [],
      decisions({
        exclude: [{ p: excluded.seq, alasan: "butir daftar bagian di pembuka kitab" }],
        continuation: [{ p: aCont.seq, of: a.seq }],
        lead: [{ p: lead.seq, kata: 3, terjemahan: true }],
        tail: [{ p: tail.seq, kata: 2, terjemahan: true }],
      }),
      sha16,
    );
    expect(built.problems).toEqual([]);
    const e = built.file.entries;
    expect(e[String(a.seq)]).toEqual({ kind: "heading", src: "bayan", sha: sha16(a.text) });
    expect(e[String(aCont.seq)]).toEqual({
      kind: "heading",
      src: "kurasi",
      sha: sha16(aCont.text),
      of: a.seq,
    });
    expect(e[String(excluded.seq)]).toBeUndefined();
    const l = e[String(lead.seq)];
    if (l?.kind !== "lead") throw new Error("subjudul awal tidak terbentuk");
    expect(lead.text.slice(0, l.end)).toBe(`${BAYAN_V} ${W1} ${W2_V}`);
    expect(l.tr).toEqual({ start: 0, end: 27, sha: sha16(lead.translation!) });
    const t = e[String(tail.seq)];
    if (t?.kind !== "tail") throw new Error("subjudul akhir tidak terbentuk");
    expect(tail.text.slice(t.start)).toBe(`${BAYAN} ${W1}`);
    expect(tail.translation!.slice(t.tr!.start, t.tr!.end)).toBe("Penjelasan keutamaan.");
    expect(built.stats).toMatchObject({ bayanCandidates: 3, bayanExcluded: 1, bayanHeadings: 1 });
    expect(subheadingFile.safeParse(built.file).success).toBe(true);
  });

  test("keputusan yang tidak bisa diterapkan menjadi masalah, bukan keluaran diam-diam", () => {
    const a = passage(`${BAYAN} ${W1}`);
    const gap = passage(`${W3} ${W4}`);
    const notNext = passage(W2);
    const marker = passage(`${W1} (١) ${W2} ${W3}`, {
      locked: [{ start: W1.length + 1, end: W1.length + 4 }],
    });
    const built = buildSubheadings(
      1,
      [a, gap, notNext, marker],
      [],
      decisions({
        exclude: [{ p: gap.seq, alasan: "bukan calon bayan sama sekali" }],
        continuation: [{ p: notNext.seq, of: a.seq }],
        lead: [{ p: 999, kata: 1, terjemahan: false }],
        tail: [{ p: marker.seq, kata: 9, terjemahan: false }],
      }),
      sha16,
    );
    expect(built.problems).toHaveLength(4);
    expect(built.problems.join("\n")).toMatch(/bukan calon/);
    expect(built.problems.join("\n")).toMatch(/tepat sesudah/);
    expect(built.problems.join("\n")).toMatch(/p999/);
    expect(built.problems.join("\n")).toMatch(/tidak menyisakan isi/);
  });
});

// Berkas di repo = hasil bangun ulang dari korpus build lokal (dilewati bila korpus tidak ada, mis. CI).
const repo = resolve(import.meta.dirname, "../../..");
const build = join(repo, "data/build");
const local =
  existsSync(build) &&
  readdirSync(build).filter((f) => /^surau-corpus-.+\.sqlite$/.test(f)).length === 1;

describe("data/patches/ihya-9472-subjudul.json", () => {
  test("bentuknya sah", () => {
    const file = JSON.parse(
      readFileSync(join(repo, "data/patches/ihya-9472-subjudul.json"), "utf8"),
    );
    expect(subheadingFile.safeParse(file).success).toBe(true);
  });

  test.skipIf(!local)("sama dengan hasil `pnpm subjudul` dari korpus lokal", () => {
    const run = spawnSync(process.execPath, ["tools/ingest/src/subheadings-cli.ts", "--cek"], {
      cwd: repo,
      encoding: "utf8",
    });
    expect(run.stderr).not.toMatch(/MASALAH|berbeda/);
    expect(run.status).toBe(0);
  });
});
