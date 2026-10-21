import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Aksesibilitas (WCAG 2.1 AA, termasuk kontras warna) di setiap halaman, tema terang dan gelap.
// Melengkapi Lighthouse, yang tidak bisa menilai halaman 404 maupun mode gelap.
const PAGES = [
  "/",
  "/tentang",
  "/lisensi",
  "/mcp",
  "/tidak-ada-halaman-ini",
  "/kitab",
  "/kitab/ihya",
  "/kitab/ihya/1/200",
  // Kutipan ayat + label rujukan "QS s:a" (S12, korpus ≥ ihya-v3).
  "/kitab/ihya/1/119",
  // Halaman Cari tanpa kueri (S14); dengan hasil: e2e/search.spec.ts.
  "/cari",
  // Maknaz (keadaan awal, tanpa LLM), privasi, dan transparansi biaya (S20–S21).
  "/tanya",
  "/privasi",
  "/transparansi",
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
for (const path of [
  "/kitab",
  "/kitab/ihya",
  "/kitab/ihya/1/200",
  "/cari",
  "/tanya",
  "/privasi",
  "/transparansi",
]) {
  test(`urutan heading berurutan: ${path}`, async ({ page }) => {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withRules(["heading-order"]).analyze();
    expect(result.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
  });
}

// Panel Tampilan pembaca terbuka (Sheet + CellSlider + CellSelect + CellSwitch) dan tema kertas sepia.
test("tanpa pelanggaran a11y: panel Tampilan terbuka dan kertas sepia", async ({ page }) => {
  await page.goto("/kitab/ihya/1/200");
  await page
    .getByRole("group", { name: "Alat baca" })
    .getByRole("button", { name: "Tampilan" })
    .click();
  const panel = page.getByRole("dialog", { name: "Tampilan baca" });
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: /Warna kertas/ }).click();
  await page.getByRole("option", { name: "Sepia" }).click();
  await expect(page.locator("html")).toHaveClass(/sepia/);

  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
});
