import { expect, test } from "@playwright/test";

// Mutu baca pembaca (X04 bagian A): label AI ringkas, tata letak terjemahan, subjudul kurasi,
// bagikan tautan, lanjutkan membaca, dan gulir bersambung. Butuh D1 berisi Ihya (lokal: korpus
// build; Preview: staging). Teks kitab tidak disalin ke sini: subjudul dan syair diperiksa lewat
// peran dan struktur, bukan isi Arabnya.

const PAGE = "/kitab/ihya/1/200";
const TEXT = { name: "Teks kitab", exact: true } as const;

test("label AI: satu catatan di awal teks + satu lencana per terjemahan; lencana tetap ada sesudah catatan ditutup", async ({
  page,
}) => {
  await page.goto(PAGE);
  const text = page.getByRole("region", TEXT);
  const notice = text.locator(".ai-notice");
  await expect(notice).toHaveCount(1);
  await expect(notice).toBeVisible();
  const translations = text.locator(".passage-translation");
  const count = await translations.count();
  expect(count).toBeGreaterThan(0);
  await expect(text.locator(".ai-badge")).toHaveCount(count);
  // Tidak ada lagi baris label "Terjemahan AI" terpisah di atas setiap terjemahan.
  await expect(text.locator(".passage-translation > .typography")).toHaveCount(0);

  await expect(async () => {
    await notice.getByRole("button", { name: "Tutup catatan terjemahan AI" }).click();
    await expect(notice).toBeHidden({ timeout: 1000 });
  }).toPass();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-ai-notice", "off");
  await expect(page.getByRole("region", TEXT).locator(".ai-notice")).toBeHidden();
  await expect(page.getByRole("region", TEXT).locator(".ai-badge").first()).toBeVisible();
});

test("tata letak terjemahan tersimpan per browser (dilipat → muat ulang → tetap)", async ({
  page,
}) => {
  await page.goto(PAGE);
  await page
    .getByRole("group", { name: "Alat baca" })
    .getByRole("button", { name: "Tampilan" })
    .click();
  const panel = page.getByRole("dialog", { name: "Tampilan baca" });
  await panel.getByRole("button", { name: /Tata letak terjemahan/ }).click();
  await page.getByRole("option", { name: "Dilipat" }).click();
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-tr-layout", "fold");
  await page.reload();
  await expect(html).toHaveAttribute("data-tr-layout", "fold");
  await page.keyboard.press("Escape");
  // Terjemahan tertutup; tombol "Terjemahan AI" membukanya per paragraf.
  const passage = page.locator("#p2824");
  await expect(passage.locator(".passage-translation-body")).toBeHidden();
  const toggle = passage.getByRole("button", { name: "Terjemahan AI" });
  await expect(async () => {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
  }).toPass();
  await expect(passage.locator(".passage-translation-body")).toBeVisible();
});

test("subjudul kurasi: j3/202 #p13553 tampil sebagai heading; subjudul menempel di j1/200 di baris sendiri", async ({
  page,
}) => {
  await page.goto("/kitab/ihya/3/202");
  await expect(page.locator("#p13553").getByRole("heading")).toHaveCount(1);
  await page.goto(PAGE);
  // Tiga subjudul malam (Kamis, Jumat, Sabtu) menempel di awal paragrafnya.
  await expect(page.getByRole("region", TEXT).locator(".reader-inline-subheading")).toHaveCount(3);
  await expect(page.locator("#p2825 .reader-inline-subheading")).toHaveCount(1);
});

test("bagikan tautan paragraf: URL #pN yang disalin = permalink paragraf", async ({
  page,
  context,
  baseURL,
  isMobile,
}) => {
  test.skip(isMobile, "ponsel memakai lembar bagi bawaan bila tersedia");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(PAGE);
  await page.locator("#p2826").hover();
  await page.getByRole("button", { name: /Aksi paragraf .*p2826/ }).click();
  await page.getByRole("menuitem", { name: "Bagikan tautan paragraf" }).click();
  await expect(page.getByText("Tautan disalin")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    new URL(`${PAGE}#p2826`, baseURL).href,
  );
});

test("lanjutkan membaca: muncul di halaman karya sesudah membuka satu halaman", async ({
  page,
}) => {
  await page.goto(PAGE);
  await expect(page.locator("html")).toHaveAttribute("data-reading", "");
  await page.goto("/kitab/ihya");
  const link = page.getByRole("link", { name: /Lanjutkan membaca/ });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", /^\/kitab\/ihya\/1\/200(#p\d+)?$/);
});

test("lanjutkan membaca: tanpa galat bila localStorage diblokir", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("diblokir", "SecurityError");
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(PAGE);
  await page.goto("/kitab/ihya");
  await expect(page.getByRole("link", { name: "Mulai membaca" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Lanjutkan membaca/ })).toHaveCount(0);
  await page.waitForLoadState("load");
  expect(errors).toEqual([]);
});

