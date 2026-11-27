import { expect, test } from "@playwright/test";

import { lewatiTanpaKitab } from "./korpus";

// Pembaca Bidayat al-Hidayah, kitab pertama Gelombang 1 (X31a langkah 8a, ADR-142): menggantikan
// Ihya sebagai data e2e Preview (staging) dan lokal (`pnpm corpus:load:local`). Teks kitab tidak
// disalin ke sini; yang diperiksa alamat, atribut, sitasi, dan atribusi. Kata cari الهداية adalah
// kueri buatan tes (sama dengan contoh smoke D1 di `tools/ingest/src/works/bidayah.ts`).

lewatiTanpaKitab("bidayat-al-hidayah");

const SLUG = "bidayat-al-hidayah";
const PAGE = `/kitab/${SLUG}/1/25`;

test("halaman cetak h25: judul, teks Arab RTL, dan atribusi sumber", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(PAGE);
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Halaman 25");
  const first = page.getByRole("region", { name: "Teks kitab" }).locator(".arabic-text").first();
  await expect(first).toHaveAttribute("lang", "ar");
  await expect(first).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByText(/OpenITI 2025\.1\.9 \(CC BY-NC-SA 4\.0\)/)).toBeVisible();
  // Tautan Shamela memakai nomor halaman Shamela (h25 = halaman pertama), bukan nomor cetak.
  await expect(page.getByRole("link", { name: /al-Maktaba al-Shamela/ })).toHaveAttribute(
    "href",
    /^https:\/\/shamela\.ws\/book\/12718\/\d+$/,
  );
  // Kitab tanpa takhrij: catatan kaki tidak diatribusikan ke al-'Iraqi (FOOTNOTE_NOTE hanya Ihya).
  await expect(page.getByText(/al-'Iraqi/)).toHaveCount(0);
  await page.waitForLoadState("load");
  expect(errors).toEqual([]);
});

test("permalink #pN menggulir ke paragraf yang tepat", async ({ page }) => {
  await page.goto(PAGE);
  const id = await page.locator('[id^="p"].passage, article [id^="p"]').first().getAttribute("id");
  expect(id).toMatch(/^p\d+$/);
  await page.goto(`${PAGE}#${id}`);
  await expect(page.locator(`#${id}`)).toBeInViewport();
});

test("Salin sitasi menghasilkan format sitasi + permalink", async ({
  page,
  context,
  baseURL,
  isMobile,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(PAGE);
  if (isMobile) {
    await page.getByRole("button", { name: "Aksi lain" }).click();
    await page.getByRole("menuitem", { name: "Salin sitasi" }).click();
  } else {
    await page.getByRole("button", { name: "Salin sitasi" }).click();
  }
  await expect(page.getByText("Sitasi disalin")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(
    `al-Ghazali, Bidayat al-Hidayah, Maktabat Madbuli, j.1 h.25. ${new URL(PAGE, baseURL).href}`,
  );
});

test("daftar isi menandai bagian aktif; halaman karya dan /kitab menampilkan kitab ini", async ({
  page,
  isMobile,
}) => {
  await page.goto(PAGE);
  if (isMobile) await page.getByRole("button", { name: "Daftar isi" }).click();
  const current = page
    .getByRole("treegrid", { name: "Daftar isi kitab" })
    .last()
    .locator('a[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toBeVisible();

  await page.goto(`/kitab/${SLUG}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bidayat al-Hidayah");
  await expect(page.getByText("CC BY-NC-SA 4.0").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Mulai membaca" })).toHaveAttribute(
    "href",
    new RegExp(`^/kitab/${SLUG}/1/\\d+$`),
  );

  await page.goto("/kitab");
  await expect(page.locator(`main a[href^="/kitab/${SLUG}"]`).first()).toBeVisible();
});

test("daftar-isi.json dan kueri Arab di /api/search mengembalikan halaman kitab ini", async ({
  request,
}) => {
  const toc = await request.get(`/kitab/${SLUG}/daftar-isi.json`);
  expect(toc.status()).toBe(200);
  const res = await request.get(`/api/search?q=${encodeURIComponent("الهداية")}`);
  expect(res.status()).toBe(200);
  expect(JSON.stringify(await res.json())).toContain(SLUG);
});
