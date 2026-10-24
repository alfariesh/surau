import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Lanjutan mode baca (X14, ADR-094): petunjuk mode baca sekali tampil dan Ringkasan AI yang ikut kata
// cari. Butuh D1 berisi Ihya (lokal: korpus build atau `pnpm dev:remote`; Preview: staging). Teks
// kitab tidak disalin ke sini: yang diperiksa atribut, struktur, dan posisi.

const PAGE = "/kitab/ihya/1/200";
const TEXT = { name: "Teks kitab", exact: true } as const;
const HINT = { name: "Pilih cara membaca" } as const;
/** Kata yang di j1/200 hanya ada di Ringkasan AI, jauh sesudah dua baris pertamanya. */
const SUMMARY_ONLY = "berkurban";

function hint(page: Page) {
  return page.getByRole("radiogroup", HINT);
}

async function setMode(page: Page, mode: "ar" | "both" | "tr") {
  await page.addInitScript((m) => {
    try {
      localStorage.setItem("surau:read-mode", m);
    } catch {}
  }, mode);
}

test("petunjuk tampil bagi pengunjung baru walau JS Next tidak dimuat; tersembunyi bila mode tersimpan atau ditutup", async ({
  page,
}) => {
  await page.route(/\/_next\/static\/.*\.js(\?|$)/, (route) => route.abort());
  await page.goto(PAGE, { waitUntil: "domcontentloaded" });
  const html = page.locator("html");
  const card = page.getByRole("region", TEXT).locator(".read-mode-hint");
  await expect(html).not.toHaveAttribute("data-read-mode-hint");
  await expect(card).toBeVisible();
  // Catatan AI tetap ada di bawahnya (aturan 8).
  await expect(page.getByRole("region", TEXT).locator(".ai-notice")).toBeVisible();

  for (const [key, value] of [
    ["surau:read-mode", "both"],
    ["surau:read-mode-hint", "off"],
  ] as const) {
    await page.evaluate(
      ([k, v]) => {
        localStorage.clear();
        localStorage.setItem(k, v);
      },
      [key, value],
    );
    await page.goto(PAGE, { waitUntil: "domcontentloaded" });
    await expect(html).toHaveAttribute("data-read-mode-hint", "off");
    await expect(card).toBeHidden();
  }
});

test("memilih mode di petunjuk: paragraf yang dibaca tidak bergeser (≤ 2 px); tinggi petunjuk tetap", async ({
  page,
}) => {
  await page.goto(PAGE);
  const group = hint(page);
  await expect(group).toBeVisible();
  const card = page.getByRole("region", TEXT).locator(".read-mode-hint");
  const text = page.getByRole("region", TEXT);
  const html = page.locator("html");
  const height = await card.evaluate((el) => el.getBoundingClientRect().height);
  for (const label of ["Arab", "Terjemahan", "Keduanya"] as const) {
    // Seperti X11: paragraf kelima di sepertiga atas layar (di posisi gulir 0 halaman tidak bisa
    // digulir ke atas untuk mengompensasi catatan AI yang disembunyikan mode Arab).
    await text
      .locator(".passage")
      .nth(4)
      .evaluate((el) => {
        el.scrollIntoView({ block: "start" });
        window.scrollBy({ top: -120, behavior: "instant" });
      });
    const anchor = await page.evaluate(() => {
      const el = [...document.querySelectorAll(".reader-text .passage")].find(
        (p) => p.getBoundingClientRect().top >= 63,
      );
      return el === undefined ? null : { id: el.id, top: el.getBoundingClientRect().top };
    });
    expect(anchor).not.toBeNull();
    // Klik lewat DOM (bukan gerak tetikus alat uji): yang diukur hanya perubahan mode.
    await group.getByRole("radio", { name: label }).dispatchEvent("click");
    if (label === "Arab") await expect(html).toHaveAttribute("data-read-mode", "ar");
    else if (label === "Terjemahan") await expect(html).toHaveAttribute("data-read-mode", "tr");
    else await expect(html).not.toHaveAttribute("data-read-mode");
    // Petunjuk tetap di halaman ini, setinggi semula (penjelasan mode setinggi tetap).
    await expect(card).toBeVisible();
    expect(
      Math.abs((await card.evaluate((el) => el.getBoundingClientRect().height)) - height),
    ).toBeLessThan(1);
    const after = await text
      .locator(`#${anchor!.id}`)
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(after - anchor!.top)).toBeLessThanOrEqual(2);
  }
});

