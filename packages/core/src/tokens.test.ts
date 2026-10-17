import { describe, expect, test } from "vite-plus/test";

import { CHARS_PER_TOKEN, estimateTokens } from "./tokens.ts";

describe("token", () => {
  test("estimateTokens = panjang JSON / CHARS_PER_TOKEN, dibulatkan ke atas", () => {
    expect(CHARS_PER_TOKEN).toBe(1.4);
    expect(estimateTokens("abc")).toBe(4); // "\"abc\"" = 5 karakter → 3,57
    expect(estimateTokens({ a: "نص" })).toBe(8); // {"a":"نص"} = 10 karakter → 7,14
    expect(estimateTokens(undefined)).toBe(0);
  });
});
