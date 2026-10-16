import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";

import { CoreError, InvalidCitation, NotFound, isCoreError, parseInput } from "./errors.ts";
import { readPageInput } from "./schema.ts";

describe("error", () => {
  test("kelas, code, name, dan isCoreError", () => {
    const nf = new NotFound("x");
    const ic = new InvalidCitation("y");
    expect([nf.code, nf.name, ic.code, ic.name]).toEqual([
      "not_found",
      "NotFound",
      "invalid_citation",
      "InvalidCitation",
    ]);
    expect(nf).toBeInstanceOf(CoreError);
    expect(isCoreError(ic)).toBe(true);
    expect(isCoreError(new Error("z"))).toBe(false);
  });

  test("parseInput menyebut field pertama yang salah", () => {
    expect(() => parseInput(readPageInput, { edition_id: 1, juz: 0, page_no: 1 })).toThrow(
      /^Invalid juz: /,
    );
    expect(() => parseInput(z.number(), "x")).toThrow(/^Invalid input: /);
  });
});
