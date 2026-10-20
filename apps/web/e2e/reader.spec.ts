import { expect, test } from "@playwright/test";

// Smoke e2e pembaca kitab (S09 langkah 10). Butuh D1 berisi Ihya: lokal = `pnpm corpus:load:local`,
// Preview = surau-corpus-staging. Teks kitab tidak disalin ke sini; satu-satunya frasa Arab adalah
// contoh baku takhrij j1 h200 (.claude/rules/teks-arab.md), dan kesamaan teks diuji dengan
// membandingkan dua tempat tampil di halaman (popover vs daftar catatan kaki), bukan dengan salinan.

const PAGE = "/kitab/ihya/1/200";

test("halaman cetak j1 h200: judul, teks Arab RTL, dan atribusi sumber", async ({ page }) => {
  const response = await page.goto(PAGE);
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Juz 1 · Halaman 200");
  const text = page.getByRole("region", { name: "Teks kitab" });
  const first = text.locator(".arabic-text").first();
  await expect(first).toHaveAttribute("lang", "ar");
  await expect(first).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByText(/OpenITI 2025\.1\.9 \(CC BY-NC-SA 4\.0\)/)).toBeVisible();
  await expect(page.getByRole("link", { name: /al-Maktaba al-Shamela/ })).toHaveAttribute(
    "href",
    "https://shamela.ws/book/9472/200",
  );
});

test("halaman baca tanpa galat JavaScript (regresi `__name` dari bundler Worker)", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(PAGE);
  // keep_names: false (ADR-034 butir 8): skrip tema dari fn.toString() tidak boleh membawa __name.
  expect(await response?.text()).not.toContain("__name(");
  await expect(
    page.getByRole("group", { name: "Alat baca" }).getByRole("button", { name: "Tampilan" }),
  ).toBeVisible();
  await page.waitForLoadState("load");
  expect(errors).toEqual([]);
});

