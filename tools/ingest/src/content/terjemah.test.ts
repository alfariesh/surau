// Berkas terjemahan di repo (X27): setiap berkas di data/terjemah/en lolos cek luring (skema, cap
// kode, kesiapan) dan berada di jalur kanonisnya.
import { relative, resolve } from "node:path";

import { describe, expect, test } from "vite-plus/test";

import { readJson } from "./cli.ts";
import {
  TRANSLATION_DIR,
  checkTranslationOffline,
  listTranslationFiles,
  translationPath,
} from "./terjemah.ts";

const repo = resolve(import.meta.dirname, "../../../..");

describe("data/terjemah/en", () => {
  const files = listTranslationFiles();
  test.skipIf(files.length === 0).each(files)(
    "%s lolos cek luring di jalur kanonis",
    async (file) => {
      const r = await checkTranslationOffline(readJson(file));
      expect(r.errors).toEqual([]);
      expect(r.draft === null ? null : translationPath(r.draft)).toBe(file);
    },
  );

  test("folder terjemahan", () => {
    expect(relative(repo, TRANSLATION_DIR)).toBe("data/terjemah/en");
  });
});

test("skema rusak dan bahasa lain ditolak luring", async () => {
  expect((await checkTranslationOffline({ format: "lain" })).ok).toBe(false);
  const r = await checkTranslationOffline({
    format: "surau-terjemah/1",
    lang: "id",
    edition_id: 1,
    section_id: 100007,
    status: "draf",
    butir: [{ passage_id: 10000124, teks: "x" }],
    asal: {
      pembuat: "claude-desktop",
      model: "claude-sonnet-5-5",
      plugin: "surau-redaksi@0.2.0",
      skill: "terjemah-inggris@1",
      operator: "pemilik",
      dibuat: "2026-10-28T07:00:00+07:00",
    },
  });
  expect(r.errors.map((e) => e.code)).toEqual(["schema"]);
});
