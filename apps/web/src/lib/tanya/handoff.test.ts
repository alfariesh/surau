import { beforeAll, describe, expect, it, vi } from "vite-plus/test";

import { handOffQuestion, peekHandOff, takeHandOff } from "./handoff";

describe("serah-terima pertanyaan Beranda → Maknaz", () => {
  // Titipan hanya hidup di browser; tanpa `window` (server) semuanya diabaikan.
  beforeAll(() => {
    vi.stubGlobal("window", {});
  });

  it("peek tidak mengambil; take mengambil sekali", () => {
    handOffQuestion("Apa itu sabar?", null, 1000);
    expect(peekHandOff(1000)).toEqual({ question: "Apa itu sabar?", sitekey: null });
    expect(peekHandOff(1500)?.question).toBe("Apa itu sabar?");
    expect(takeHandOff()).toEqual({ question: "Apa itu sabar?", sitekey: null });
    expect(takeHandOff()).toBeNull();
    expect(peekHandOff(2000)).toBeNull();
  });

  it("titipan kedaluwarsa tidak tampil", () => {
    handOffQuestion("Apa itu tawakal?", null, 0);
    expect(peekHandOff(10_001)).toBeNull();
    expect(takeHandOff()).toBeNull();
  });

  it("titipan yang sudah tampil tetap terkirim walau umurnya lewat di antara render dan efek", () => {
    handOffQuestion("Apa itu zuhud?", "kunci", 0);
    expect(peekHandOff(9_999)?.sitekey).toBe("kunci");
    expect(takeHandOff()).toEqual({ question: "Apa itu zuhud?", sitekey: "kunci" });
  });

  it("di server titipan tidak disimpan", () => {
    vi.unstubAllGlobals();
    handOffQuestion("Rahasia pengguna lain", null, 0);
    expect(peekHandOff(0)).toBeNull();
    vi.stubGlobal("window", {});
  });
});
