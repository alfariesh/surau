import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

import { SEARCH_QUERY_MAX } from "@surau/core";

import { HomeSearch, SEARCH_MAX } from "./home-search";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn<(href: string) => void>(),
    prefetch: vi.fn<(href: string) => void>(),
  }),
}));

// Render server kotak cari Beranda (ADR-086): segmen Maknaz hanya bila rute Jawab menyala, sumber
// ditulis apa adanya, contoh Arab lewat ArabicInline, dan contoh Cari berupa tautan /cari?q=….
describe("HomeSearch", () => {
  it("batas Cari sama dengan batas API Cari", () => {
    expect(SEARCH_MAX).toBe(SEARCH_QUERY_MAX);
  });

  it("tanpa Maknaz: hanya Cari, tanpa segmen", () => {
    const html = renderToStaticMarkup(
      <HomeSearch ask={false} works={[{ slug: "ihya", title: "Ihya' 'Ulum ad-Din" }]} />,
    );
    expect(html).toContain('<search aria-label="Cari di Surau"');
    // Pemilih kitab: kosong = semua kitab.
    expect(html).toContain('aria-label="Kitab yang dicari"');
    expect(html).toContain("Semua kitab");
    expect(html).not.toContain("Maknaz");
    expect(html).toContain('href="/cari?q=sabar"');
    expect(html).toContain('<bdi class="arabic-inline" dir="rtl" lang="ar">الصبر</bdi>');
  });

  it("dengan Maknaz: segmen Cari/Maknaz, Cari terpilih lebih dulu", () => {
    const html = renderToStaticMarkup(<HomeSearch ask works={[]} />);
    expect(html).toContain('aria-label="Cara mencari"');
    expect(html).toContain("Maknaz");
    expect(html).toMatch(/aria-checked="true"[^>]*>.*?Cari/s);
  });
});
