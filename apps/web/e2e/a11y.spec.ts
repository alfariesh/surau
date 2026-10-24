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

// Panel Tampilan pembaca terbuka (Sheet + Segment mode baca + CellSlider + CellSelect) dan tema kertas sepia.
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

// X04 (temuan peninjau): halaman sambungan termuat (dua wilayah teks dan dua wilayah catatan kaki
// harus bernama unik), subjudul kurasi j3/202, dan tata letak terjemahan dilipat / berdampingan.
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const STRUCTURE = ["landmark-unique", "heading-order"];

async function axeViolations(page: import("@playwright/test").Page) {
  const wcag = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const structure = await new AxeBuilder({ page }).withRules(STRUCTURE).analyze();
  return [...wcag.violations, ...structure.violations].map(
    (v) => `${v.id}: ${v.help} (${v.nodes.length})`,
  );
}

test("tanpa pelanggaran a11y: halaman sambungan termuat (j1/200 → 201)", async ({ page }) => {
  await page.goto("/kitab/ihya/1/200");
  const next = page.getByRole("region", { name: "Halaman sambungan, juz 1 halaman 201" });
  await expect(async () => {
    await page.mouse.wheel(0, 4000);
    await expect(next).toBeAttached({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });
  await expect(next.locator(".passage").first()).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});

for (const layout of ["interleave", "fold", "side"] as const) {
  test(`tanpa pelanggaran a11y: mode Keduanya, tata letak ${layout}, dengan panel Tampilan (j3/202)`, async ({
    page,
  }) => {
    await page.addInitScript((value) => {
      try {
        localStorage.setItem("surau:reader-tr-layout", value);
      } catch {}
    }, layout);
    await page.goto("/kitab/ihya/3/202");
    if (layout === "interleave")
      await expect(page.locator("html")).not.toHaveAttribute("data-tr-layout");
    else await expect(page.locator("html")).toHaveAttribute("data-tr-layout", layout);
    expect(await axeViolations(page)).toEqual([]);
    // Panel terbuka (X11): Segment mode baca + kontrol terjemahan aktif di mode Keduanya.
    await page
      .getByRole("group", { name: "Alat baca" })
      .getByRole("button", { name: "Tampilan" })
      .click();
    await expect(page.getByRole("radiogroup", { name: "Mode baca" })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
}

// Mode baca Arab (X11): judul daftar isi tanpa padanan Indonesia, terjemahan yang dibuka kata cari
// (tombol lipat tampil), dan panel Tampilan dengan kontrol terjemahan nonaktif.
test("tanpa pelanggaran a11y: mode baca Arab + kata cari + panel Tampilan (j1/200)", async ({
  page,
}) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("surau:read-mode", "ar");
    } catch {}
  });
  await page.goto(`/kitab/ihya/1/200?q=${encodeURIComponent("malam jumat")}#p2826`);
  await expect(page.locator("html")).toHaveAttribute("data-read-mode", "ar");
  await expect(page.locator("#p2826")).toHaveAttribute("data-tr-peek", "");
  expect(await axeViolations(page)).toEqual([]);
  await page
    .getByRole("group", { name: "Alat baca" })
    .getByRole("button", { name: "Tampilan" })
    .click();
  await expect(page.getByRole("radiogroup", { name: "Mode baca" })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});

// Mode Terjemahan (X11 bagian B): Arab terlipat lalu dibuka, judul tetap h2/h3 berurutan.
test("tanpa pelanggaran a11y: mode Terjemahan, terlipat dan terbuka (j1/200)", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("surau:read-mode", "tr");
    } catch {}
  });
  await page.goto("/kitab/ihya/1/200");
  await expect(page.locator("html")).toHaveAttribute("data-read-mode", "tr");
  expect(await axeViolations(page)).toEqual([]);
  const toggle = page.locator("#p2824").getByRole("button", { name: "Teks Arab" });
  await expect(async () => {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
  }).toPass();
  expect(await axeViolations(page)).toEqual([]);
});

// Ringkasan AI yang dibuka sementara oleh kata cari di mode Arab (X14): tombol sembunyikan tampil.
test("tanpa pelanggaran a11y: mode Arab + Ringkasan AI dibuka kata cari (j1/200)", async ({
  page,
}) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("surau:read-mode", "ar");
    } catch {}
  });
  await page.goto(`/kitab/ihya/1/200?q=${encodeURIComponent("berkurban")}`);
  const summary = page.locator(".section-summary").first();
  await expect(summary).toHaveAttribute("data-tr-peek", "", { timeout: 15_000 });
  await expect(
    summary.getByRole("button", { name: "Sembunyikan lagi ringkasan AI ini" }),
  ).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});