test("penanda (٤) membuka takhrij asli yang sama persis dengan catatan kakinya", async ({
  page,
}) => {
  await page.goto(PAGE);

  const dialog = page.getByRole("dialog", { name: "Catatan kaki (٤)" });
  // Klik sebelum hidrasi selesai tidak berbuat apa-apa (HTML server): ulangi sampai terbuka.
  await expect(async () => {
    await page.getByRole("button", { name: "Catatan kaki (٤)" }).click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass();
  const shown = await dialog.locator(".arabic-text").textContent();
  expect(shown).toContain("باطل لا أصل له");
  // Verbatim: isi popover = isi catatan kaki #p2834 di daftar bawah (keduanya text_raw dari DB).
  expect(shown).toBe(await page.locator("#p2834 .arabic-text").textContent());
});

test("permalink #pN menggulir ke paragraf yang tepat", async ({ page }) => {
  await page.goto(`${PAGE}#p2826`);

  const target = page.locator("#p2826");
  await expect(target).toBeInViewport();
  await expect(target.getByRole("button", { name: "Catatan kaki (٦)" })).toBeVisible();
});

test("navigasi halaman: tombol dan panah papan ketik mengikuti arah kitab Arab", async ({
  page,
}) => {
  await page.goto(PAGE);

  await page
    .getByRole("navigation", { name: "Navigasi halaman", exact: true })
    .getByRole("link", { name: /Berikutnya/ })
    .click();
  await expect(page).toHaveURL(/\/kitab\/ihya\/1\/201$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Juz 1 · Halaman 201");

  // → = halaman sebelumnya (kitab dibuka dari kanan ke kiri).
  await page.locator("body").press("ArrowRight");
  await expect(page).toHaveURL(/\/kitab\/ihya\/1\/200$/);
  await page.locator("body").press("ArrowLeft");
  await expect(page).toHaveURL(/\/kitab\/ihya\/1\/201$/);
});

test("Salin sitasi menghasilkan format sitasi + permalink", async ({
  page,
  context,
  baseURL,
  isMobile,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(PAGE);

  // Ponsel: Salin sitasi ada di menu ⋮ grup tombol.
  if (isMobile) {
    await page.getByRole("button", { name: "Aksi lain" }).click();
    await page.getByRole("menuitem", { name: "Salin sitasi" }).click();
  } else {
    await page.getByRole("button", { name: "Salin sitasi" }).click();
  }
  await expect(page.getByText("Sitasi disalin")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(
    `al-Ghazali, Ihya' 'Ulum ad-Din, Dar al-Ma'rifah, j.1 h.200. ${new URL(PAGE, baseURL).href}`,
  );
});

test("permalink bab dialihkan ke halaman awal bagian; edisi default ber-@ ke URL kanonis", async ({
  page,
}) => {
  await page.goto("/kitab/ihya/bab/100075");
  await expect(page).toHaveURL(/\/kitab\/ihya\/1\/200#bab-100075$/);
  await expect(page.locator("#bab-100075")).toBeAttached();

  await page.goto("/kitab/ihya@dar-al-marifah/1/200");
  await expect(page).toHaveURL(/\/kitab\/ihya\/1\/200$/);
});

test("alamat yang tidak ada atau tidak kanonis = 404", async ({ request }) => {
  for (const path of [
    "/kitab/ihya/1/999",
    "/kitab/ihya/01/200",
    "/kitab/tidak-ada",
    "/kitab/ihya/bab/1",
    // Rilis Fase 1: juz di luar jumlah jilid dan ID bab acak ditolak tanpa membaca daftar isi.
    "/kitab/ihya/0/1",
    "/kitab/ihya/5/1",
    "/kitab/ihya/999999999/1",
    "/kitab/ihya/bab/999999999",
  ]) {
    expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
  }
});

test("daftar isi menandai bagian aktif; halaman karya punya atribusi", async ({
  page,
  isMobile,
}) => {
  await page.goto(PAGE);
  if (isMobile) await page.getByRole("button", { name: "Daftar isi" }).click();
  const tree = page.getByRole("treegrid", { name: "Daftar isi kitab" }).last();
  // Tepat satu bagian aktif: tautan ber-aria-current="page" ke jangkar judulnya.
  const current = tree.locator('a[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toBeVisible();
  await expect(current).toHaveAttribute("href", /#bab-\d+$/);

  await page.goto("/kitab/ihya");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ihya' 'Ulum ad-Din");
  await expect(page.getByText("CC BY-NC-SA 4.0").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Mulai membaca" })).toHaveAttribute(
    "href",
    "/kitab/ihya/1/1",
  );
});

test("dialog Laporkan kesalahan terkirim (honeypot: server menjawab tanpa menyimpan)", async ({
  page,
}) => {
  await page.goto(PAGE);

  await page.getByRole("button", { name: "Laporkan kesalahan" }).click();
  const dialog = page.getByRole("dialog", { name: "Laporkan kesalahan" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Keterangan" }).fill("Uji e2e: abaikan.");
  // Kolom honeypot tersembunyi diisi seperti bot: server membalas 201 tetapi tidak menulis ke DB,
  // jadi e2e di Preview tidak mengotori DB app staging.
  await dialog.locator('input[name="website"]').fill("https://bot.example", { force: true });
  const posted = page.waitForResponse((r) => r.url().endsWith("/api/feedback"));
  await dialog.getByRole("button", { name: "Kirim laporan" }).click();
  expect((await posted).status()).toBe(201);
  await expect(dialog.getByText("Terima kasih, laporan Anda tersimpan.")).toBeVisible();
});

// S12: butuh korpus dengan tabel ayat (≥ ihya-v3: D1 lokal atau staging di Preview).
test("label rujukan ayat membuka teks ayat dan terjemahan Kemenag dengan atribusi", async ({
  page,
}) => {
  await page.goto("/kitab/ihya/1/119");
  // Nama aksesibel diawali label yang terlihat (WCAG 2.5.3).
  const chip = page.getByRole("button", { name: /^QS 27:90: rujukan ayat QS An-Naml \[27\]: 90,/ });
  await expect(chip).toBeVisible();
  // Label tampil lewat CSS, tidak ikut teks Arab yang disalin.
  const arabic = await page.locator(".reader-text .arabic-text").allInnerTexts();
  expect(arabic.join("\n")).not.toContain("QS 27:90");
  await chip.click();
  // Kutipan hanya sebagian ayat: terjemahan yang tampil adalah ayat lengkap, berlabel demikian.
  const card = page.getByRole("dialog").filter({ hasText: "Kitab mengutip sebagian ayat ini." });
  await expect(card.getByText("Terjemahan ayat lengkap (Kemenag)")).toBeVisible();
  await expect(page.getByRole("link", { name: /Buka ayat ini di Tanzil/ })).toHaveAttribute(
    "href",
    "https://tanzil.net/#27:90",
  );
  await expect(page.getByRole("link", { name: /Tanzil Quran Text/ }).first()).toHaveAttribute(
    "href",
    "https://tanzil.net",
  );
});

test("panel Tampilan: font Arab dan jarak baris tersimpan setelah muat ulang", async ({ page }) => {
  await page.goto(PAGE);
  await page
    .getByRole("group", { name: "Alat baca" })
    .getByRole("button", { name: "Tampilan" })
    .click();
  const panel = page.getByRole("dialog", { name: "Tampilan baca" });
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: /Huruf Arab/ }).click();
  await page.getByRole("option", { name: "Amiri" }).click();
  await panel.getByRole("button", { name: /Jarak baris/ }).click();
  await page.getByRole("option", { name: "Longgar" }).click();
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-reader-font", "amiri");
  await expect(html).toHaveAttribute("data-reader-leading", "loose");

  await page.reload();
  await expect(html).toHaveAttribute("data-reader-font", "amiri");
  await expect(html).toHaveAttribute("data-reader-leading", "loose");
  // Font pilihan berlaku untuk teks kitab (aturan CSS dibatasi ke .reader-text).
  const font = await page
    .getByRole("region", { name: "Teks kitab" })
    .locator(".arabic-text")
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(font).toMatch(/Amiri/);
  await page
    .getByRole("group", { name: "Alat baca" })
    .getByRole("button", { name: "Tampilan" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Tampilan baca" }).getByRole("button", { name: /Huruf Arab/ }),
  ).toContainText("Amiri");
});
