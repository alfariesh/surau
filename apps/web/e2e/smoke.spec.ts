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

test("ilustrasi prinsip di Beranda tampil di iframe sandbox dan bisa ditekan", async ({ page }) => {
  await page.goto("/");

  const frames = page.locator("#judul-prinsip ~ ul iframe");
  await expect(frames).toHaveCount(3);
  for (const frame of await frames.all()) {
    await expect(frame).toHaveAttribute("sandbox", "allow-scripts");
    await expect(frame).toHaveAttribute("title", /Ilustrasi interaktif/);
  }
  // Isi iframe benar-benar dimuat (tidak ditolak X-Frame-Options) dan tombolnya bekerja.
  await frames.first().scrollIntoViewIfNeeded();
  const verbatim = page.frameLocator("#judul-prinsip ~ ul iframe").first();
  await expect(verbatim.locator("#stage path").first()).toBeAttached();
  // ?sematan=1 tetap ada setelah pengalihan /aset/x.html → /aset/x di Static Assets
  await expect(verbatim.locator("html.sematan")).toBeAttached();
  await verbatim.getByRole("button", { name: "Kutipan keliru" }).click();
  await expect(verbatim.locator("#status")).toHaveText(/tidak ditampilkan/, { timeout: 5000 });
});

test("aset ilustrasi hanya boleh dibingkai halaman Surau sendiri dan berjalan tersandbox", async ({
  request,
}) => {
  const aset = await request.get("/aset/prinsip-verbatim.html");
  expect(aset.ok()).toBe(true);
  const headers = aset.headers();
  expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect(headers["content-security-policy"]).toContain("sandbox allow-scripts");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  // Tanpa sisipan beacon Web Analytics (di produksi: no-transform dari public/_headers)
  expect(await aset.text()).not.toContain("cloudflareinsights");

  // Font aset dimuat dari origin "null" (iframe sandbox), jadi perlu CORS.
  const font = await request.get("/aset/fonts/plus-jakarta-sans-latin.woff2");
  expect(font.ok()).toBe(true);
  expect(font.headers()["access-control-allow-origin"]).toBe("*");
});

test("API versi melaporkan NORM_VERSION dari @surau/text", async ({ request }) => {
  const response = await request.get("/api/version");

  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({ normVersion: NORM_VERSION });
});
