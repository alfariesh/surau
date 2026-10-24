import { describe, expect, test } from "vite-plus/test";

import { SPOKEN_VERSION, numberWords, ordinalWords, spokenIndonesian } from "./spoken-id.ts";

describe("numberWords", () => {
  test.each([
    [0, "nol"],
    [1, "satu"],
    [9, "sembilan"],
    [10, "sepuluh"],
    [11, "sebelas"],
    [12, "dua belas"],
    [19, "sembilan belas"],
    [20, "dua puluh"],
    [21, "dua puluh satu"],
    [99, "sembilan puluh sembilan"],
    [100, "seratus"],
    [101, "seratus satu"],
    [111, "seratus sebelas"],
    [200, "dua ratus"],
    [204, "dua ratus empat"],
    [505, "lima ratus lima"],
    [999, "sembilan ratus sembilan puluh sembilan"],
    [1000, "seribu"],
    [1001, "seribu satu"],
    [1111, "seribu seratus sebelas"],
    [2026, "dua ribu dua puluh enam"],
    [11_000, "sebelas ribu"],
    [100_000, "seratus ribu"],
    [1_000_000, "satu juta"],
    [1_300_000, "satu juta tiga ratus ribu"],
    [2_000_000_000, "dua miliar"],
    [5_000_000_000_000, "lima triliun"],
  ])("%i → %s", (n, words) => {
    expect(numberWords(n)).toBe(words);
  });

  test("di luar jangkauan ditolak", () => {
    expect(() => numberWords(-1)).toThrow(RangeError);
    expect(() => numberWords(1.5)).toThrow(RangeError);
    expect(() => numberWords(1e15)).toThrow(RangeError);
  });
});

describe("ordinalWords", () => {
  test("1 = pertama, selebihnya ke- + kata", () => {
    expect(ordinalWords(1)).toBe("pertama");
    expect(ordinalWords(2)).toBe("kedua");
    expect(ordinalWords(40)).toBe("keempat puluh");
    expect(ordinalWords(100)).toBe("keseratus");
  });

  test("nol atau pecahan ditolak", () => {
    expect(() => ordinalWords(0)).toThrow(RangeError);
    expect(() => ordinalWords(2.5)).toThrow(RangeError);
  });
});