test("salin terjemahan: label AI + permalink ikut tersalin", async ({
  page,
  context,
  baseURL,
  isMobile,
}) => {
  test.skip(isMobile, "seleksi teks dengan mouse");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(PAGE);
  const body = page.locator("#p2824 .passage-translation-body [data-ai-text]").first();
  await body.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.press("ControlOrMeta+c");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(`(Terjemahan AI, ${new URL(`${PAGE}#p2824`, baseURL).href})`);
});

test("gulir bersambung: halaman 201 termuat di bawah j1/200 dan URL berganti saat dibaca", async ({
  page,
}) => {
  await page.goto(PAGE);
  const next = page.getByRole("region", { name: "Halaman sambungan, juz 1 halaman 201" });
  await expect(async () => {
    await page.mouse.wheel(0, 4000);
    await expect(next).toBeAttached({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });
  await next.locator(".passage").first().scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await expect(page).toHaveURL(/\/kitab\/ihya\/1\/201$/);
  await expect(page).toHaveTitle(/j\. 1 h\. 201/);
  // replaceState tidak memicu navigasi: halaman pertama tetap terpasang di bawah URL baru.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Juz 1 · Halaman 200");
  // Kembali ke halaman pertama: URL awal dipulihkan.
  await page.locator("[data-reader-title]").scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 100);
  await expect(page).toHaveURL(/\/kitab\/ihya\/1\/200$/);
});

test("gulir bersambung: sitasi paragraf halaman sambungan menyebut halaman cetaknya sendiri", async ({
  page,
  context,
  baseURL,
  isMobile,
}) => {
  test.skip(isMobile, "menu paragraf dibuka lewat hover");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(PAGE);
  const next = page.getByRole("region", { name: "Halaman sambungan, juz 1 halaman 201" });
  await expect(async () => {
    await page.mouse.wheel(0, 4000);
    await expect(next).toBeAttached({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });
  const passage = next.locator(".passage[id^='p']").first();
  await passage.scrollIntoViewIfNeeded();
  const id = await passage.getAttribute("id");
  expect(id).toMatch(/^p\d+$/);
  await passage.hover();
  await passage.getByRole("button", { name: /Aksi paragraf/ }).click();
  await page.getByRole("menuitem", { name: "Salin sitasi paragraf" }).click();
  await expect(page.getByText("Sitasi disalin")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("j.1 h.201.");
  expect(copied).toContain(new URL(`/kitab/ihya/1/201#${id}`, baseURL).href);
});

test("gulir bersambung: Back sesudah pindah halaman menampilkan halaman yang ditunjuk URL", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "daftar isi samping hanya di desktop");
  await page.goto(PAGE);
  const next = page.getByRole("region", { name: "Halaman sambungan, juz 1 halaman 201" });
  await expect(async () => {
    await page.mouse.wheel(0, 4000);
    await expect(next).toBeAttached({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });
  await next.locator(".passage").first().scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await expect(page).toHaveURL(/\/kitab\/ihya\/1\/201$/);
  // Navigasi klien ke halaman lain lewat daftar isi samping, lalu Back.
  const link = page.locator("aside a[href^='/kitab/ihya/']").first();
  const target = await link.getAttribute("href");
  await link.click();
  await expect(page).toHaveURL(
    new RegExp(`${target!.split("#")[0]!.replaceAll("/", "\\/")}(#.*)?$`),
  );
  await page.goBack();
  await expect(page).toHaveURL(/\/kitab\/ihya\/1\/201$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Juz 1 · Halaman 201");
});

test("salin seluruh halaman (⌘A): tanpa isi skrip, JSON-LD, atau payload RSC", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(isMobile, "seleksi teks dengan mouse");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(PAGE);
  await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.body);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.press("ControlOrMeta+c");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  // Jalur salin berlabel yang dipakai (seleksi menyentuh terjemahan), tetapi tanpa isi <script>.
  expect(copied).toContain("(Terjemahan AI, ");
  expect(copied).not.toContain("self.__next_f");
  expect(copied).not.toContain("BreadcrumbList");
});

test("gulir bersambung: atribusi ayat (Tanzil, Kemenag) ikut di halaman sambungan yang mengutip ayat", async ({
  page,
}) => {
  await page.goto("/kitab/ihya/1/118");
  const next = page.getByRole("region", { name: "Halaman sambungan, juz 1 halaman 119" });
  await expect(async () => {
    await page.mouse.wheel(0, 4000);
    await expect(next).toBeAttached({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });
  // Atribusi ada di bagian halaman sambungan itu (di bawah teksnya), bukan di kaki halaman pertama.
  const section = page.locator('[data-continued="1/119"]');
  await expect(section.getByText(/^Ayat Al-Qur'an:/)).toBeVisible();
});
