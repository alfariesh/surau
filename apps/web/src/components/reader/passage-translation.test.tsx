import type { AyahRef } from "@surau/core";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { joinTranslations, PassageTranslation } from "./passage-translation";

const REF: AyahRef = {
  char_start: 0,
  char_end: 5,
  surah: 2,
  ayah_from: 255,
  ayah_to: 255,
  match: "exact",
  partial: false,
  bracketed: true,
  alt_count: 0,
  label: "QS Al-Baqarah [2]: 255",
};

const render = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("PassageTranslation (X04 W3)", () => {
  it("label AI: awalan pembaca layar + satu lencana terlihat, tanpa baris label terpisah", () => {
    const html = render(
      <PassageTranslation
        anchor="p7"
        footAnchor={{}}
        permalink="/kitab/uji/1/5#p7"
        translation={{
          segments: [{ kind: "ai", label: "ai_translation", text: 'Ia berkata, "Sabar."' }],
          bold: null,
          lang: "id",
        }}
      />,
    );
    expect(html).toContain('<span class="sr-only" data-copy-skip="">Terjemahan AI: </span>');
    expect(html.match(/class="ai-badge"/g)).toHaveLength(1);
    expect(html).toContain('aria-hidden="true" class="ai-badge"');
    expect(html).toContain('data-permalink="/kitab/uji/1/5#p7"');
    expect(html).toContain('lang="id"');
  });

  it("bahasa blok terjemahan dari datanya, bukan bahasa UI (X11)", () => {
    const html = render(
      <PassageTranslation
        anchor="p7"
        footAnchor={{}}
        permalink="/kitab/uji/1/5#p7"
        translation={{
          segments: [{ kind: "ai", label: "ai_translation", text: "He said, be patient." }],
          bold: null,
          lang: "en",
        }}
      />,
    );
    expect(html).toContain('lang="en"');
    expect(html).not.toContain('lang="id"');
  });

  it("kutipan berpasangan bergaya kutipan", () => {
    const html = render(
      <PassageTranslation
        anchor="p7"
        footAnchor={{}}
        permalink="/kitab/uji/1/5#p7"
        translation={{
          segments: [{ kind: "ai", label: "ai_translation", text: 'Ia berkata, "Sabar."' }],
          bold: null,
          lang: "id",
        }}
      />,
    );
    // Kutipan berpasangan: petik melengkung bergaya kutipan.
    expect(html).toContain('<span class="tr-quote">“Sabar.”</span>');
    expect(html).not.toContain("typography");
  });

  it("segmen ayat memakai label Kemenag sendiri, bukan teks AI", () => {
    const html = render(
      <PassageTranslation
        anchor="p8"
        footAnchor={{}}
        permalink="/kitab/uji/1/5#p8"
        translation={{
          segments: [
            { kind: "ai", label: "ai_translation", text: "Allah berfirman, " },
            {
              kind: "ayah",
              label: "kemenag",
              placeholder: "⟦QS 2:255⟧",
              ref: REF,
              ayat: [{ ayah: 255, text: "Allah, tidak ada tuhan selain Dia.", footnotes: [] }],
              attribution: "Kemenag (2019)",
            },
          ],
          bold: null,
          lang: "id",
        }}
      />,
    );
    expect(html).toContain('data-tr-seg="ayah"');
    expect(html).toContain("QS 2:255 · Terjemahan Kemenag");
    expect(html).toContain("<q>Allah, tidak ada tuhan selain Dia.</q>");
  });

  it("judul: satu baris tebal di bawah judul Arab; lanjutan judul digabung dengan spasi", () => {
    const joined = joinTranslations([
      {
        segments: [{ kind: "ai", label: "ai_translation", text: "Penjelasan tentang" }],
        bold: null,
        lang: "id",
      },
      {
        segments: [{ kind: "ai", label: "ai_translation", text: "riwayat-riwayat" }],
        bold: null,
        lang: "id",
      },
    ]);
    const html = render(
      <PassageTranslation
        heading
        anchor="p9"
        footAnchor={{}}
        permalink="/kitab/uji/1/5#p9"
        translation={joined}
      />,
    );
    expect(html).toContain("passage-translation-heading");
    expect(html.replace(/<[^>]+>/g, "")).toContain(
      "Terjemahan AI: Penjelasan tentang riwayat-riwayat Terjemahan AI",
    );
  });

  it("tanpa terjemahan: tidak merender apa pun", () => {
    expect(
      render(
        <PassageTranslation anchor="p1" footAnchor={{}} permalink="/x#p1" translation={null} />,
      ),
    ).toBe("");
  });
});

describe("PassageTranslation: tinjauan manusia (X08, ADR-082)", () => {
  const review = {
    revised: true,
    reviewed_at: "2026-10-22T03:00:00.000Z",
    reviewer_role: "ustadz" as const,
    reviewer_name: "Ust. Uji Lc.",
    reviewer_short: "Ust. Uji",
  };
  const seg = (text: string) => [{ kind: "ai" as const, label: "ai_translation" as const, text }];

  it("dikoreksi: lencana tombol + popover nama lengkap & tanggal, label salinan, [..] redup", () => {
    const html = render(
      <PassageTranslation
        anchor="p7"
        footAnchor={{}}
        permalink="/kitab/uji/1/5#p7"
        translation={{ segments: seg("Allah [Ta'ala] berfirman."), bold: null, lang: "id", review }}
      />,
    );
    expect(html).toContain("Terjemahan AI · dikoreksi Ust. Uji: </span>");
    expect(html).toMatch(
      /<button[^>]*class="ai-badge ai-badge-review"[^>]*popoverTarget="tr-review-p7"|<button[^>]*popovertarget="tr-review-p7"[^>]*class="ai-badge ai-badge-review"/u,
    );
    expect(html).toContain('id="tr-review-p7" popover="auto"');
    // Nama aksesibel = teks lencana (WCAG 2.5.3), rincian = deskripsi dari popover.
    expect(html).toContain('aria-describedby="tr-review-p7"');
    expect(html).not.toContain("aria-label=");
    expect(html).toContain("dikoreksi Ust. Uji Lc. pada 22 Oktober 2026");
    expect(html).toContain('data-tr-label="Terjemahan AI · dikoreksi Ust. Uji"');
    expect(html).toMatch(/<span class="tr-added"[^>]*>\[Ta&#x27;ala\]<\/span>/u);
  });

  it("kurung siku tulisan AI (bukan perbaikan) tidak diberi gaya tambahan; label AI biasa", () => {
    const html = render(
      <PassageTranslation
        anchor="p8"
        footAnchor={{}}
        permalink="/kitab/uji/1/5#p8"
        translation={{ segments: seg("Lihat [ayat 26]."), bold: null, lang: "id", review: null }}
      />,
    );
    expect(html).not.toContain("tr-added");
    expect(html).not.toContain("popover");
    expect(html).not.toContain("data-tr-label");
    // Diperiksa (bukan dikoreksi): kurung siku pun tidak redup.
    const checked = render(
      <PassageTranslation
        anchor="p9"
        footAnchor={{}}
        permalink="/kitab/uji/1/5#p9"
        translation={{
          segments: seg("Lihat [ayat 26]."),
          bold: null,
          lang: "id",
          review: { ...review, revised: false },
        }}
      />,
    );
    expect(checked).toContain("Terjemahan AI · diperiksa Ust. Uji");
    expect(checked).not.toContain("tr-added");
  });
});
