import { createContext, runInContext } from "node:vm";

import { describe, expect, it } from "vite-plus/test";

import { type DeferredScript, deferLoaderScript, shouldDeferScripts } from "./defer-scripts";

// Pemuat inline dijalankan sebagai skrip klasik di konteks global tiruan (seperti di <head>): DOM
// tiruan mencatat skrip yang disisipkan; stylesheet tiruan bisa belum/sudah dimuat. HTMLRewriter
// hanya ada di runtime Workers, jadi penulisan ulang HTML-nya diuji e2e terhadap Preview.

type Listener = () => void;

function stylesheet(loaded: boolean) {
  const on: Record<string, Listener[]> = {};
  return {
    sheet: loaded ? {} : null,
    addEventListener: (type: string, f: Listener) => (on[type] ??= []).push(f),
    fire: (type: string) => (on[type] ?? []).forEach((f) => f()),
  };
}

function run(scripts: DeferredScript[], sheets: ReturnType<typeof stylesheet>[]) {
  const inserted: Record<string, unknown>[] = [];
  const windowOn: Record<string, Listener[]> = {};
  const ctx = createContext({
    document: {
      head: { appendChild: (e: Record<string, unknown>) => inserted.push(e) },
      createElement: () => ({}),
      querySelectorAll: () => sheets,
    },
    addEventListener: (type: string, f: Listener) => (windowOn[type] ??= []).push(f),
  });
  const before = new Set(Object.keys(ctx));
  runInContext(deferLoaderScript(scripts), ctx);
  return {
    inserted,
    added: Object.keys(ctx).filter((k) => !before.has(k)),
    windowLoad: () => (windowOn.load ?? []).forEach((f) => f()),
  };
}

const A: DeferredScript = { src: "/_next/static/chunks/a.js", crossOrigin: null, integrity: null };
const B: DeferredScript = {
  src: "/_next/static/chunks/b.js",
  crossOrigin: "anonymous",
  integrity: "sha384-x",
};

describe("deferLoaderScript", () => {
  it("CSS sudah dimuat: skrip langsung disisipkan, urutan dan atribut sama, async", () => {
    const { inserted, added } = run([A, B], [stylesheet(true)]);
    expect(inserted).toEqual([
      { src: A.src, async: true },
      { src: B.src, async: true, crossOrigin: "anonymous", integrity: "sha384-x" },
    ]);
    expect(added).toEqual([]);
  });

  it("menunggu SEMUA stylesheet yang belum dimuat (load atau error), lalu sekali saja", () => {
    const s1 = stylesheet(false);
    const s2 = stylesheet(false);
    const { inserted, windowLoad } = run([A], [s1, stylesheet(true), s2]);
    expect(inserted).toHaveLength(0);
    s1.fire("load");
    expect(inserted).toHaveLength(0);
    s2.fire("error");
    expect(inserted).toHaveLength(1);
    windowLoad();
    s1.fire("load");
    expect(inserted).toHaveLength(1);
  });

  it("event load jendela menjadi cadangan bila event stylesheet tidak pernah datang", () => {
    const { inserted, windowLoad } = run([A, B], [stylesheet(false)]);
    expect(inserted).toHaveLength(0);
    windowLoad();
    expect(inserted).toHaveLength(2);
  });

  it("src berisi tanda kutip atau </script> tidak bisa keluar dari string maupun elemen skrip", () => {
    const evil = {
      src: '/_next/static/x.js"</script><script>alert(1)//',
      crossOrigin: null,
      integrity: null,
    };
    expect(deferLoaderScript([evil]).toLowerCase()).not.toContain("</script");
    expect(run([evil], [stylesheet(true)]).inserted[0]?.src).toBe(evil.src);
  });
});

describe("shouldDeferScripts", () => {
  const res = (headers: Record<string, string>, body: string | null = "<html></html>") =>
    new Response(body, { headers });

  it("hanya HTML ber-body tanpa kompresi", () => {
    expect(shouldDeferScripts(res({ "content-type": "text/html; charset=utf-8" }))).toBe(true);
    expect(
      shouldDeferScripts(res({ "content-type": "text/html", "content-encoding": "identity" })),
    ).toBe(true);
    expect(shouldDeferScripts(res({ "content-type": "text/html", "content-encoding": "br" }))).toBe(
      false,
    );
    expect(shouldDeferScripts(res({ "content-type": "text/x-component" }))).toBe(false);
    expect(shouldDeferScripts(res({ "content-type": "application/json" }))).toBe(false);
    expect(shouldDeferScripts(res({ "content-type": "text/html" }, null))).toBe(false);
  });
});
