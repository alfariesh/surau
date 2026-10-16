import { describe, expect, test } from "vite-plus/test";

import { decodeCursor, encodeCursor } from "./cursor.ts";
import { InvalidCitation } from "./errors.ts";

describe("cursor", () => {
  test("bolak-balik, tanpa padding, hanya karakter base64url", () => {
    const c = encodeCursor({ nodeId: 100074, juz: 1, pageNo: 200, bodyOrd: 3 });
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeCursor(c, 100074)).toEqual({ nodeId: 100074, juz: 1, pageNo: 200, bodyOrd: 3 });
    expect(() => decodeCursor(c, 100075)).toThrow(InvalidCitation);
  });
});
