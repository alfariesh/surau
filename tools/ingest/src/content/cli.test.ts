// Berkas konten di repo (X23): setiap unit di data/konten lolos cek luring (skema, bahasa, cap kode
// cocok dengan isi, kesiapan status). Cek korpus berjalan saat impor dan build (X24), bukan di CI.
import { relative, resolve } from "node:path";

import { CONTENT_FORMAT, contentDraftSha256, contentDraft } from "@surau/core";
import { describe, expect, test } from "vite-plus/test";

import { CONTENT_DIR, canonicalPath, checkOffline, listContentFiles, readJson } from "./cli.ts";

const repo = resolve(import.meta.dirname, "../../../..");

const base = {
  format: CONTENT_FORMAT,
  jenis: "faedah",
  edition_id: 1,
  section_id: 100008,
  status: "draf",
  isi: {
    butir: [
      {
        passage_id: 10000167,
        judul: "Yang dicari karena dirinya lebih mulia",
        konteks: "Penulis menulis ini ketika membagi hal berharga menjadi tiga macam.",
        tema: ["ilmu"],
      },
    ],
  },
  asal: {
    pembuat: "claude-desktop",
    model: "claude-opus-5-5",
    plugin: "surau-redaksi@0.1.0",
    skill: "faedah@1",
    operator: "pemilik",
    dibuat: "2026-10-28T07:00:00+07:00",
  },
} as const;

describe("data/konten", () => {
  const files = listContentFiles();
  test.each(files.map((f) => [relative(repo, f), f]))(
    "%s lolos cek luring",
    async (_name, file) => {
      const r = await checkOffline(readJson(file));
      expect(r.errors).toEqual([]);
      // Berkas ada di jalur kanonisnya.
      expect(canonicalPath(contentDraft.parse(readJson(file)))).toBe(file);
    },
  );

  test("folder konten di data/konten", () => {
    expect(relative(repo, CONTENT_DIR)).toBe("data/konten");
  });
});

describe("checkOffline", () => {
  test("draf baik lolos; skema rusak ditolak", async () => {
    expect((await checkOffline(base)).ok).toBe(true);
    const bad = await checkOffline({ ...base, jenis: "artikel" });
    expect(bad.ok).toBe(false);
    expect(bad.errors.map((e) => e.code)).toContain("schema");
  });

  test("cap kode basi dan status siap tanpa periksa independen ditolak", async () => {
    const d = contentDraft.parse(base);
    const stamp = {
      aturan: "konten@1",
      lolos: true,
      sumber_sha256: "a".repeat(64),
      draf_sha256: await contentDraftSha256(d),
      waktu: "2026-10-28T08:00:00.000Z",
    };
    const fresh = await checkOffline({ ...base, periksa: { kode: stamp } });
    expect(fresh.ok).toBe(true);
    const edited = await checkOffline({
      ...base,
      isi: { butir: [{ ...base.isi.butir[0], judul: "Judul lain yang diubah sesudah dicek" }] },
      periksa: { kode: stamp },
    });
    expect(edited.errors.map((e) => e.code)).toContain("stamp_mismatch");
    const ready = await checkOffline({
      ...base,
      status: "siap",
      periksa: { kode: stamp, mandiri: [{ ke: 1, nilai: "salah", catatan: "keliru" }] },
    });
    expect(ready.errors.map((e) => e.code)).toEqual(
      expect.arrayContaining(["no_independent_review", "review_salah"]),
    );
  });

  test("jalur kanonis: Jalur memakai slug, jenis lain section_id", () => {
    const d = contentDraft.parse(base);
    expect(relative(repo, canonicalPath(d))).toBe("data/konten/faedah/100008.json");
  });
});
