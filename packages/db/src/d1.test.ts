import { describe, expect, test } from "vite-plus/test";

import { D1_MAX_PARAMS, chunk, placeholders } from "./d1.ts";

describe("bantuan batas parameter D1", () => {
  test("chunk memecah per ≤100", () => {
    const ids = Array.from({ length: 250 }, (_, i) => i);
    expect(chunk(ids).map((c) => c.length)).toEqual([100, 100, 50]);
    expect(chunk([], 3)).toEqual([]);
    expect(() => chunk([1], 0)).toThrow(RangeError);
  });

  test("placeholders", () => {
    expect(placeholders(3)).toBe("?, ?, ?");
    expect(() => placeholders(0)).toThrow(RangeError);
    expect(() => placeholders(D1_MAX_PARAMS + 1)).toThrow(RangeError);
  });
});