for (const label of ["Keduanya", "Arab"] as const) {
  test(`memilih ${label} di petunjuk: halaman berikutnya (navigasi lunak dan muat ulang) tanpa petunjuk (regresi)`, async ({
    page,
  }) => {
    await page.goto(PAGE);
    const group = hint(page);
    await expect(group).toBeVisible();
    // Keduanya = bawaan yang sudah aktif: menekannya tetap dihitung sebagai pilihan.
    await group.getByRole("radio", { name: label }).click();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("surau:read-mode")))
      .toBe(label === "Arab" ? "ar" : "both");
    // Navigasi lunak Next (skrip awal tidak jalan lagi): penanda di window bertahan.
    await page.evaluate(() => ((window as unknown as { tetap: boolean }).tetap = true));
    await page
      .getByRole("link", { name: /^Berikutnya \(j\.1 h\.201\)/ })
      .first()
      .click();
    // Render halaman berikutnya lewat D1 bisa > 5 dtk di dev:remote.
    await expect(page).toHaveURL(/\/kitab\/ihya\/1\/201/, { timeout: 15_000 });
    expect(await page.evaluate(() => (window as unknown as { tetap?: boolean }).tetap)).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("data-read-mode-hint", "off");
    await expect(page.getByRole("region", TEXT).locator(".read-mode-hint")).toBeHidden();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-read-mode-hint", "off");
  });
}

test("tutup petunjuk: hilang, diingat browser, mode tetap Keduanya", async ({ page }) => {
  await page.goto(PAGE);
  await expect(hint(page)).toBeVisible();
  await page.getByRole("button", { name: "Tutup petunjuk mode baca" }).click();
  await expect(hint(page)).toBeHidden();
  // Fokus keyboard pindah ke wilayah teks, tidak jatuh ke <body> (WCAG 2.4.3).
  expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe(
    "Teks kitab",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-read-mode-hint", "off");
  await expect(page.locator("html")).not.toHaveAttribute("data-read-mode");
  expect(await page.evaluate(() => localStorage.getItem("surau:read-mode"))).toBeNull();
});

test("kata cari di Ringkasan AI tersorot; ringkasan terpotong dibuka (Keduanya, regresi)", async ({
  page,
}) => {
  await setMode(page, "both");
  await page.goto(`${PAGE}?q=${encodeURIComponent(SUMMARY_ONLY)}`);
  const summary = page.locator(".section-summary").first();
  const body = summary.locator('[data-tr-seg="summary"]');
  // Penyorot memuat @surau/text belakangan (bisa > 5 dtk di dev:remote yang sibuk).
  await expect(body).toHaveAttribute("data-expanded", "", { timeout: 15_000 });
  await expect(summary.getByRole("button", { name: "Tutup ringkasan" })).toBeVisible();
  // Sorotan ada di dalam teks ringkasan, dan tetap ada sesudah ringkasan ditutup-buka (DOM sama).
  const inSummary = () =>
    page.evaluate(
      () =>
        [...(CSS.highlights.get("surau-cari")?.values() ?? [])].filter((r) =>
          (r as Range).startContainer.parentElement?.closest('[data-tr-seg="summary"]'),
        ).length,
    );
  await expect.poll(inSummary).toBeGreaterThan(0);
  await summary.getByRole("button", { name: "Tutup ringkasan" }).click();
  await summary.getByRole("button", { name: "Baca selengkapnya" }).click();
  expect(await inSummary()).toBeGreaterThan(0);
  // Bukan mode Arab: tombol sembunyikan tidak tampil.
  await expect(
    summary.getByRole("button", { name: "Sembunyikan lagi ringkasan AI ini" }),
  ).toBeHidden();
});

test("mode Arab: Ringkasan AI yang cocok dibuka sementara lalu bisa disembunyikan lagi (regresi ADR-091 §4)", async ({
  page,
}) => {
  await setMode(page, "ar");
  await page.goto(`${PAGE}?q=${encodeURIComponent(SUMMARY_ONLY)}`);
  const summary = page.locator(".section-summary").first();
  await expect(summary).toHaveAttribute("data-tr-peek", "", { timeout: 15_000 });
  await expect(summary).toBeVisible();
  await expect(summary.locator('[data-tr-seg="summary"]')).toHaveAttribute("data-expanded", "");
  await expect
    .poll(() => page.evaluate(() => CSS.highlights.get("surau-cari")?.size ?? 0))
    .toBeGreaterThan(0);
  // Bantuan AI lain tetap tersembunyi di mode Arab.
  await expect(page.getByRole("region", TEXT).locator(".ai-notice")).toBeHidden();
  await summary.scrollIntoViewIfNeeded();
  await summary.getByRole("button", { name: "Sembunyikan lagi ringkasan AI ini" }).click();
  await expect(summary).toBeHidden();
  // Fokus keyboard tidak jatuh ke <body> (WCAG 2.4.3).
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
  await expect(summary).not.toHaveAttribute("data-tr-peek");
});

test("mode Arab tanpa kata cari: Ringkasan AI tetap tersembunyi (regresi)", async ({ page }) => {
  await setMode(page, "ar");
  await page.goto(PAGE);
  await expect(page.locator(".section-summary").first()).toBeHidden();
});
