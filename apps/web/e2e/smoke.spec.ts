import { expect, test } from "@playwright/test";
import { NORM_VERSION } from "@surau/text";

import { BASMALAH } from "../src/content/basmalah";

test("Beranda tampil dalam bahasa Indonesia", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Surau/);
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Asisten riset kitab klasik Islam",
  );
  await expect(page.getByRole("heading", { name: "Tiga prinsip utama" })).toBeVisible();
});

test("blok teks Arab memakai lang=ar dan dir=rtl dengan font Naskh", async ({ page }) => {
  await page.goto("/");

  const arabic = page.locator(".arabic-text").first();
  await expect(arabic).toBeVisible();
  await expect(arabic).toHaveAttribute("lang", "ar");
  await expect(arabic).toHaveAttribute("dir", "rtl");
  await expect(arabic).toHaveCSS("font-family", /Noto Naskh Arabic/);
  // Font benar-benar termuat (bukan sekadar tercantum di font stack).
  const naskhLoaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some(
      (f) => f.family.includes("Noto Naskh Arabic") && f.status === "loaded",
    );
  });
  expect(naskhLoaded).toBe(true);
  // Teks tampil persis sama dengan sumbernya (verbatim sampai ke layar).
  expect(await arabic.textContent()).toBe(BASMALAH.text);
  // Halaman tetap LTR; hanya bloknya yang RTL.
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("navigasi ke Tentang", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Kenali Surau" }).click();
  await expect(page).toHaveURL(/\/tentang$/);
  await expect(page.getByRole("heading", { level: 1, name: "Tentang Surau" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lisensi" })).toBeVisible();
});

test("halaman yang tidak ada menampilkan 404 berbahasa Indonesia", async ({ page }) => {
  const response = await page.goto("/tidak-ada-halaman-ini");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Halaman tidak ditemukan");
});

test("menu samping: Tentang bisa dibuka, fitur yang belum ada berlabel segera", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");

  if (isMobile) {
    await page.getByRole("button", { name: "Buka menu" }).click();
  }

  const menu = page.getByRole("treegrid", { name: "Navigasi utama" }).last();
  await expect(menu.getByRole("row", { name: /Kitab \(segera\)/ })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await menu.getByRole("row", { name: "Tentang" }).click();
  await expect(page).toHaveURL(/\/tentang$/);
});

test("respons HTML membawa header keamanan dasar", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["permissions-policy"]).toContain("camera=()");
});

test("API versi melaporkan NORM_VERSION dari @surau/text", async ({ request }) => {
  const response = await request.get("/api/version");

  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({ normVersion: NORM_VERSION });
});
