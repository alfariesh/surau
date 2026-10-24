import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Lanjutan mode baca (X13, ADR-093): petunjuk mode baca sekali tampil dan Ringkasan AI yang ikut kata
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

test("memilih mode di petunjuk: paragraf yang dibaca tidak bergeser (≤ 2 px); petunjuk tidak muncul lagi", async ({
  page,
}) => {
  await page.goto(PAGE);
  const group = hint(page);
  await expect(group).toBeVisible();
  const text = page.getByRole("region", TEXT);
  const html = page.locator("html");
  for (const label of ["Arab", "Terjemahan", "Keduanya"] as const) {
    const anchor = await page.evaluate(() => {
      const el = [...document.querySelectorAll(".reader-text .passage")].find(
        (p) => p.getBoundingClientRect().top >= 63,
      );
      return el === undefined ? null : { id: el.id, top: el.getBoundingClientRect().top };
    });
    expect(anchor).not.toBeNull();
    const top = await group.evaluate((el) => el.getBoundingClientRect().top);
    await group.getByRole("radio", { name: label }).dispatchEvent("click");
    if (label === "Arab") await expect(html).toHaveAttribute("data-read-mode", "ar");
    else if (label === "Terjemahan") await expect(html).toHaveAttribute("data-read-mode", "tr");
    else await expect(html).not.toHaveAttribute("data-read-mode");
    // Petunjuk tetap di halaman ini dan tidak bergeser di bawah jari (penjelasan setinggi tetap).
    await expect(group).toBeVisible();
    expect(
      Math.abs((await group.evaluate((el) => el.getBoundingClientRect().top)) - top),
    ).toBeLessThan(1);
    const after = await text
      .locator(`#${anchor!.id}`)
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(after - anchor!.top)).toBeLessThanOrEqual(2);
  }
  // Mode tersimpan: halaman berikutnya tanpa petunjuk.
  await page.reload();
  await expect(html).toHaveAttribute("data-read-mode-hint", "off");
  await expect(group).toBeHidden();
});

test("tutup petunjuk: hilang, diingat browser, mode tetap Keduanya", async ({ page }) => {
  await page.goto(PAGE);
  await expect(hint(page)).toBeVisible();
  await page.getByRole("button", { name: "Tutup petunjuk mode baca" }).click();
  await expect(hint(page)).toBeHidden();
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
  await expect(body).toHaveAttribute("data-expanded", "");
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
  await expect(summary).toHaveAttribute("data-tr-peek", "");
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
  await expect(summary).not.toHaveAttribute("data-tr-peek");
});

test("mode Arab tanpa kata cari: Ringkasan AI tetap tersembunyi (regresi)", async ({ page }) => {
  await setMode(page, "ar");
  await page.goto(PAGE);
  await expect(page.locator(".section-summary").first()).toBeHidden();
});
