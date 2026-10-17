// Penjaga kontrak (calon kontrak MCP, S16): skema bisa diubah ke JSON Schema dan masukan ketat.
import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";

import {
  buildCitationInput,
  citation,
  getTocInput,
  getWorkInput,
  getHadithTakhrijInput,
  pageView,
  quoteVerification,
  readPageInput,
  readSectionInput,
  sectionView,
  takhrijView,
  tocView,
  uintSegment,
  verifyQuoteInput,
  workList,
} from "./schema.ts";

describe("skema", () => {
  test("semua skema keluaran dan masukan bisa diubah ke JSON Schema", () => {
    for (const s of [
      citation,
      pageView,
      sectionView,
      tocView,
      workList,
      quoteVerification,
      takhrijView,
    ]) {
      expect(z.toJSONSchema(s)).toMatchObject({ type: "object", additionalProperties: false });
    }
    for (const s of [
      getWorkInput,
      getTocInput,
      readPageInput,
      readSectionInput,
      buildCitationInput,
      verifyQuoteInput,
      getHadithTakhrijInput,
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
