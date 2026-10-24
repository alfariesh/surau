import { digestView } from "@surau/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import {
  FIXTURE_BOOK,
  FIXTURE_CHILDREN,
  FIXTURE_SECTION,
  FIXTURE_TEXT,
} from "../../lib/reader/digest-fixture";

import { DigestPage } from "./digest-page";
import { ListenSlot } from "./listen-slot";

const render = (digest = FIXTURE_BOOK, sections = FIXTURE_CHILDREN) =>
  renderToStaticMarkup(
    <DigestPage
      author="penulis uji"
      crumbs={[{ name: "Kitab", href: "/kitab" }]}
      digest={digest}
      editionSlug="uji"
      hubHref="/dev/intisari"
      sections={sections}
      titleId="Kitab Uji"
      titleLang="id"
      workSlug="uji"
    />,
  );

describe("fixture Intisari (X16)", () => {
  it("sah menurut kontrak DigestView core", () => {
    expect(digestView.parse(FIXTURE_BOOK)).toEqual(FIXTURE_BOOK);
    expect(digestView.parse(FIXTURE_SECTION)).toEqual(FIXTURE_SECTION);
  });
});

describe("DigestPage (X16)", () => {
  const html = render();

  it("label AI: lencana Intisari AI + model, versi prompt, tanggal, status tinjau", () => {
    expect(html).toContain("Intisari AI");
    expect(html).toContain(
      "Dibuat Claude Sonnet 5.5 (digest-book@1) pada 24 Oktober 2026, belum ditinjau manusia.",
    );
    // Judul Indonesia (terjemahan AI daftar isi) berlencana sendiri.
    expect(html).toContain("Terjemahan AI");
  });

  it("setiap gagasan punya minimal satu tautan Dasar teks ke permalink paragraf (#pN)", () => {
    for (const p of FIXTURE_BOOK.points) {
      const item = new RegExp(`<li[^>]*id="gagasan-${p.ord}"[\\s\\S]*?</li>`, "u").exec(html)?.[0];
      expect(item, `gagasan ${p.ord}`).toBeDefined();
      expect(item).toMatch(/data-basis="" href="\/kitab\/uji\/1\/\d+#p\d+"/u);
    }
  });

  it("nomor gagasan berurutan walau ord melompat (gagasan ditolak tidak dikirim core)", () => {
    expect(FIXTURE_BOOK.points.map((p) => p.ord)).toEqual([1, 2, 4]);
    expect(html).toContain("Gagasan 3: </span>Mulai dari yang wajib");
    expect(html).toContain("Jawabannya di gagasan 3: Mulai dari yang wajib");
  });

  it("kutipan: teks Arab = text_raw dari data (lang ar, rtl), rentang untuk e2e, terjemahan berlabel", () => {
    for (const q of FIXTURE_BOOK.quotes) {
      expect(html).toContain(`data-quote-range="${q.passage_id}:${q.char_start}:${q.char_end}"`);
      expect(html).toContain(`dir="rtl" lang="ar">${q.text_raw}</blockquote>`);
    }
    expect(html).toContain(FIXTURE_TEXT.p1);
    expect(html).toMatch(/Ini teks contoh pertama[^<]*<span class="ai-badge"[^>]*>Terjemahan AI/u);
    // Riwayat: label takhrij miliknya sendiri (kode) + teks takhrij asli, bukan tebakan.
    const report = /<figure[^>]*id="kutipan-2"[\s\S]*?<\/figure>/u.exec(html)?.[0] ?? "";
    expect(report).toContain("Takhrij (١): takhrij menyebut: lemah");
    expect(report).toContain("Takhrij memuat istilah kelemahan");
    expect(report).toContain(FIXTURE_TEXT.foot);
    expect(report).not.toContain("belum diketahui");
  });

  it("anjuran penulis membawa catatan tanyakan ulama; sikap disebut dengan nama penulis", () => {
    expect(html).toContain("Anjuran penulis");
    expect(html).toContain("Untuk kasus pribadi, tanyakan kepada ulama.");
    expect(html).toContain("Pendapat penulis uji");
    expect(html).toContain("Dinukil penulis uji");
  });

  it("dalil: ayat dari data (teks + terjemahan sumbernya), takhrij asli + label kode", () => {
    expect(html).toContain('id="dalil-ayat-1"');
    expect(html).toContain("كَلِمَةٌ تَجْرِيبِيَّةٌ");
    expect(html).toContain("(Terjemahan Uji, 1:2)");
    expect(html).toContain('id="dalil-hadits-1"');
    expect(html).toContain(FIXTURE_TEXT.foot);
    expect(html).toContain("takhrij menyebut: lemah");
    expect(html).toContain("dikenali otomatis dari teks takhrij, belum ditinjau");
    expect(html).toContain("Takhrij memuat istilah kelemahan");
    // Chip dalil di gagasannya menaut ke daftar Dalil.
    expect(html).toContain('href="#dalil-ayat-1"');
    expect(html).toContain('href="#dalil-hadits-1"');
  });

  it("Uji pemahaman terlipat; penutup Kitab; lanjut ke teks lengkap + catatan guru", () => {
    expect(html).toContain('<details class="intisari-question"><summary>');
    expect(html).toContain("Yang dibahas");
    expect(html).toContain("Penutup");
    expect(html).toMatch(/data-intisari-text="" href="\/kitab\/uji\/bab\/9900001"/u);
    expect(html).toContain("bersama guru");
    expect(html).toContain("Intisari bab di kitab ini");
  });

  it("tata letak Bab: tanpa pembuka/penutup/daftar bab", () => {
    const bab = render(FIXTURE_SECTION, []);
    expect(bab).not.toContain("Yang dibahas");
    expect(bab).not.toContain("Intisari bab di kitab ini");
    expect(bab).toContain("Intisari Bab");
  });
});

describe("ListenSlot (slot X17)", () => {
  it("tanpa audio tidak merender apa pun; dengan audio tombol Dengarkan berlabel suara AI", () => {
    expect(renderToStaticMarkup(<ListenSlot track={null} />)).toBe("");
    const html = renderToStaticMarkup(
      <ListenSlot
        track={{
          id: "ihya/100074",
          key: "ihya/id/100074-0123456789ab.mp3",
          src: "https://media.surau.org/ihya/id/100074-0123456789ab.mp3",
          title: "Kitab Ilmu",
          workTitle: "Ihya' 'Ulum ad-Din",
          href: "/kitab/ihya/bab/100074/intisari",
          duration: 125,
          voice: { kind: "ai", name: "Narator" },
          chapters: [],
        }}
      />,
    );
    expect(html).toContain("Dengarkan");
    expect(html).toContain("2 menit");
    expect(html).toContain("Dibacakan suara AI (Narator)");
    expect(html).toContain('data-listen-button="ihya/100074"');
  });
});

describe("QuoteCard: riwayat tanpa takhrij (X16)", () => {
  it("status belum diketahui, tanpa tebakan", () => {
    const quote = { ...FIXTURE_BOOK.quotes[1]!, takhrij: [] };
    const html = renderToStaticMarkup(
      <DigestPage
        author="penulis uji"
        crumbs={[]}
        digest={{ ...FIXTURE_SECTION, quotes: [{ ...quote, point_ord: null }] }}
        editionSlug="uji"
        hubHref={null}
        sections={[]}
        titleId={null}
        workSlug="uji"
      />,
    );
    expect(html).toContain("Status riwayat ini belum diketahui");
    // Tanpa hub (belum ada Intisari Kitab): tanpa tautan "Semua Intisari".
    expect(html).not.toContain("Semua Intisari");
  });
});
