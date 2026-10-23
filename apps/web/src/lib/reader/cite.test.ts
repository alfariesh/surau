import type { CitationSource } from "@surau/core";

import { describe, expect, it } from "vite-plus/test";

import { citeForPath, citeHtml, citeParts, citeText } from "./cite";

// Bentuk Citation.source Ihya dari @surau/core (README paket, contoh readPage).
const IHYA: CitationSource = {
  work: {
    slug: "ihya",
    title_ar: "إحياء علوم الدين",
    title_id: "Ihya' 'Ulum ad-Din",
    author: { name_ar: "أبو حامد الغزالي", name_id: "Abu Hamid al-Ghazali", death_hijri: 505 },
    attribution_status: "authentic",
  },
  edition: {
    id: 1,
    slug: "dar-al-marifah",
    is_default: true,
    publisher: "دار المعرفة",
    city: "بيروت",
  },
  license: "CC BY-NC-SA 4.0",
  attribution: "Teks: OpenITI",
};

const URL_200 = "https://surau.example/kitab/ihya/1/200";

describe("sitasi salin", () => {
  it("format sitasi Ihya sesuai rencana S09: pengarang, judul, penerbit, j.1 h.200 + permalink", () => {
    expect(citeText(citeParts(IHYA, 1, 200), URL_200)).toBe(
      "al-Ghazali, Ihya' 'Ulum ad-Din, Dar al-Ma'rifah, j.1 h.200. https://surau.example/kitab/ihya/1/200",
    );
  });

  it("permalink paragraf ikut apa adanya", () => {
    expect(citeText(citeParts(IHYA, 1, 200), `${URL_200}#p2826`)).toMatch(/h\.200\. .+#p2826$/);
  });

  it("HTML: judul miring, tanda kutip di-escape, tautan bisa diklik", () => {
    expect(citeHtml(citeParts(IHYA, 1, 200), URL_200)).toBe(
      `al-Ghazali, <i>Ihya&#39; &#39;Ulum ad-Din</i>, Dar al-Ma&#39;rifah, j.1 h.200. <a href="${URL_200}">${URL_200}</a>`,
    );
  });

  it("karya/edisi tanpa nama tampilan memakai data DB; bagian kosong dilewati", () => {
    const other: CitationSource = {
      ...IHYA,
      work: { ...IHYA.work, slug: "lain", title_id: null, author: null },
      edition: { ...IHYA.edition, slug: "x", publisher: null },
    };
    expect(citeText(citeParts(other, 2, 5), "u")).toBe("إحياء علوم الدين, j.2 h.5. u");
    const named: CitationSource = { ...IHYA, work: { ...IHYA.work, slug: "lain" } };
    expect(citeParts(named, 1, 1).author).toBe("Abu Hamid al-Ghazali");
  });

  it("sitasi per permalink: paragraf halaman sambungan disitasi dengan juz/halamannya sendiri", () => {
    const base = citeParts(IHYA, 1, 200);
    expect(citeForPath(base, "/kitab/ihya/1/201#p2830")).toMatchObject({ juz: 1, pageNo: 201 });
    expect(citeText(citeForPath(base, "/kitab/ihya/2/5"), "u")).toMatch(/j\.2 h\.5\. u$/);
    // Path lain (bab, karya) memakai sitasi halaman apa adanya.
    expect(citeForPath(base, "/kitab/ihya/bab/100074")).toBe(base);
    expect(citeForPath(base, "/kitab/ihya")).toBe(base);
  });
});
