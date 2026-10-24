import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// E2E Cari (S14 langkah 9). Butuh D1 berisi korpus ≥ ihya-v5 (indeks Arab + Indonesia): lokal =
// `pnpm corpus:load:local`, Preview = surau-corpus-staging. Tidak ada teks kitab di sini: kesamaan
// teks diuji dengan membandingkan kartu hasil dengan paragraf yang sama di pembaca (keduanya dari DB).

const results = (page: import("@playwright/test").Page) =>
  page.getByRole("list", { name: "Cari di kitab" }).getByRole("listitem");

test("kueri Arab: kartu dengan potongan Arab = substring teks paragraf di pembaca", async ({
  page,
}) => {
  await page.goto(`/cari?q=${encodeURIComponent("الصبر")}`);
  const card = results(page).first();
  await expect(card).toBeVisible();
  const snippet = card.locator(".search-snippet").first();
  await expect(snippet).toHaveAttribute("lang", "ar");
  await expect(snippet).toHaveAttribute("dir", "rtl");
  await expect(snippet.locator("mark").first()).toBeVisible();
  const text = (await snippet.textContent()) ?? "";
  expect(text.length).toBeGreaterThan(10);

  const link = card.getByRole("link", { name: "Buka di pembaca" }).first();
  const href = (await link.getAttribute("href")) ?? "";
  expect(href).toMatch(/^\/kitab\/ihya\/\d+\/\d+\?q=[^#]+#p\d+$/);
  await link.click();
  await expect(page).toHaveURL(new RegExp(href.replace(/[?]/g, "\\?")));
  const anchor = href.slice(href.indexOf("#"));
  const passage = page.locator(`${anchor} .arabic-text`).first();
  await expect(passage).toBeVisible();
  expect(await passage.textContent()).toContain(text);
  // Kata yang dicari disorot di pembaca (CSS Highlight API, tanpa mengubah DOM).
  await expect
    .poll(() => page.evaluate(() => CSS.highlights.get("surau-cari")?.size ?? 0))
    .toBeGreaterThan(0);
});

test("kueri Indonesia: terjemahan berlabel AI dan tautan ke paragraf yang benar", async ({
  page,
}) => {
  await page.goto("/cari?q=sabar");
  const card = results(page).first();
  await expect(card).toBeVisible();
  await expect(card.getByText("Terjemahan AI").first()).toBeVisible();
  await expect(card.locator("mark").first()).toBeVisible();
  const link = card.getByRole("link", { name: "Buka di pembaca" }).first();
  const href = (await link.getAttribute("href")) ?? "";
  expect(href).toMatch(/^\/kitab\/ihya\/\d+\/\d+\?q=sabar#p\d+$/);
  await page.goto(href);
  const anchor = href.slice(href.indexOf("#"));
  await expect(page.locator(anchor)).toBeVisible();
  // Terjemahan paragraf tujuan tampil berlabel AI.
  await expect(page.locator(`${anchor} .passage-translation`)).toContainText("Terjemahan AI");
});

test("filter rub' menyimpan pilihan di URL; kueri tanpa hasil memberi saran", async ({ page }) => {
  await page.goto("/cari?q=sabar");
  await expect(results(page).first()).toBeVisible();
  // Pemilih sumber di kepala kotak cari (ADR-087): daftar bertingkat dengan kolom cari.
  // Pemicu yang terlihat (grup Autocomplete); tombol bernama "Kitab yang dicari" di dalamnya selebar 0.
  await page.getByRole("search").locator('[data-slot="autocomplete-trigger"]').click();
  await page.getByRole("searchbox", { name: "Cari kitab" }).fill("المنجيات");
  await page.getByRole("option", { name: "ربع المنجيات" }).click();
  await expect(page).toHaveURL(/q=sabar&bagian=\d+/);
  await expect(page.getByRole("search")).toContainText("ربع المنجيات");
  await page.goto("/cari?q=qwertyzx");
  await expect(page.getByRole("heading", { name: "Tidak ada hasil" })).toBeVisible();
});

test("palet ⌘K/Ctrl+K membuka pencarian dari halaman lain", async ({ page, isMobile }) => {
  test.skip(isMobile, "pintasan papan ketik hanya di desktop");
  await page.goto("/tentang");
  await expect(page.getByRole("button", { name: "Cari" })).toBeVisible();
  await page.waitForLoadState("load");
  await expect(async () => {
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByRole("dialog", { name: "Palet pencarian" })).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
  await page.keyboard.type("niat");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/cari\?q=niat$/);
  await expect(results(page).first()).toBeVisible();
});

for (const scheme of ["light", "dark"] as const) {
  test(`a11y halaman Cari dengan hasil (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`/cari?q=${encodeURIComponent("الصبر sabar")}`);
    await expect(results(page).first()).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });
}
