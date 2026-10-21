import { describe, expect, test } from "vite-plus/test";

import { TOC_TITLE_SCHEMA } from "../prompts/toc-title-schema.ts";
import {
  TOC_TITLE_PROMPT,
  buildTocTitleRequest,
  checkTocTitle,
  judgeTocTitles,
  tocTitleUserText,
} from "./toc-title.ts";

// Judul Arab buatan (bukan teks kitab), ditulis dengan escape.
const AR = "بيان فضل";

const message = (text: string, stop: "end_turn" | "max_tokens" = "end_turn") => ({
  content: [{ type: "text" as const, text, citations: null }],
  stop_reason: stop,
});

describe("buildTocTitleRequest", () => {
  test("Sonnet, effort low + skema JSON, prompt sistem di-cache, data dibungkus tag", () => {
    const items = [{ id: "n7", parent: null, level: 2, kind: "node" as const, title: AR }];
    const r = buildTocTitleRequest(["ربع"], items);
    expect(r.model).toBe("claude-sonnet-5-5");
    expect(r.output_config).toEqual({
      effort: "low",
      format: { type: "json_schema", schema: TOC_TITLE_SCHEMA },
    });
    expect(r).not.toHaveProperty("temperature");
    const user = tocTitleUserText(["ربع"], items);
    expect(r.messages).toEqual([{ role: "user", content: user }]);
    expect(user).toMatch(/^<jalur>\n/);
    expect(JSON.parse(user.split("<judul>\n")[1]!.split("\n</judul>")[0]!)).toEqual([
      { id: "n7", induk: null, tingkat: 2, jenis: "node", judul: AR },
    ]);
    expect(TOC_TITLE_PROMPT.id).toBe("translate-toc-title@2");
    // Prompt tanpa huruf Arab ketikan (teks-arab.md: glosarium transliterasi Latin).
    expect(/\p{Script=Arabic}/u.test(TOC_TITLE_PROMPT.system)).toBe(false);
  });
});

describe("checkTocTitle", () => {
  test("judul wajar lolos; huruf Arab, titik akhir, kutip, Markdown, baris baru ditolak", () => {
    expect(checkTocTitle("Bab Kedua: Ilmu yang terpuji dan yang tercela")).toEqual([]);
    expect(checkTocTitle("Keutamaan Rasulullah saw.")).toEqual([]);
    expect(checkTocTitle(`Penjelasan ${AR}`)).toEqual(["arabic"]);
    expect(checkTocTitle("Kitab Ilmu.")).toEqual(["trailing_period"]);
    expect(checkTocTitle('Kitab "Ilmu"')).toEqual(["quote"]);
    expect(checkTocTitle("**Kitab Ilmu**")).toContain("markdown");
    expect(checkTocTitle("Kitab\nIlmu")).toEqual(["newline"]);
    expect(checkTocTitle("  ")).toEqual(["empty"]);
    expect(checkTocTitle("x".repeat(320))).toEqual([]);
    expect(checkTocTitle("x".repeat(321))).toEqual(["too_long"]);
  });
});

describe("judgeTocTitles", () => {
  test("id diminta → diterima/ditolak; id ganda, hilang, dan asing tercatat", () => {
    const out = JSON.stringify({
      judul: [
        { id: "n1", indonesia: " Kitab Ilmu " },
        { id: "n2", indonesia: "Bab Pertama." },
        { id: "n3", indonesia: "A" },
        { id: "n3", indonesia: "B" },
        { id: "x9", indonesia: "Asing" },
      ],
    });
    const r = judgeTocTitles(message(out), ["n1", "n2", "n3", "n4"]);
    expect([...r.accepted]).toEqual([["n1", "Kitab Ilmu"]]);
    expect(Object.fromEntries(r.rejected)).toEqual({
      n2: "trailing_period",
      n3: "id ganda",
      n4: "tidak ada di keluaran",
    });
    expect(r.problems).toEqual(["id asing: x9"]);
  });

  test("berhenti di max_tokens atau JSON rusak = semua gagal", () => {
    const ok = JSON.stringify({ judul: [{ id: "n1", indonesia: "Kitab Ilmu" }] });
    const cut = judgeTocTitles(message(ok, "max_tokens"), ["n1"]);
    expect(cut.accepted.size).toBe(0);
    expect(cut.rejected.get("n1")).toBe("stop_reason max_tokens");
    expect(judgeTocTitles(message("{"), ["n1"]).problems).toEqual(["JSON tidak sesuai skema"]);
  });
});
