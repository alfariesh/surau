import { describe, expect, test } from "vite-plus/test";

import {
  cleanShamelaHtml,
  extractTitles,
  findFootnoteMarkers,
  linkFootnoteMarkers,
  linkFootnotes,
  splitFootnoteEntries,
  splitFootnotes,
  splitInlineTakhrij,
  splitParagraphs,
} from "./shamela.ts";

// Halaman BUATAN yang meniru struktur Shamela (span judul, \r, 9 garis bawah, penanda (١)).
// Isinya kalimat pendek karangan, bukan teks Shamela.
const PAGE =
  '<span data-type="title" id=toc-12>بَابُ فَضْلِ الْعِلْمِ</span>\r' +
  "قَالَ بَعْضُهُمْ: الْعِلْمُ نُورٌ (١) وَالْعَمَلُ ثَمَرَتُهُ (٢).\r" +
  "وَهَذَا مَثَلٌ مَشْهُورٌ (١).\r" +
  "_________\r" +
  "(١) هَذَا كَلَامٌ مَصْنُوعٌ لِلتَّجْرِبَةِ.\r" +
  "(٢) وَهَذَا أَيْضًا.";

describe("splitFootnotes", () => {
  test("memisah pada baris 9 garis bawah (port prototipe)", () => {
    const s = splitFootnotes("متن\r_________\r(١) حديث ...");
    expect(s.body).toBe("متن");
    expect(s.footnotes).toBe("(١) حديث ...");
    expect(s.footStart).toBe("متن\r_________\r".length);
  });

  test("tanpa garis → semuanya badan teks", () => {
    expect(splitFootnotes("متن فقط")).toEqual({ body: "متن فقط", footnotes: "", footStart: 7 });
  });

  test("garis bawah di tengah kalimat bukan pemisah; \\n dan \\r\\n diterima", () => {
    expect(splitFootnotes("قال _________ ثم").footnotes).toBe("");
    expect(splitFootnotes("متن\n_____\nحاشية").footnotes).toBe("حاشية");
    expect(splitFootnotes("متن\r\n_________  \r\nحاشية").body).toBe("متن");
    expect(splitFootnotes("_________\rحاشية").body).toBe("");
  });
});

describe("splitParagraphs", () => {
  test("pecah per \\r, lewati baris kosong, offset menunjuk ke input", () => {
    const src = "  اول  \r\r ثان\r\nثالث\n";
    const ps = splitParagraphs(src);
    expect(ps.map((p) => p.text)).toEqual(["اول", "ثان", "ثالث"]);
    for (const p of ps) expect(src.slice(p.start, p.end)).toBe(p.text);
  });
});

describe("cleanShamelaHtml dan extractTitles", () => {
  test("span judul dibuang, isi tetap, posisi dan toc id tercatat", () => {
    const { body } = splitFootnotes(PAGE);
    const { text, titles } = cleanShamelaHtml(body);
    expect(text.startsWith("بَابُ فَضْلِ الْعِلْمِ\r")).toBe(true);
    expect(text).not.toContain("<");
    expect(titles).toEqual([{ tocId: 12, start: 0, end: 22, text: "بَابُ فَضْلِ الْعِلْمِ" }]);
    expect(extractTitles(body)).toEqual(titles);
  });

  test("variasi atribut: kutip tunggal, tanpa id, class=title", () => {
    const html =
      "<span data-type='title' id=toc-7>ا</span> <span data-type=\"title\">ب</span> <span class='title'>ج</span>";
    expect(extractTitles(html).map((t) => [t.tocId, t.text])).toEqual([
      [7, "ا"],
      [null, "ب"],
      [null, "ج"],
    ]);
  });

  test("span bersarang, span ayat, </span> yatim, judul tak ditutup", () => {
    const html =
      '<span data-type="title" id=toc-3>باب <span id="aya-5">اية</span> تم</span></span> بعد';
    const out = cleanShamelaHtml(html);
    expect(out.text).toBe("باب اية تم بعد");
    expect(out.titles[0]?.text).toBe("باب اية تم");
    expect(cleanShamelaHtml('<span data-type="title" id=toc-9>بلا ختام').titles[0]).toEqual({
      tocId: 9,
      start: 0,
      end: 8,
      text: "بلا ختام",
    });
  });

  test("tag blok menjadi batas paragraf; <img> dibuang; tag tak dikenal dibiarkan dan dilaporkan", () => {
    const html =
      "اول<hr>ثان<br/>ثالث<img src='data:image/png;base64,AAAA'><table dir=rtl>رابع</table><s1>";
    expect(cleanShamelaHtml(html)).toMatchObject({
      text: "اول\rثان\rثالث\rرابع\r<s1>",
      unknownTags: ["s1"],
    });
    expect(cleanShamelaHtml("<tr><td>ا</td><td>ب</td></tr>").text).toBe("\r ا  ب \r");
    // Teks yang hanya mirip tag tidak boleh hilang dari text_raw.
    expect(cleanShamelaHtml("x<y dan y>z")).toEqual({
      text: "x<y dan y>z",
      titles: [],
      unknownTags: ["y"],
    });
  });

  test("span self-closing tidak mengacaukan tumpukan judul", () => {
    const out = cleanShamelaHtml('<span data-type="title" id=toc-4>باب<span id="x"/></span> بعد');
    expect(out.titles[0]?.text).toBe("باب");
  });

  test("entitas HTML diurai; entitas tidak dikenal atau tidak valid dibiarkan", () => {
    expect(cleanShamelaHtml("a &lt;b&gt; &amp; &quot;c&quot; &apos;d&apos;").text).toBe(
      "a <b> & \"c\" 'd'",
    );
    expect(cleanShamelaHtml("x&nbsp;y").text).toBe("x\u00A0y");
    expect(cleanShamelaHtml("&#1575;&#x644;").text).toBe("ال");
    expect(cleanShamelaHtml("&copy; &#0; &#xD800; &#x110000;").text).toBe(
      "&copy; &#0; &#xD800; &#x110000;",
    );
  });
});

