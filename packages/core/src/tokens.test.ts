import { describe, expect, test } from "vite-plus/test";

import { CHARS_PER_TOKEN, estimateTokens } from "./tokens.ts";

describe("token", () => {
  test("estimateTokens = panjang JSON / CHARS_PER_TOKEN, dibulatkan ke atas", () => {
    expect(CHARS_PER_TOKEN).toBe(2);
    expect(estimateTokens("abc")).toBe(3); // "\"abc\"" = 5 karakter
    expect(estimateTokens({ a: "نص" })).toBe(5); // {"a":"نص"} = 10 karakter
    expect(estimateTokens(undefined)).toBe(0);
  });
});
