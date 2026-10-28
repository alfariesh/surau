import { createContext, runInContext } from "node:vm";

import { describe, expect, it } from "vite-plus/test";

import {
  LEGACY_TRANSLATION_KEY,
  READ_MODE_HINT_KEY,
  READ_MODE_KEY,
  READER_SCALE_SCRIPT,
} from "./scale";

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

  it("mode Terjemahan tersimpan → data-read-mode=tr", () => {
    expect(run({ [READ_MODE_KEY]: "tr" }).attrs.get("data-read-mode")).toBe("tr");
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

describe("READER_SCALE_SCRIPT: scope global (ADR-119)", () => {
  // Skrip mentah di <body> berbagi scope global dengan skrip inline lain. Di vinext, `var o` lama
  // bertabrakan dengan `const o` tingkat atas milik framework ("Identifier 'o' has already been
  // declared"). Di sini skrip dijalankan sebagai skrip klasik di konteks global tiruan.
  const FRAMEWORK_CONSTS = "const d=1,l=1,s=1,r=1,o=1,m=1,i=1,k=1;";

  function runGlobal(storage: Record<string, string>, earlierScript?: string) {
    const attrs = new Map<string, string>();
    const data = new Map(Object.entries(storage));
    const ctx = createContext({
      document: {
        documentElement: {
          setAttribute: (k: string, v: string) => attrs.set(k, v),
          style: { setProperty: () => {} },
        },
      },
      localStorage: {
        get length() {
          return data.size;
        },
        key: (i: number) => [...data.keys()][i] ?? null,
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => data.set(k, v),
        removeItem: (k: string) => data.delete(k),
      },
    });
    if (earlierScript) runInContext(earlierScript, ctx);
    const before = new Set(Object.keys(ctx));
    runInContext(READER_SCALE_SCRIPT, ctx);
    return { ctx, attrs, added: Object.keys(ctx).filter((k) => !before.has(k)) };
  }

  it("tidak menambah variabel global (fixture menjalankan pemindahan dan posisi baca)", () => {
    const { added, attrs } = runGlobal({
      [LEGACY_TRANSLATION_KEY]: "0",
      "surau:reader-font": "amiri",
      "surau:reader-scale": "1.3",
      "surau:last-read:ihya": "1/200",
    });
    expect(attrs.get("data-read-mode")).toBe("ar");
    expect(attrs.has("data-reading")).toBe(true);
    expect(added).toEqual([]);
  });

  it("const tingkat atas skrip lain bernama sama, sesudah atau sebelumnya, tidak bertabrakan", () => {
    const { ctx } = runGlobal({ [READ_MODE_KEY]: "ar" });
    expect(() => runInContext(FRAMEWORK_CONSTS, ctx)).not.toThrow();
    // Urutan terbalik: versi lama gagal diurai, jadi tidak satu pun preferensi terpasang.
    expect(runGlobal({ [READ_MODE_KEY]: "ar" }, FRAMEWORK_CONSTS).attrs.get("data-read-mode")).toBe(
      "ar",
    );
  });

  it("dijalankan dua kali di scope global yang sama tanpa galat (tanpa deklarasi leksikal tingkat atas)", () => {
    const { ctx } = runGlobal({});
    expect(() => runInContext(READER_SCALE_SCRIPT, ctx)).not.toThrow();
  });
});

describe("READER_SCALE_SCRIPT: petunjuk mode baca (X14)", () => {
  const hint = (r: ReturnType<typeof run>) => r.attrs.get("data-read-mode-hint");

  it("pengunjung yang belum memilih mode: petunjuk tampil (tanpa atribut)", () => {
    expect(hint(run({}))).toBeUndefined();
    expect(hint(run({ "surau:reader-font": "amiri" }))).toBeUndefined();
  });

  it("mode tersimpan (termasuk Keduanya) atau petunjuk ditutup → off", () => {
    for (const mode of ["ar", "both", "tr"])
      expect(hint(run({ [READ_MODE_KEY]: mode }))).toBe("off");
    expect(hint(run({ [READ_MODE_HINT_KEY]: "off" }))).toBe("off");
  });

  it("sakelar lama yang dipindah dihitung sebagai pilihan", () => {
    expect(hint(run({ [LEGACY_TRANSLATION_KEY]: "1" }))).toBe("off");
  });

  it("penyimpanan diblokir: petunjuk tampil, tanpa galat", () => {
    expect(hint(run({}, { failAll: true }))).toBeUndefined();
  });
});
