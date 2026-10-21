import { describe, expect, test } from "vite-plus/test";

import { indonesianSentences } from "./sentences.ts";

const texts = (text: string) => indonesianSentences(text).map((s) => text.slice(s.start, s.end));

describe("indonesianSentences", () => {
  test("titik + spasi + huruf kapital = batas kalimat", () => {
    expect(texts("Malam Kamis. Abu Hurairah berkata. Ia salat.")).toEqual([
      "Malam Kamis.",
      "Abu Hurairah berkata.",
      "Ia salat.",
    ]);
  });

  test("singkatan saw., swt., ra., QS. tidak memotong kalimat", () => {
    expect(
      texts(
        "Rasulullah saw. Beliau bersabda. Allah swt. Maha Pengasih. Umar ra. Berkata. QS. Al-Baqarah.",
      ),
    ).toEqual([
      "Rasulullah saw. Beliau bersabda.",
      "Allah swt. Maha Pengasih.",
      "Umar ra. Berkata.",
      "QS. Al-Baqarah.",
    ]);
  });

  test("inisial satu huruf kapital (505 H. Ia) bukan akhir kalimat", () => {
    expect(texts("Wafat 505 H. Ia dimakamkan di Thus.")).toEqual([
      "Wafat 505 H. Ia dimakamkan di Thus.",
    ]);
  });

  test("huruf kecil sesudah titik bukan batas", () => {
    expect(texts("Ini 1.000 dirham. dan seterusnya")).toEqual(["Ini 1.000 dirham. dan seterusnya"]);
  });

  test("petik dan kurung penutup ikut kalimat; petik pembuka kalimat berikutnya diikutkan", () => {
    expect(texts('Ia berkata, "Sabarlah." "Mengapa?" tanyanya. (Lihat juga.) Selesai!')).toEqual([
      'Ia berkata, "Sabarlah."',
      '"Mengapa?" tanyanya.',
      "(Lihat juga.)",
      "Selesai!",
    ]);
  });

  test("baris baru selalu memisah; spasi di tepi tidak ikut", () => {
    expect(texts("Salat pada malam Sabtu\n\nAnas berkata, salat.  ")).toEqual([
      "Salat pada malam Sabtu",
      "Anas berkata, salat.",
    ]);
  });

  test("teks kosong atau tanpa batas", () => {
    expect(texts("")).toEqual([]);
    expect(texts("   ")).toEqual([]);
    expect(texts("tanpa titik di akhir")).toEqual(["tanpa titik di akhir"]);
  });

  test("rentang menunjuk teks asal (offset UTF-16)", () => {
    const text = "Satu. Dua.";
    expect(indonesianSentences(text)).toEqual([
      { start: 0, end: 5 },
      { start: 6, end: 10 },
    ]);
  });
});
