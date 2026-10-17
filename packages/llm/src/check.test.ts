// Fixture: kata Arab buatan.
import { describe, expect, test } from "vite-plus/test";

import {
  contentLength,
  footnoteMarkerDigits,
  hasArabicLetters,
  hasMarkdown,
  hasPreamble,
  longestArabicRun,
  stripMarkers,
} from "./check.ts";
import { messageText, stopProblem } from "./response.ts";

describe("pemeriksaan keluaran", () => {
  test("placeholder dan penanda tidak dihitung sebagai teks Arab", () => {
    expect(longestArabicRun("Ia berkata ⟦QS 2:255⟧ (١) (٢) lalu selesai.")).toBe(0);
    expect(hasArabicLetters("Ia berkata (١).")).toBe(false);
    expect(stripMarkers("a ⟦QS 1:1-7⟧ b (٣) c")).toBe("a   b   c");
  });

  test("kata Arab berturut-turut dihitung", () => {
    expect(longestArabicRun("ikhlas الإخلاص dan الصبر الجميل جدا")).toBe(3);
    expect(hasArabicLetters("istilah الزهد")).toBe(true);
  });

  test("panjang isi dan digit penanda", () => {
    expect(contentLength("  a  ⟦QS 2:1⟧  b ")).toBe(3);
    expect(footnoteMarkerDigits("x (١) y ( ٢ ) z (12)")).toEqual(["١", "٢", "12"]);
  });

  test("Markdown dan kalimat pembuka", () => {
    expect(hasMarkdown("teks **tebal**")).toBe(true);
    expect(hasMarkdown("## Judul")).toBe(true);
    expect(hasMarkdown("teks biasa #1")).toBe(false);
    expect(hasPreamble("Berikut ini adalah terjemahan paragraf")).toBe(true);
    expect(hasPreamble("Here is the summary")).toBe(true);
    expect(hasPreamble("Berikutnya ia berkata")).toBe(false);
  });
});

describe("respons", () => {
  test("teks diambil dari blok text, bukan blok pertama", () => {
    const content = [
      { type: "thinking", thinking: "", signature: "s" },
      { type: "text", text: " Halo ", citations: null },
    ] as const;
    expect(messageText({ content: [...content] } as never)).toBe("Halo");
  });

  test("refusal, max_tokens, dan tanpa teks = masalah", () => {
    const text = [{ type: "text", text: "ok", citations: null }];
    expect(stopProblem({ content: text, stop_reason: "refusal" } as never)).toBe("refusal");
    expect(stopProblem({ content: text, stop_reason: "max_tokens" } as never)).toBe("max_tokens");
    expect(stopProblem({ content: [], stop_reason: "end_turn" } as never)).toBe("no_text");
    expect(stopProblem({ content: text, stop_reason: "end_turn" } as never)).toBeNull();
  });
});
