import { expect, test } from "@playwright/test";

// Anggaran hidrasi (ADR-119 gerbang c): tanpa helper tunggu-hidrasi. Tombol Tampilan halaman kitab
// harus sudah bisa ditekan (props React terpasang) paling lambat 1 dtk sesudah cat pertama.
test("tombol Tampilan halaman kitab terhidrasi ≤ 1 dtk sesudah cat pertama", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __hyd?: number };
    const poll = () => {
      const el = [...document.querySelectorAll("button")].find((x) =>
        /Tampilan/.test(x.getAttribute("aria-label") ?? x.textContent ?? ""),
      );
      if (el && Object.keys(el).some((k) => k.startsWith("__reactProps")))
        w.__hyd = performance.now();
      else requestAnimationFrame(poll);
    };
    document.addEventListener("DOMContentLoaded", poll);
  });
  await page.goto("/kitab/ihya/1/200");
  await page.waitForFunction(() => (window as unknown as { __hyd?: number }).__hyd, null, {
    timeout: 15_000,
  });
  const { hyd, fcp } = await page.evaluate(() => ({
    hyd: (window as unknown as { __hyd: number }).__hyd,
    fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0,
  }));
  expect(
    hyd - fcp,
    `hidrasi ${Math.round(hyd)} ms, cat pertama ${Math.round(fcp)} ms`,
  ).toBeLessThanOrEqual(1000);
});