describe("penanda dan catatan kaki", () => {
  test("findFootnoteMarkers: angka Arab-India, Persia, ASCII, dua digit, berspasi", () => {
    const ms = findFootnoteMarkers("ا (١) ب (۲) ج (3) د ( ١٢ ) ه (12345)");
    expect(ms.map((m) => m.number)).toEqual([1, 2, 3, 12]);
    expect(ms[0]).toEqual({ number: 1, start: 2, end: 5 });
  });

  test("splitFootnoteEntries: per baris, baris lanjutan, beberapa catatan dalam satu baris", () => {
    const foot = "(١) اول\rسطر تابع\r(٢) ثان (٣) ثالث فيه (٩) ليس جديدا";
    const notes = splitFootnoteEntries(foot);
    expect(notes.map((n) => [n.number, n.text])).toEqual([
      [1, "(١) اول\rسطر تابع"],
      [2, "(٢) ثان"],
      [3, "(٣) ثالث فيه (٩) ليس جديدا"],
    ]);
    for (const n of notes) expect(foot.slice(n.start, n.end)).toBe(n.text);
  });

  test("penanda tengah baris yang nomornya ada di awal baris lain bukan catatan baru", () => {
    const foot = "(١) اول انظر رقم (٢) هنا\r(٢) ثان";
    expect(splitFootnoteEntries(foot).map((n) => [n.number, n.text])).toEqual([
      [1, "(١) اول انظر رقم (٢) هنا"],
      [2, "(٢) ثان"],
    ]);
  });

  test("teks sebelum penanda pertama menjadi catatan tanpa nomor; kosong → []", () => {
    expect(splitFootnoteEntries("تمهيد\r(١) اول").map((n) => n.number)).toEqual([null, 1]);
    expect(splitFootnoteEntries("")).toEqual([]);
    expect(splitFootnoteEntries(" \r ")).toEqual([]);
  });

  test("linkFootnotes: penanda → catatan bernomor sama, termasuk rujukan berulang", () => {
    const { body, footnotes } = splitFootnotes(PAGE);
    const r = linkFootnotes(body, footnotes);
    expect(r.refs.map((x) => x.number)).toEqual([1, 2, 1]);
    expect(r.notes.map((x) => x.number)).toEqual([1, 2]);
    expect(r.links).toEqual([
      { ref: 0, note: 0 },
      { ref: 1, note: 1 },
      { ref: 2, note: 0 },
    ]);
    expect(r.orphanRefs).toEqual([]);
    expect(r.orphanNotes).toEqual([]);
  });

  test("linkFootnoteMarkers: penanda dari beberapa paragraf; catatan tanpa nomor bukan tujuan", () => {
    const refs = [...findFootnoteMarkers("ا (١)"), ...findFootnoteMarkers("ب (٢) ج (٣)")];
    const r = linkFootnoteMarkers(refs, [
      { number: 1 },
      { number: null },
      { number: 2 },
      { number: 2 },
    ]);
    expect(r.links).toEqual([
      { ref: 0, note: 0 },
      { ref: 1, note: 2 },
    ]);
    expect(r.orphanRefs).toEqual([2]);
    expect(r.orphanNotes).toEqual([3]);
  });

  test("linkFootnotes: penanda yatim dan catatan yatim dilaporkan", () => {
    const r = linkFootnotes("ا (١) ب (٤)", "(١) اول\r(٢) ثان\rبلا رقم");
    expect(r.orphanRefs).toEqual([1]);
    expect(r.orphanNotes).toEqual([1]);
    expect(r.notes.at(-1)?.text).toBe("(٢) ثان\rبلا رقم");
  });
});

