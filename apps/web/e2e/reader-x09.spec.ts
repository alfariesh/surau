import { expect, test } from "@playwright/test";

// Kinerja pembaca (X09): HTML halaman baca hanya membawa pohon daftar isi ringkas; pohon lengkap
// diambil dari /kitab/<karya>/daftar-isi.json saat pohon tampil (panel samping desktop sesudah
// halaman dimuat, sheet ponsel saat dibuka). Isi panel Tampilan dimuat saat dibuka.

const TOC_JSON = "/kitab/ihya/daftar-isi.json";

test("desktop: pohon lengkap dimuat sesudah halaman tampil; node yang dipangkas bisa dibuka", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "panel daftar isi samping hanya di desktop");
  const loaded = page.waitForResponse((r) => r.url().endsWith(TOC_JSON) && r.ok());
  await page.goto("/kitab/ihya/3/202");
  await loaded;
  const tree = page.getByRole("complementary").getByRole("treegrid", { name: "Daftar isi kitab" });
  // Rub' pertama (bukan leluhur bagian aktif j3/202) dipangkas di HTML; sesudah pohon lengkap
  // datang barisnya punya chevron dan anak-anaknya muncul saat dibuka.
  const first = tree.getByRole("row", { name: /^Rubu' Ibadah/ });
  await expect(first.locator("button.toc-chevron")).toHaveCount(1);
  const before = await tree.locator('[role="row"]').count();
  await first.locator("button.toc-chevron").click();
  await expect.poll(() => tree.locator('[role="row"]').count()).toBeGreaterThan(before);
  await expect(tree.locator('a[aria-current="page"]')).toHaveCount(1);
});

test("ponsel: pohon lengkap baru diambil saat sheet dibuka, bagian aktif tetap terlihat sesudah gulir bersambung", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "sheet daftar isi ponsel");
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith(TOC_JSON)) requests.push(r.url());
  });
  await page.goto("/kitab/ihya/1/200");
  await page.waitForLoadState("load");
  // Halaman sambungan termuat dan URL berganti (bagian aktif mengikuti halaman yang dibaca).
  const next = page.getByRole("region", { name: "Halaman sambungan, juz 1 halaman 201" });
  await expect(async () => {
    await page.mouse.wheel(0, 4000);
    await expect(next).toBeAttached({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });
  await next.locator(".passage").first().scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await expect(page).toHaveURL(/\/kitab\/ihya\/1\/201$/);
  expect(requests).toHaveLength(0);

  const loaded = page.waitForResponse((r) => r.url().endsWith(TOC_JSON) && r.ok());
  await page.getByRole("button", { name: "Daftar isi" }).first().click();
  await loaded;
  const tree = page.getByRole("dialog").getByRole("treegrid", { name: "Daftar isi kitab" });
  const current = tree.locator('a[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toBeVisible();
});

test("panel Tampilan: isi kontrol dimuat saat panel dibuka", async ({ page }) => {
  await page.goto("/kitab/ihya/1/200");
  await page.getByRole("button", { name: "Tampilan" }).first().click();
  await expect(page.getByRole("button", { name: /Warna kertas/ })).toBeVisible();
  await expect(page.getByRole("slider").first()).toBeAttached();
});
