import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { BASMALAH } from "../../content/basmalah";

import { ArabicInline, ArabicText } from "./index";

describe("ArabicText", () => {
  it("merender blok dengan lang=ar, dir=rtl, dan kelas tipografi Arab", () => {
    const html = renderToStaticMarkup(<ArabicText>{BASMALAH.text}</ArabicText>);

    expect(html).toBe(`<p class="arabic-text" dir="rtl" lang="ar">${BASMALAH.text}</p>`);
  });

  it("menerima elemen lain dan kelas tambahan tanpa membuang atribut arah", () => {
    const html = renderToStaticMarkup(
      <ArabicText as="blockquote" className="text-2xl">
        {BASMALAH.text}
      </ArabicText>,
    );

    expect(html).toMatch(/^<blockquote class="arabic-text text-2xl" dir="rtl" lang="ar">/);
  });

  it("memakai skala ukuran lewat data-size; md (bawaan) tidak menambah atribut", () => {
    const lg = renderToStaticMarkup(<ArabicText size="lg">{BASMALAH.text}</ArabicText>);
    const md = renderToStaticMarkup(<ArabicText size="md">{BASMALAH.text}</ArabicText>);

    expect(lg).toContain('data-size="lg"');
    expect(md).not.toContain("data-size");
  });

  it("tidak mengubah teks sumber sedikit pun", () => {
    const html = renderToStaticMarkup(<ArabicText>{BASMALAH.text}</ArabicText>);

    expect(html).toContain(BASMALAH.text);
  });
});

describe("ArabicInline", () => {
  it("memakai <bdi> dengan lang=ar dan dir=rtl", () => {
    const html = renderToStaticMarkup(
      <span>
        Kitab <ArabicInline>{BASMALAH.text}</ArabicInline> (QS 1:1)
      </span>,
    );

    expect(html).toContain(`<bdi class="arabic-inline" dir="rtl" lang="ar">${BASMALAH.text}</bdi>`);
  });

  it("memakai skala ukuran lewat data-size", () => {
    const html = renderToStaticMarkup(<ArabicInline size="display">{BASMALAH.text}</ArabicInline>);

    expect(html).toContain('data-size="display"');
  });
});
