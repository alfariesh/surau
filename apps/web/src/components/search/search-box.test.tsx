import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

import { SEARCH_QUERY_MAX } from "@surau/core";

import { SEARCH_MAX, SearchBox } from "./search-box";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn<(href: string) => void>(),
    prefetch: vi.fn<(href: string) => void>(),
  }),
}));

// Render server kotak cari Beranda (ADR-086): segmen Maknaz hanya bila rute Jawab menyala, sumber
// ditulis apa adanya, contoh Arab lewat ArabicInline, dan contoh Cari berupa tautan /cari?q=….
describe("SearchBox", () => {
  it("batas Cari sama dengan batas API Cari", () => {
    expect(SEARCH_MAX).toBe(SEARCH_QUERY_MAX);
  });

  it("tanpa Maknaz: hanya Cari, tanpa segmen", () => {
    const html = renderToStaticMarkup(
      <SearchBox
        ask={false}
        sections={[{ id: 7, title: "ربع العبادات", children: [] }]}
        works={[{ slug: "ihya", title: "Ihya' 'Ulum ad-Din" }]}
      />,
    );
    expect(html).toContain('<search aria-label="Cari di Surau"');
    // Pemilih kitab: kosong = semua kitab.
    expect(html).toContain('aria-label="Kitab yang dicari"');
    // Satu kitab: pilihan teratas = judul kitab itu. Tanpa JS: formulir GET ke /cari, kotak bernama q.
    expect(html).toContain("Ihya&#x27; &#x27;Ulum ad-Din");
    expect(html).toContain('action="/cari"');
    expect(html).toContain('name="q"');
    expect(html).not.toContain("Maknaz");
    expect(html).toContain('href="/cari?q=sabar"');
    expect(html).toContain('<bdi class="arabic-inline" dir="rtl" lang="ar">الصبر</bdi>');
  });

  it("dengan Maknaz: segmen Cari/Maknaz, Cari terpilih lebih dulu", () => {
    const html = renderToStaticMarkup(<SearchBox ask sections={[]} works={[]} />);
    expect(html).toContain('aria-label="Cara mencari"');
    expect(html).toContain("Maknaz");
    expect(html).toMatch(/aria-checked="true"[^>]*>.*?Cari/s);
  });

  it("tanpa JS: bagian dikenal ikut sebagai input tersembunyi, tombol kirim aktif, batas 200", () => {
    const sections = [
      { id: 7, title: "ربع العبادات", children: [{ id: 8, title: "كتاب العلم", children: [] }] },
    ];
    const html = renderToStaticMarkup(
      <SearchBox ask={false} query="sabar" section={8} sections={sections} works={[]} />,
    );
    expect(html).toMatch(/<input(?=[^>]*name="bagian")(?=[^>]*type="hidden")[^>]*value="8"/);
    expect(html).toMatch(/<button[^>]*type="submit"/);
    expect(html).not.toMatch(/<button[^>]*type="submit"[^>]*disabled/);
    expect(html).toContain('maxLength="200"');
    // Judul bagian terpilih lewat ArabicInline.
    expect(html).toContain('<bdi class="arabic-inline" dir="rtl" lang="ar">كتاب العلم</bdi>');
  });

  it("bagian di URL yang tidak dikenal diabaikan (tampilan = penyaring)", () => {
    const html = renderToStaticMarkup(
      <SearchBox
        ask={false}
        section={999}
        sections={[{ id: 7, title: "ربع العبادات", children: [] }]}
        works={[]}
      />,
    );
    expect(html).not.toContain('name="bagian"');
    expect(html).not.toContain("bagian=999");
  });
});
