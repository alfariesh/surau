// Tes amplop hasil tool MCP (S16): permalink absolut dan blok lisensi.
import { describe, expect, test } from "vite-plus/test";

import { LICENSE_NOTICE, absolutize, licenseFor } from "./envelope.ts";

describe("amplop", () => {
  test("absolutize: hanya field permalink berupa path; teks dan field lain tetap", () => {
    const value = {
      permalink: "/kitab/ihya/1/200",
      text_raw: "/bukan/permalink",
      nested: [{ permalink: "/kitab/ihya/bab/1", label: "x" }, { permalink: "https://a.b/c" }],
    };
    expect(absolutize(value, "https://surau.org")).toEqual({
      permalink: "https://surau.org/kitab/ihya/1/200",
      text_raw: "/bukan/permalink",
      nested: [
        { permalink: "https://surau.org/kitab/ihya/bab/1", label: "x" },
        { permalink: "https://a.b/c" },
      ],
    });
  });

  test("licenseFor: lisensi + atribusi edisi unik, Surau sebagai pengadaptasi", () => {
    const one = { license: "CC BY-NC-SA 4.0", attribution: "Teks: OpenITI" };
    expect(licenseFor("https://surau.org", [one, one])).toEqual({
      name: "CC BY-NC-SA 4.0",
      url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      terms_url: "https://surau.org/lisensi",
      attribution: "Teks: OpenITI; Adapted and published by Surau (https://surau.org)",
      notice: LICENSE_NOTICE,
    });
    // Hasil tanpa edisi (pencarian kosong) tetap membawa lisensi konten.
    expect(licenseFor("https://surau.org", []).name).toBe("CC BY-NC-SA 4.0");
    // Lisensi lain/campuran → halaman /lisensi sebagai URL.
    const mixed = licenseFor("https://surau.org", [one, { license: "X", attribution: "Y" }]);
    expect(mixed).toMatchObject({ name: "CC BY-NC-SA 4.0; X", url: "https://surau.org/lisensi" });
  });
});
