import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import type { TocItem } from "./toc";

// Pohon daftar isi lengkap di klien (X09): diambil sekali per karya, gagal = tetap pohon ringkas.

const ITEM: TocItem = {
  id: 1,
  kind: "node",
  title: "باب",
  level: 1,
  href: "/kitab/uji/1/1",
  juz: 1,
  page: 1,
  children: [],
};

async function fresh() {
  vi.resetModules();
  return import("./full-toc");
}

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("full-toc", () => {
  it("mengambil sekali per karya dan memberi tahu pendengar", async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () =>
      Response.json({ items: [ITEM], titleSource: null }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const m = await fresh();
    const listener = vi.fn<() => void>();
    m.subscribeFullToc(listener);
    m.loadFullToc("uji");
    m.loadFullToc("uji");
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/kitab/uji/daftar-isi.json");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(m.fullTocFor("uji")?.items).toEqual([ITEM]);
    m.loadFullToc("uji");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(m.fullTocFor("lain")).toBeNull();
  });

  it("gagal (galat jaringan, 404, isi bukan pohon) = tetap null dan boleh dicoba lagi", async () => {
    const fetchMock = vi
      .fn<(url: string) => Promise<Response>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response("nope", { status: 404 }))
      .mockResolvedValueOnce(Response.json({ items: "bukan" }))
      .mockResolvedValueOnce(Response.json({ items: [ITEM], titleSource: null }));
    vi.stubGlobal("fetch", fetchMock);
    const m = await fresh();
    for (let i = 0; i < 3; i++) {
      m.loadFullToc("uji");
      await flush();
      expect(m.fullTocFor("uji")).toBeNull();
    }
    m.loadFullToc("uji");
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(m.fullTocFor("uji")?.items).toEqual([ITEM]);
  });
});
