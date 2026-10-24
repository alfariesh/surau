import { describe, expect, it } from "vite-plus/test";

import { LEGACY_TRANSLATION_KEY, READ_MODE_KEY, READER_SCALE_SCRIPT } from "./scale";

// Skrip awal root layout (X11): dijalankan dengan `document` dan `localStorage` tiruan, seperti di
// browser sebelum isi tampil.

function run(
  storage: Record<string, string>,
  { failWrites = false, failAll = false }: { failWrites?: boolean; failAll?: boolean } = {},
) {
  const attrs = new Map<string, string>();
  const style = new Map<string, string>();
  const data = new Map(Object.entries(storage));
  const localStorage = {
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => {
      if (failAll) throw new Error("SecurityError");
      return data.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (failWrites) throw new Error("QuotaExceededError");
      data.set(k, v);
    },
    removeItem: (k: string) => {
      if (failWrites) throw new Error("QuotaExceededError");
      data.delete(k);
    },
  };
  const document = {
    documentElement: {
      setAttribute: (k: string, v: string) => attrs.set(k, v),
      style: { setProperty: (k: string, v: string) => style.set(k, v) },
    },
  };
  // oxlint-disable-next-line typescript/no-implied-eval -- menjalankan skrip mentah yang sama dengan di <body>
  new Function("document", "localStorage", READER_SCALE_SCRIPT)(document, localStorage);
  return { attrs, style, data };
}

describe("READER_SCALE_SCRIPT: mode baca (X11)", () => {
  it("mode Arab tersimpan → data-read-mode=ar; Keduanya (bawaan) tanpa atribut", () => {
    expect(run({ [READ_MODE_KEY]: "ar" }).attrs.get("data-read-mode")).toBe("ar");
    expect(run({ [READ_MODE_KEY]: "both" }).attrs.has("data-read-mode")).toBe(false);
    expect(run({}).attrs.has("data-read-mode")).toBe(false);
  });

  it("nilai tak dikenal diabaikan", () => {
    expect(run({ [READ_MODE_KEY]: "semua" }).attrs.has("data-read-mode")).toBe(false);
  });

  it("sakelar lama '0' dipindah ke mode Arab sekali, lalu kunci lama dihapus", () => {
    const { attrs, data } = run({ [LEGACY_TRANSLATION_KEY]: "0" });
    expect(attrs.get("data-read-mode")).toBe("ar");
    expect(data.get(READ_MODE_KEY)).toBe("ar");
    expect(data.has(LEGACY_TRANSLATION_KEY)).toBe(false);
    expect(attrs.has("data-translation")).toBe(false);
  });

  it("sakelar lama '1' menjadi Keduanya; mode baca yang sudah tersimpan menang", () => {
    const shown = run({ [LEGACY_TRANSLATION_KEY]: "1" });
    expect(shown.data.get(READ_MODE_KEY)).toBe("both");
    expect(shown.attrs.has("data-read-mode")).toBe(false);
    const both = run({ [LEGACY_TRANSLATION_KEY]: "0", [READ_MODE_KEY]: "both" });
    expect(both.attrs.has("data-read-mode")).toBe(false);
    expect(both.data.has(LEGACY_TRANSLATION_KEY)).toBe(false);
  });

  it("galat tulis saat pemindahan: mode Arab tetap dari memori, kunci lama bertahan, preferensi lain jalan", () => {
    const { attrs, data } = run(
      { [LEGACY_TRANSLATION_KEY]: "0", "surau:reader-font": "amiri" },
      { failWrites: true },
    );
    expect(attrs.get("data-reader-font")).toBe("amiri");
    expect(attrs.get("data-read-mode")).toBe("ar");
    expect(data.get(LEGACY_TRANSLATION_KEY)).toBe("0");
  });

  it("penyimpanan diblokir: gagal diam-diam", () => {
    expect(() => run({ [READ_MODE_KEY]: "ar" }, { failAll: true })).not.toThrow();
  });

  it("preferensi lain tetap terpasang bersama mode baca", () => {
    const { attrs, style } = run({
      [READ_MODE_KEY]: "ar",
      "surau:reader-tr-layout": "side",
      "surau:reader-scale": "1.3",
    });
    expect(attrs.get("data-read-mode")).toBe("ar");
    expect(attrs.get("data-tr-layout")).toBe("side");
    expect(style.get("--reader-scale")).toBe("1.3");
  });
});
