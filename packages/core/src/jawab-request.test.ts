import { describe, expect, test } from "vite-plus/test";

import { JAWAB_QUESTION_MAX, TURNSTILE_TOKEN_MAX, jawabRequest } from "./jawab-request.ts";

describe("jawabRequest", () => {
  test("pertanyaan dirapikan; token Turnstile opsional", () => {
    expect(jawabRequest.parse({ question: "  Apa itu sabar?  " })).toEqual({
      question: "Apa itu sabar?",
    });
    expect(jawabRequest.parse({ question: "Apa itu sabar?", turnstile: "abc.DEF-123_x" })).toEqual({
      question: "Apa itu sabar?",
      turnstile: "abc.DEF-123_x",
    });
  });

  test("batas dan isian asing ditolak", () => {
    expect(jawabRequest.safeParse({ question: "ab" }).success).toBe(false);
    expect(jawabRequest.safeParse({ question: "x".repeat(JAWAB_QUESTION_MAX + 1) }).success).toBe(
      false,
    );
    expect(jawabRequest.safeParse({ question: "Apa\u0000itu?" }).success).toBe(false);
    expect(jawabRequest.safeParse({ question: "Apa itu sabar?", extra: 1 }).success).toBe(false);
    expect(
      jawabRequest.safeParse({
        question: "Apa itu sabar?",
        turnstile: "a".repeat(TURNSTILE_TOKEN_MAX + 1),
      }).success,
    ).toBe(false);
    expect(
      jawabRequest.safeParse({ question: "Apa itu sabar?", turnstile: "spasi tidak boleh" })
        .success,
    ).toBe(false);
  });
});
