import { expect, test } from "vite-plus/test";

import * as core from "./index.ts";

test("index mengekspor semua core tools, tetapi bukan varian khusus tes", () => {
  for (const fn of ["listWorks", "getWork", "getToc", "readPage", "readSection", "buildCitation"]) {
    expect(typeof (core as Record<string, unknown>)[fn]).toBe("function");
  }
  expect("readSectionWithLimit" in core).toBe(false);
});
