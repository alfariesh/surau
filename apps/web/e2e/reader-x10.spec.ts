import type { Page } from "@playwright/test";

import { expect, test } from "@playwright/test";

// Rapikan pembaca (X10): preferensi tampilan dipasang skrip mentah (tanpa menunggu JS Next), daftar
// isi mengikuti posisi baca (subjudul aktif, leluhur dibuka di halaman sambungan), kaki halaman
// sambungan menurut halamannya sendiri, rincian label tinjauan menempel di dekat lencananya.

const SUB_202 = "/kitab/ihya/3/202#p13553";

/** Gulir sampai halaman sambungan termuat, lalu baca halaman itu (URL berganti). */
async function readContinued(page: Page, juz: number, pageNo: number) {
  const next = page.getByRole("region", {
    name: `Halaman sambungan, juz ${juz} halaman ${pageNo}`,
  });
  await expect(async () => {
    await page.mouse.wheel(0, 4000);
    await expect(next).toBeAttached({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });
  await next.locator(".passage").first().scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await expect(page).toHaveURL(new RegExp(`/kitab/ihya/${juz}/${pageNo}$`));
  return next;
}

test("preferensi pembaca terpasang di <html> walau JS Next tidak dimuat (skrip mentah)", async ({
  page,
}) => {
  await page.goto("/kitab/ihya/1/200");
  await page.evaluate(() => {
    localStorage.setItem("surau:reader-scale", "1.3");
    localStorage.setItem("surau:reader-tr-layout", "fold");
    localStorage.setItem("surau:reader-font", "amiri");
  });
  // `<Script strategy="beforeInteractive">` baru dijalankan runtime Next (chunk JS); skrip mentah
  // dijalankan browser saat HTML diurai.
  await page.route(/\/_next\/static\/.*\.js(\?|$)/, (route) => route.abort());
  await page.goto("/kitab/ihya/1/200", { waitUntil: "domcontentloaded" });
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-tr-layout", "fold");
  await expect(html).toHaveAttribute("data-reader-font", "amiri");
  expect(
    await page.evaluate(() => document.documentElement.style.getPropertyValue("--reader-scale")),
  ).toBe("1.3");
  expect(await page.content()).not.toContain("__next_s");
});

test("daftar isi: subjudul kurasi j3/202 jadi baris aktif", async ({ page, isMobile }) => {
  await page.goto("/kitab/ihya/3/202");
  if (isMobile) await page.getByRole("button", { name: "Daftar isi" }).first().click();
  const tree = isMobile
    ? page.getByRole("dialog").getByRole("treegrid", { name: "Daftar isi kitab" })
    : page.getByRole("complementary").getByRole("treegrid", { name: "Daftar isi kitab" });
  const current = tree.locator('a[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAttribute("href", SUB_202);
  await expect(current).toBeVisible();
});

test("daftar isi desktop: gulir bersambung 3/201 → 3/202 membuka cabang subjudul aktif; cabang yang ditutup pembaca tetap tertutup", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "panel daftar isi samping hanya di desktop");
  await page.goto("/kitab/ihya/3/201");
  const tree = page.getByRole("complementary").getByRole("treegrid", { name: "Daftar isi kitab" });
  // Di 3/201 bagian aktif = node kitab (subjudulnya belum mulai), cabangnya tertutup.
  await expect(tree.locator('a[aria-current="page"]')).toHaveAttribute("href", /#bab-\d+$/);
  await expect(tree.locator(`a[href="${SUB_202}"]`)).toHaveCount(0);

  await readContinued(page, 3, 202);
  const current = tree.locator('a[aria-current="page"]');
  await expect(current).toHaveAttribute("href", SUB_202);
  await expect(current).toBeVisible();

  // Pembaca menutup cabang induknya: tidak dibuka paksa lagi selama baris aktif sama.
  const parent = tree.locator('[role="row"]:has([data-stem-accent])').first();
  await parent.locator("button.toc-chevron").click();
  await expect(tree.locator(`a[href="${SUB_202}"]`)).toHaveCount(0);
  await page.mouse.wheel(0, 150);
  await page.waitForTimeout(500);
  await expect(tree.locator(`a[href="${SUB_202}"]`)).toHaveCount(0);
});

test("kaki halaman sambungan menurut halamannya sendiri: j1/201 bertanda perlu ditinjau, j1/200 tidak", async ({
  page,
}) => {
  await page.goto("/kitab/ihya/1/200");
  const review = /pemeriksaan otomatis saat impor/;
  // Kaki halaman pertama (server) tanpa catatan tinjau: j1/200 tidak punya tanda.
  await expect(page.locator("article > footer")).not.toContainText(review);
  await readContinued(page, 1, 201);
  // Kaki halaman ada di bagian halaman sambungan, sesudah wilayah teksnya.
  const foot = page.locator('section[data-continued="1/201"] [data-page-foot]');
  await expect(foot).toContainText(review);
  await expect(foot).toContainText(/belum ditinjau manusia/);
});

test("rincian label tinjauan menempel di dekat lencananya dan tetap di dalam layar", async ({
  page,
}) => {
  await page.goto("/kitab/ihya/1/200");
  const badge = page.locator("button.ai-badge-review").first();
  // Korpus tanpa terjemahan bertinjauan manusia (staging/Preview sebelum korpus berikutnya): lewati.
  test.skip((await badge.count()) === 0, "belum ada terjemahan bertinjauan manusia di korpus ini");
  const supported = await page.evaluate(() => CSS.supports("position-area", "bottom"));
  const width = page.viewportSize()!.width;
  const height = page.viewportSize()!.height;

  // Lencana di tengah layar: rincian tepat di bawahnya.
  await badge.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 200));
  await badge.click();
  const pop = page.locator(".tr-review-popover:popover-open");
  await expect(pop).toBeVisible();
  let b = (await badge.boundingBox())!;
  let p = (await pop.boundingBox())!;
  expect(p.x).toBeGreaterThanOrEqual(0);
  expect(p.x + p.width).toBeLessThanOrEqual(width);
  if (supported) {
    expect(p.y).toBeGreaterThanOrEqual(b.y + b.height);
    expect(p.y - (b.y + b.height)).toBeLessThan(16);
  }
  await page.keyboard.press("Escape");
  await expect(pop).toHaveCount(0);

  // Lencana dekat dasar layar: rincian pindah ke atasnya, tidak terpotong.
  await badge.evaluate((el) => {
    const r = el.getBoundingClientRect();
    window.scrollBy(0, r.bottom - window.innerHeight + 8);
  });
  await badge.click();
  await expect(pop).toBeVisible();
  b = (await badge.boundingBox())!;
  p = (await pop.boundingBox())!;
  expect(p.y + p.height).toBeLessThanOrEqual(height);
  if (supported) expect(p.y + p.height).toBeLessThanOrEqual(b.y);
});
