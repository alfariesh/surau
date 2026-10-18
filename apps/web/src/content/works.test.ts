import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vite-plus/test";

import { EDITION_CREDITS, EDITION_SOURCE, LICENSE_URL, QURAN_CREDITS } from "./works";

const ATTRIBUTION = readFileSync(
  resolve(import.meta.dirname, "../../../../data/ATTRIBUTION.md"),
  "utf8",
);

describe("atribusi /lisensi", () => {
  test("kalimat atribusi setiap edisi sama persis dengan data/ATTRIBUTION.md", () => {
    for (const credit of EDITION_CREDITS) {
      expect(ATTRIBUTION).toContain(`> ${credit.attribution}\n`);
    }
  });

  test("setiap tautan pihak dan materi sumber tercantum di data/ATTRIBUTION.md", () => {
    for (const credit of EDITION_CREDITS) {
      const urls = credit.parties.flatMap((party) => (party.link ? [party.link.url] : []));
      expect(urls.length).toBeGreaterThan(0);
      for (const url of urls) expect(ATTRIBUTION).toContain(url);
      expect(ATTRIBUTION).toContain(EDITION_SOURCE[credit.key]?.url ?? "–");
    }
    expect(LICENSE_URL["CC BY-NC-SA 4.0"]).toBe(
      "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    );
  });

  test("sumber ayat Al-Qur'an (S12): setiap tautan tercantum di data/ATTRIBUTION.md", () => {
    const urls = QURAN_CREDITS.flatMap((c) => c.links.map((l) => l.url));
    expect(urls).toContain("https://tanzil.net");
    for (const url of urls) expect(ATTRIBUTION).toContain(url);
  });
});
