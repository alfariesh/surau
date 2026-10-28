import { test as base, type Page } from "@playwright/test";

// Tunggu hidrasi sesudah navigasi penuh (ADR-119 tahap 1). vinext menghidrasi sesudah event `load`
// (Next sebelumnya), sedangkan tes Surau mengklik tepat sesudah `goto`. Helper ini menyembunyikan
// ketukan yang hilang sebelum hidrasi, jadi anggaran waktunya dijaga terpisah di
// anggaran-hidrasi.spec.ts (tanpa helper ini).
export async function tungguHidrasi(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll("button, input, [role='button'], [role='treegrid']")]
          .filter((el) => (el as HTMLElement).offsetParent !== null)
          .every((el) => Object.keys(el).some((k) => k.startsWith("__reactProps"))),
      null,
      { timeout: 10_000 },
    )
    .catch(() => {});
}

export const test = base.extend({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);
    // `waitUntil` selain bawaan ("load") dipakai tes yang sengaja memblokir JS: jangan menunggu.
    page.goto = async (...args) => {
      const res = await goto(...args);
      if ((args[1]?.waitUntil ?? "load") === "load") await tungguHidrasi(page);
      return res;
    };
    page.reload = async (...args) => {
      const res = await reload(...args);
      await tungguHidrasi(page);
      return res;
    };
    await use(page);
  },
});

export { expect } from "@playwright/test";
