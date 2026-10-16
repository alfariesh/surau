import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Aksesibilitas (WCAG 2.1 AA, termasuk kontras warna) di setiap halaman, tema terang dan gelap.
// Melengkapi Lighthouse, yang tidak bisa menilai halaman 404 maupun mode gelap.
const PAGES = [
  "/",
  "/tentang",
  "/tidak-ada-halaman-ini",
  "/kitab",
  "/kitab/ihya",
  "/kitab/ihya/1/200",
];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`tema ${scheme === "light" ? "terang" : "gelap"}`, () => {
    test.use({ colorScheme: scheme });

    for (const path of PAGES) {
      test(`tanpa pelanggaran a11y: ${path}`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator("html")).toHaveClass(new RegExp(scheme));

        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();

        expect(result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
      });
    }
  });
}

// Urutan heading (aturan axe `heading-order`, bertag best-practice sehingga tidak ikut tag WCAG di
// atas). Regresi S09: judul bagian h3 langsung sesudah h1, dan Card.Title (h3) sebelum h2.
for (const path of ["/kitab", "/kitab/ihya", "/kitab/ihya/1/200"]) {
  test(`urutan heading berurutan: ${path}`, async ({ page }) => {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withRules(["heading-order"]).analyze();
    expect(result.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
  });
}
