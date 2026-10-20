import { describe, expect, it } from "vite-plus/test";

import { breadcrumbJsonLd, serializeJsonLd } from "./breadcrumb-jsonld";

describe("breadcrumbJsonLd", () => {
  it("menyusun BreadcrumbList berurutan dengan alamat absolut", () => {
    const data = breadcrumbJsonLd([
      { name: "Kitab", href: "/kitab" },
      { name: "Ihya", href: "/kitab/ihya" },
      { name: "Juz 1 · Halaman 4", href: "https://surau.org/kitab/ihya/1/4" },
    ]);

    expect(data["@type"]).toBe("BreadcrumbList");
    expect(data.itemListElement.map((i) => [i.position, i.item])).toEqual([
      [1, "https://surau.org/kitab"],
      [2, "https://surau.org/kitab/ihya"],
      [3, "https://surau.org/kitab/ihya/1/4"],
    ]);
  });

  it("menyimpan judul apa adanya dan mengamankan < pada serialisasi", () => {
    const data = breadcrumbJsonLd([{ name: "</script><b>باب", href: "/kitab" }]);
    const json = serializeJsonLd(data);

    expect(json).not.toContain("<");
    expect(JSON.parse(json).itemListElement[0].name).toBe("</script><b>باب");
  });
});
