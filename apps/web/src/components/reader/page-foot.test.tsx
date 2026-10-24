import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { PageFoot } from "./page-foot";

const foot = (
  ai: { translation: boolean; summary: boolean; reviewed: boolean },
  anyReview = false,
) => renderToStaticMarkup(<PageFoot model={{ quran: null, ai, anyReview }} />);

describe("PageFoot (X10)", () => {
  it("tanpa ayat, konten AI, maupun tanda tinjau: tidak dirender", () => {
    expect(foot({ translation: false, summary: false, reviewed: true })).toBe("");
  });

  it("catatan AI menurut isi halaman: belum ada tinjauan = kalimat lama", () => {
    expect(foot({ translation: true, summary: true, reviewed: false })).toContain(
      "Terjemahan dan ringkasan AI belum ditinjau manusia",
    );
  });

  it("baris catatan AI bertanda data-tr-aid (disembunyikan di mode baca Arab, X11)", () => {
    expect(foot({ translation: true, summary: false, reviewed: false })).toMatch(
      /data-tr-aid=""[^>]*>[^<]*Terjemahan/u,
    );
    // Tanda perlu ditinjau bukan bantuan terjemahan: tetap tampil di semua mode.
    expect(foot({ translation: false, summary: false, reviewed: false }, true)).not.toContain(
      "data-tr-aid",
    );
  });

  it("sebagian sudah dikoreksi/diperiksa: hanya yang tanpa keterangan disebut belum ditinjau", () => {
    const html = foot({ translation: true, summary: false, reviewed: true });
    expect(html).toContain(
      "Terjemahan AI tanpa keterangan dikoreksi atau diperiksa belum ditinjau",
    );
    expect(html).not.toContain("ringkasan");
    expect(foot({ translation: true, summary: true, reviewed: true })).toContain(
      "diperiksa dan ringkasan AI belum ditinjau",
    );
  });

  it("semua terjemahan sudah ditinjau, ada ringkasan AI: hanya ringkasan yang disebut", () => {
    const html = foot({ translation: false, summary: true, reviewed: true });
    expect(html).toContain("Ringkasan AI belum ditinjau manusia");
    expect(html).not.toContain("Terjemahan");
  });

  it("tanda perlu ditinjau ikut halaman ini", () => {
    expect(foot({ translation: false, summary: false, reviewed: false }, true)).toContain(
      "pemeriksaan otomatis saat impor",
    );
  });
});
