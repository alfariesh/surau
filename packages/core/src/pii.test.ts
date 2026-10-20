import { describe, expect, test } from "vite-plus/test";

import { redactPii } from "./pii.ts";

describe("redactPii", () => {
  test("email, telepon, NIK, rekening disamarkan", () => {
    const r = redactPii(
      "Saya Budi, email budi.s@contoh.co.id, WA 0812-3456-7890 atau +62 812 3456 7890, NIK 3201234567890001, rek 1234567890.",
    );
    expect(r.text).toBe(
      "Saya Budi, email [email], WA [nomor] atau [nomor], NIK [nomor], rek [nomor].",
    );
    expect(r.redacted).toBe(5);
  });

  test("rujukan kitab, ayat, tahun, dan tanggal tidak disamarkan", () => {
    const text =
      "Ihya j.1 h.200, QS 2:255, wafat 505 H (1058-1111 M), hadits no. 1234, ditulis 21/10/2026.";
    expect(redactPii(text)).toEqual({ text, redacted: 0 });
  });

  test("tautan luar disamarkan; tautan surau.org dipertahankan tanpa query", () => {
    expect(
      redactPii(
        "Lihat https://surau.org/kitab/ihya/1/200?q=rahasia#p3. Juga http://contoh.com/x?a=1",
      ).text,
    ).toBe("Lihat https://surau.org/kitab/ihya/1/200. Juga [tautan]");
    expect(redactPii("http://surau.org/kitab").text).toBe("[tautan]");
  });

  test("akun media sosial disamarkan", () => {
    expect(redactPii("hubungi @budi_santoso ya").text).toBe("hubungi [akun] ya");
  });

  test("teks Arab dan teks biasa tidak berubah", () => {
    const text = "Apa maksud الصبر menurut al-Ghazali?";
    expect(redactPii(text)).toEqual({ text, redacted: 0 });
  });
});