describe("spokenIndonesian", () => {
  test("versi aturan tercatat", () => {
    expect(SPOKEN_VERSION).toBe(1);
  });

  test("gelar kehormatan ditulis penuh, titik kalimat dipertahankan", () => {
    expect(spokenIndonesian("Nabi saw. bersabda kepada para sahabat.")).toBe(
      "Nabi shallallahu 'alaihi wa sallam bersabda kepada para sahabat.",
    );
    expect(spokenIndonesian("Hal itu dicontohkan Nabi saw.")).toBe(
      "Hal itu dicontohkan Nabi shallallahu 'alaihi wa sallam.",
    );
    expect(spokenIndonesian("Rasulullah s.a.w. Beliau diam.")).toBe(
      "Rasulullah shallallahu 'alaihi wa sallam. Beliau diam.",
    );
    expect(spokenIndonesian("Allah swt., Tuhan semesta alam")).toBe(
      "Allah subhanahu wa ta'ala, Tuhan semesta alam",
    );
    expect(spokenIndonesian("Allah s.w.t. berfirman")).toBe("Allah subhanahu wa ta'ala berfirman");
    expect(spokenIndonesian("Nabi Muhammad SAW dan Allah SWT.")).toBe(
      "Nabi Muhammad shallallahu 'alaihi wa sallam dan Allah subhanahu wa ta'ala.",
    );
    expect(spokenIndonesian("Imam Syafi'i rah. menulis")).toBe("Imam Syafi'i rahimahullah menulis");
  });

  test("ra./as. hanya sesudah nama, termasuk nama bertanda hubung", () => {
    expect(spokenIndonesian("Abu Bakar ash-Shiddiq ra. berkata")).toBe(
      "Abu Bakar ash-Shiddiq radhiyallahu 'anhu berkata",
    );
    expect(spokenIndonesian("Umar r.a., lalu Ali ra.")).toBe(
      "Umar radhiyallahu 'anhu, lalu Ali radhiyallahu 'anhu.",
    );
    expect(spokenIndonesian("Nabi Musa as. dan Nabi Isa a.s. diutus")).toBe(
      "Nabi Musa 'alaihissalam dan Nabi Isa 'alaihissalam diutus",
    );
    // Bukan sesudah nama: dibiarkan.
    expect(spokenIndonesian("poros as. roda")).toBe("poros as. roda");
    // Potongan kata bukan singkatan.
    expect(spokenIndonesian("Kitab Umara.")).toBe("Kitab Umara.");
  });

  test("tahun Hijriah/Masehi, wafat/lahir, abad, rentang", () => {
    expect(spokenIndonesian("al-Ghazali (w. 505 H)")).toBe(
      "al-Ghazali (wafat tahun lima ratus lima Hijriah)",
    );
    expect(spokenIndonesian("(l. 450 H)")).toBe("(lahir tahun empat ratus lima puluh Hijriah)");
    expect(spokenIndonesian("wafat 505 H/1111 M.")).toBe(
      "wafat lima ratus lima Hijriah atau seribu seratus sebelas Masehi.",
    );
    expect(spokenIndonesian("hidup 450–505 H")).toBe(
      "hidup empat ratus lima puluh sampai lima ratus lima Hijriah",
    );
    expect(spokenIndonesian("1058-1111 M")).toBe(
      "seribu lima puluh delapan sampai seribu seratus sebelas Masehi",
    );
    expect(spokenIndonesian("pada 1111 M ia wafat")).toBe(
      "pada seribu seratus sebelas Masehi ia wafat",
    );
    expect(spokenIndonesian("abad ke-5 H dan abad ke-20 M")).toBe(
      "abad kelima Hijriah dan abad kedua puluh Masehi",
    );
    // H/M yang menjadi awal kata bukan penanda tahun.
    expect(spokenIndonesian("505 Hukum")).toBe("lima ratus lima Hukum");
  });

  test("letak cetak", () => {
    expect(spokenIndonesian("Ihya' 'Ulum ad-Din, j. 1, h. 200")).toBe(
      "Ihya' 'Ulum ad-Din, jilid satu, halaman dua ratus",
    );
    expect(spokenIndonesian("(j.3 h.204)")).toBe("(jilid tiga, halaman dua ratus empat)");
    expect(spokenIndonesian("jld. 2 hlm. 1.024")).toBe("jilid dua, halaman seribu dua puluh empat");
    expect(spokenIndonesian("lihat j. 4")).toBe("lihat jilid empat");
    expect(spokenIndonesian("lihat hlm. 12 dan hal. 13")).toBe(
      "lihat halaman dua belas dan halaman tiga belas",
    );
  });

  test("rujukan ayat hanya disebut", () => {
    expect(spokenIndonesian("QS 2:255")).toBe("surah kedua ayat dua ratus lima puluh lima");
    expect(spokenIndonesian("Q.S. 1:1–7")).toBe("surah pertama ayat satu sampai tujuh");
    expect(spokenIndonesian("QS al-Baqarah [2]: 183")).toBe(
      "surah al-Baqarah ayat seratus delapan puluh tiga",
    );
    expect(spokenIndonesian("QS. Al-Ikhlas: 1-4")).toBe("surah Al-Ikhlas ayat satu sampai empat");
    expect(spokenIndonesian("dalam QS Yasin")).toBe("dalam surah Yasin");
    expect(spokenIndonesian("(HR Muslim)")).toBe("(diriwayatkan oleh Muslim)");
  });

  test("bilangan tingkat, persen, desimal, rentang, ribuan, angka biasa", () => {
    expect(spokenIndonesian("kitab ke-40 dan ke-1")).toBe("kitab keempat puluh dan pertama");
    expect(spokenIndonesian("10% dan 2,5 %")).toBe("sepuluh persen dan dua koma lima persen");
    expect(spokenIndonesian("sekitar 2,25 juz")).toBe("sekitar dua koma dua lima juz");
    expect(spokenIndonesian("3–7 gagasan, lalu 2 - 3 kutipan")).toBe(
      "tiga sampai tujuh gagasan, lalu dua sampai tiga kutipan",
    );
    expect(spokenIndonesian("1.200 orang, 40 kitab, 7.")).toBe(
      "seribu dua ratus orang, empat puluh kitab, tujuh.",
    );
    expect(spokenIndonesian("1, 2, dan 3")).toBe("satu, dua, dan tiga");
  });

  test("pecahan fikih dibaca 'per'; QS bergaya Kemenag; angka di luar jangkauan tidak galat", () => {
    expect(spokenIndonesian("zakat 1/40 harta, wasiat paling banyak 1/3")).toBe(
      "zakat satu per empat puluh harta, wasiat paling banyak satu per tiga",
    );
    expect(spokenIndonesian("QS al-Baqarah/2: 183")).toBe(
      "surah al-Baqarah ayat seratus delapan puluh tiga",
    );
    expect(spokenIndonesian("nomor 1234567890123456")).toBe(
      "nomor satu dua tiga empat lima enam tujuh delapan sembilan nol satu dua tiga empat lima enam",
    );
    expect(spokenIndonesian("urutan ke-0 dan QS 0:1")).toBe(
      "urutan ke nol dan surah ke nol ayat satu",
    );
  });

  test("singkatan umum dan simbol", () => {
    expect(spokenIndonesian("ikhlas, riya', dll.")).toBe("ikhlas, riya', dan lain-lain");
    expect(spokenIndonesian("dsb. dkk. mis. tsb.")).toBe(
      "dan sebagainya dan kawan-kawan misalnya tersebut",
    );
    expect(spokenIndonesian("ilmu & amal, ±3 jam")).toBe("ilmu dan amal, sekitar tiga jam");
  });

  test("kurung siku dan garis miring tidak sampai ke suara AI (tag audio / IPA v4)", () => {
    expect(spokenIndonesian("ia [Nabi] berkata")).toBe("ia (Nabi) berkata");
    expect(spokenIndonesian("dan/atau palsu/batil")).toBe("dan atau atau palsu atau batil");
    expect(spokenIndonesian("bab 3 / 4")).toBe("bab tiga per empat");
    expect(spokenIndonesian("(a) / (b)")).toBe("(a) (b)");
  });

  test("transliterasi bertanda, petik, Markdown, dan spasi dirapikan", () => {
    expect(spokenIndonesian("al-Ghazālī menulis ʿilm dan ḥadīth")).toBe(
      "al-Ghazali menulis 'ilm dan hadith",
    );
    expect(spokenIndonesian("“niat” dan ‘amal’")).toBe(`"niat" dan 'amal'`);
    expect(spokenIndonesian("**tebal**  _miring_ #judul `kode` | ~")).toBe(
      "tebal miring judul kode",
    );
    expect(spokenIndonesian("  kata ,  lalu .  ")).toBe("kata, lalu.");
  });

  test("huruf Arab tidak dibuang di sini (penyusun skrip yang menolak)", () => {
    expect(spokenIndonesian("niat نية")).toBe("niat نية");
  });
});
