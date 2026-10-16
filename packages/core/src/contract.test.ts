// Penjaga kontrak (calon kontrak MCP, S16): skema bisa diubah ke JSON Schema, masukan ketat,
// dan modul murni (cursor, permalink, token, error) berperilaku sesuai dokumentasi README.
import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";

import { decodeCursor, encodeCursor } from "./cursor.ts";
import { CoreError, InvalidCitation, NotFound, isCoreError, parseInput } from "./errors.ts";
import * as core from "./index.ts";
import {
  editionPermalink,
  pagePermalink,
  passagePermalink,
  sectionPermalink,
} from "./permalink.ts";
import {
  buildCitationInput,
  citation,
  getTocInput,
  getWorkInput,
  pageView,
  readPageInput,
  readSectionInput,
  sectionView,
  tocView,
  uintSegment,
  workList,
} from "./schema.ts";
import { CHARS_PER_TOKEN, estimateTokens } from "./tokens.ts";

describe("skema", () => {
  test("semua skema keluaran dan masukan bisa diubah ke JSON Schema", () => {
    for (const s of [citation, pageView, sectionView, tocView, workList]) {
      expect(z.toJSONSchema(s)).toMatchObject({ type: "object", additionalProperties: false });
    }
    for (const s of [
      getWorkInput,
      getTocInput,
      readPageInput,
      readSectionInput,
      buildCitationInput,
    ]) {
      expect(z.toJSONSchema(s, { io: "input" })).toMatchObject({ type: "object" });
    }
  });

  test("masukan ketat: field asing dan angka bukan bilangan bulat ditolak", () => {
    expect(readPageInput.safeParse({ edition_id: 1, juz: 1, page_no: 200 }).success).toBe(true);
    expect(readPageInput.safeParse({ edition_id: 1, juz: 1, page_no: 200, x: 1 }).success).toBe(
      false,
    );
    expect(readPageInput.safeParse({ edition_id: 1, juz: "1", page_no: 200 }).success).toBe(false);
    expect(getTocInput.parse({ edition_id: 1 }).depth).toBe(2);
  });

  test("uintSegment: hanya digit desimal tanpa nol di depan", () => {
    expect(uintSegment.parse("200")).toBe(200);
    expect(uintSegment.parse("0")).toBe(0);
    for (const bad of ["", " 1", "01", "1e2", "-1", "1.0", "0x10", "1234567890"]) {
      expect(uintSegment.safeParse(bad).success, bad).toBe(false);
    }
  });
});

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

describe("cursor", () => {
  test("bolak-balik, tanpa padding, hanya karakter base64url", () => {
    const c = encodeCursor({ nodeId: 100074, juz: 1, pageNo: 200, bodyOrd: 3 });
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeCursor(c, 100074)).toEqual({ nodeId: 100074, juz: 1, pageNo: 200, bodyOrd: 3 });
    expect(() => decodeCursor(c, 100075)).toThrow(InvalidCitation);
  });
});

describe("permalink", () => {
  const def = { workSlug: "ihya", editionSlug: "dar-al-marifah", isDefault: true };
  const other = { workSlug: "ihya", editionSlug: "openiti", isDefault: false };
  test("bentuk ADR-029", () => {
    expect(editionPermalink(def)).toBe("/kitab/ihya");
    expect(editionPermalink(other)).toBe("/kitab/ihya@openiti");
    expect(pagePermalink(def, 1, 200)).toBe("/kitab/ihya/1/200");
    expect(passagePermalink(def, 1, 200, 10_002_824)).toBe("/kitab/ihya/1/200#p2824");
    expect(sectionPermalink(other, 100_074)).toBe("/kitab/ihya@openiti/bab/100074");
  });
});

describe("token", () => {
  test("estimateTokens = panjang JSON / CHARS_PER_TOKEN, dibulatkan ke atas", () => {
    expect(CHARS_PER_TOKEN).toBe(2);
    expect(estimateTokens("abc")).toBe(3); // "\"abc\"" = 5 karakter
    expect(estimateTokens({ a: "نص" })).toBe(5); // {"a":"نص"} = 10 karakter
    expect(estimateTokens(undefined)).toBe(0);
  });
});

test("index mengekspor semua core tools", () => {
  for (const fn of ["listWorks", "getWork", "getToc", "readPage", "readSection", "buildCitation"]) {
    expect(typeof (core as Record<string, unknown>)[fn]).toBe("function");
  }
});
