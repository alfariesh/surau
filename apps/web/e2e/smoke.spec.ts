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

test("Lisensi: kode Apache-2.0, konten CC BY-NC-SA 4.0, atribusi Ihya, dan jalur koreksi", async ({
  page,
}) => {
  await page.goto("/tentang");
  await page.getByRole("link", { name: "Lisensi, atribusi, dan cara meminta koreksi" }).click();
  await expect(page).toHaveURL(/\/lisensi$/);
  await expect(page.getByRole("heading", { level: 1, name: "Lisensi dan atribusi" })).toBeVisible();

  const summary = page.locator("#ringkasan");
  await expect(summary).toContainText("Apache-2.0");
  await expect(summary).toContainText("CC BY-NC-SA 4.0");
  await expect(summary).toContainText("tanpa iklan, tanpa paywall");
  await expect(summary.getByRole("link", { name: /teks lisensi/ }).last()).toHaveAttribute(
    "href",
    "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  );

  const sources = page.locator("#sumber");
  await expect(sources).toContainText(
    "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0009472 & JK000001",
  );
  for (const name of ["OpenITI", "al-Maktaba al-Shamela", "Dar al-Ma'rifah, Beirut"]) {
    await expect(sources).toContainText(name);
  }
  await expect(
    page.locator("#koreksi").getByRole("link", { name: /Buka laporan di GitHub/ }),
  ).toHaveAttribute("href", /github\.com\/alfariesh\/surau\/issues\/new$/);
  await expect(page.locator("#privasi")).toContainText("12 bulan");
});

test("halaman yang tidak ada menampilkan 404 berbahasa Indonesia", async ({ page }) => {
  const response = await page.goto("/tidak-ada-halaman-ini");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Halaman tidak ditemukan");
});

test("menu samping: Kitab, Cari, dan Tentang bisa dibuka, fitur yang belum ada berlabel segera", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");

  const openMenu = async () => {
    if (isMobile) await page.getByRole("button", { name: "Buka menu" }).click();
    return page.getByRole("treegrid", { name: "Navigasi utama" }).last();
  };

  let menu = await openMenu();
  await expect(menu.getByRole("row", { name: /Tanya \(segera\)/ })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await menu.getByRole("row", { name: "Kitab", exact: true }).click();
  await expect(page).toHaveURL(/\/kitab$/);

  // Cari aktif sejak S14.
  menu = await openMenu();
  await menu.getByRole("row", { name: "Cari", exact: true }).click();
  await expect(page).toHaveURL(/\/cari$/);

  // Tentang ada di menu bawah sidebar (footer), terpisah dari navigasi utama.
  await openMenu();
  await page
    .getByRole("treegrid", { name: "Tentang", exact: true })
    .last()
    .getByRole("row", { name: "Tentang" })
    .click();
  await expect(page).toHaveURL(/\/tentang$/);
});

test("panduan MCP bisa ditemukan dan dipakai di layar ponsel", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: "Buka menu" }).click();
  await page
    .getByRole("treegrid", { name: "Navigasi utama" })
    .last()
    .getByRole("row", { name: "Pakai dengan AI", exact: true })
    .click();
  await expect(page).toHaveURL(/\/mcp$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pakai Surau dari AI Anda");
  await expect(page.locator("#alamat code")).toHaveText("https://mcp.surau.org/mcp");
  await expect(page.locator("#claude-code pre")).toHaveText(
    "claude mcp add --transport http surau https://mcp.surau.org/mcp",
  );
  await expect(page.locator("#contoh li")).toHaveCount(3);
  await expect(page.locator("#periksa")).toContainText("verify_quote");
  await expect(page.locator("#periksa")).toContainText(
    "Jawaban akhir ditulis oleh asisten AI Anda",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.locator("#lisensi").getByRole("link").click();
  await expect(page).toHaveURL(/\/lisensi$/);
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