describe("splitInlineTakhrij (takhrij bercampur ke matan lewat //)", () => {
  // Kalimat buatan dan frasa hadits umum yang pendek; bukan teks Shamela.
  const parts = (p: string) => {
    const r = splitInlineTakhrij(p);
    if (r === null) return null;
    const text = (s: { start: number; end: number } | null) =>
      s === null ? null : p.slice(s.start, s.end);
    return {
      direction: r.direction,
      takhrij: text(r.takhrij),
      before: text(r.before),
      after: text(r.after),
      marker: r.marker === null ? null : [r.marker.number, text(r.marker)],
      slash: text(r.slash),
    };
  };

  test("tanpa // → null", () => {
    expect(splitInlineTakhrij("قال الشيخ كلاما حسنا")).toBeNull();
  });

  test("takhrij SESUDAH //: dari pembuka حديث sampai akhir paragraf", () => {
    expect(parts("قال الشيخ الصبر ضياء // حديث الصبر ضياء أخرجه مسلم")).toEqual({
      direction: "after",
      takhrij: "حديث الصبر ضياء أخرجه مسلم",
      before: "قال الشيخ الصبر ضياء",
      after: null,
      marker: null,
      slash: "//",
    });
  });

  test("takhrij SESUDAH //: penanda di depan, salah ketik حدديث, tanpa matan di depan", () => {
    expect(parts("كلام حسن // (٢) حدديث كذا رواه احمد")?.takhrij).toBe("(٢) حدديث كذا رواه احمد");
    expect(parts("// حديث كذا عزاه فلان")).toMatchObject({ direction: "after", before: null });
  });

  test("takhrij SEBELUM //: penanda pembuka tetap di matan, beberapa takhrij berurutan, matan berlanjut", () => {
    const p =
      "وقال النبي الصبر ضياء (١) حديث الصبر ضياء أخرجه مسلم (٢) حديث الطهور شطر الايمان رواه احمد // ثم رجع الكلام";
    expect(parts(p)).toEqual({
      direction: "before",
      takhrij: "حديث الصبر ضياء أخرجه مسلم (٢) حديث الطهور شطر الايمان رواه احمد",
      before: "وقال النبي الصبر ضياء (١)",
      after: "ثم رجع الكلام",
      marker: [1, "(١)"],
      slash: "//",
    });
  });

  test("takhrij SEBELUM //: penanda biasa di matan tidak ikut terpotong", () => {
    expect(parts("العلم نور (١) والعمل ثمرته (٢) حديث العمل ثمرته اخرجه احمد // ثم")).toMatchObject(
      {
        takhrij: "حديث العمل ثمرته اخرجه احمد",
        before: "العلم نور (١) والعمل ثمرته (٢)",
        after: "ثم",
      },
    );
  });

  test("takhrij SEBELUM //: حديث tanpa penanda; 'من حديث' bukan pembuka", () => {
    expect(parts("فقال او مسلم حديث سعد اعطى رجلا أخرجاه بنحوه من حديث سعد // وأما كذا")).toEqual({
      direction: "before",
      takhrij: "حديث سعد اعطى رجلا أخرجاه بنحوه من حديث سعد",
      before: "فقال او مسلم",
      after: "وأما كذا",
      marker: null,
      slash: "//",
    });
  });

  test("takhrij SEBELUM //: awal paragraf = lanjutan takhrij hanya dengan atribusi kuat", () => {
    expect(parts("وليلة اخرى رواه فلان بإسناد ضعيف (٥) حديث ثان أخرجه احمد // ثم")).toMatchObject({
      takhrij: "وليلة اخرى رواه فلان بإسناد ضعيف (٥) حديث ثان أخرجه احمد",
      before: null,
      after: "ثم",
      marker: null,
    });
    expect(parts("قال كذا ورواه بعضهم (٥) حديث ثان لم أقف له على أصل // ثم")).toMatchObject({
      takhrij: "حديث ثان لم أقف له على أصل",
      before: "قال كذا ورواه بعضهم (٥)",
    });
    // Ada kandidat yang ditolak di depan ("حديث النفس خاطر" tanpa atribusi): walau awal paragraf
    // memuat "بإسناد", awal paragraf tidak diambil.
    expect(parts("بإسناد كذا ثم حديث النفس خاطر (٥) حديث ثان أخرجه احمد // ثم")).toMatchObject({
      takhrij: "حديث ثان أخرجه احمد",
      before: "بإسناد كذا ثم حديث النفس خاطر (٥)",
    });
  });

  test("// tanpa takhrij yang dikenali: paragraf tidak dipecah", () => {
    const p = "وقال انما الاعمال بالنيات // وقال تعالى كذا";
    expect(parts(p)).toEqual({
      direction: null,
      takhrij: null,
      before: p,
      after: null,
      marker: null,
      slash: "//",
    });
    // Ada pembuka حديث, tetapi tanpa atribusi (أخرجه/رواه/…) sebelum //.
    expect(parts("حديث النفس خاطر // ثم")?.takhrij).toBeNull();
    // "في حديث" adalah bagian kalimat.
    expect(parts("قال في حديث طويل رواه بعضهم // ثم")?.takhrij).toBeNull();
    // Hanya penanda tanpa isi takhrij sebelum //.
    expect(parts("كلام (٣) رواه // ثم")?.takhrij).toBe("رواه");
    expect(parts("كلام بإسناد (٣) // ثم")?.takhrij).toBeNull();
  });

  test("hanya // pertama yang dipakai; // berikutnya tetap di teks", () => {
    expect(parts("ا // حديث ب أخرجه ج // د")?.takhrij).toBe("حديث ب أخرجه ج // د");
  });
});
