import { describe, expect, test } from "vite-plus/test";

import { bookDbPath, parseImprint } from "./source.ts";

describe("sumber Shamela", () => {
  test("lokasi file kitab: book/{id % 1000, 3 digit}/{id}.db", () => {
    expect(bookDbPath("/data", 9472)).toBe("/data/book/472/9472.db");
    expect(bookDbPath("/data", 5)).toBe("/data/book/005/5.db");
  });

  test("parseImprint: penerbit - kota, tanpa kota, atau tanpa baris penerbit", () => {
    expect(parseImprint("الكتاب: س\rالناشر: دار التجربة - مدينة\r")).toEqual({
      publisher: "دار التجربة",
      city: "مدينة",
    });
    expect(parseImprint("الناشر: دار بلا مدينة")).toEqual({ publisher: "دار بلا مدينة", city: null });
    expect(parseImprint("الكتاب: س")).toEqual({ publisher: null, city: null });
  });
});
