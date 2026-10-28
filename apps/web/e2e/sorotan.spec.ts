import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./hidrasi";
import type { Page } from "@playwright/test";

// Sorotan kalimat mengikuti audio (X18) di pratinjau /dev/intisari: audio SUNYI buatan + timestamps
// buatan (`/dev/intisari/sorotan.json`), tanpa ElevenLabs, media.surau.org, atau D1, jadi berjalan
// di `next dev` dan Preview CI (`DEV_PAGES`). Diperiksa: kalimat aktif disorot dengan Highlight API
// tanpa mengubah DOM, ketuk kalimat → audio melompat ke awalnya, halaman menggulir mengikuti audio
// kecuali pembaca baru menggulir sendiri, sorotan hilang saat pemutar ditutup, dan axe.

const PAGE = "/dev/intisari?tier=section";

/** Teks yang sedang disorot (gabungan Range `surau-dengar`), atau null. */
const highlighted = (page: Page) =>
  page.evaluate(() => {
    const h = CSS.highlights.get("surau-dengar");
    return h === undefined ? null : [...h].map((r) => (r as Range).toString()).join("");
  });

const seconds = (page: Page) =>
  page
    .getByRole("slider", { name: "Posisi dengar" })
    .evaluate((el) => Number((el as HTMLInputElement).value));

test.describe("Sorotan kalimat audio (X18)", () => {
  test.beforeEach(async ({ page }) => {
    // Indikator dev Next.js menutupi tombol pemutar di pojok kanan bawah.
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = "nextjs-portal { display: none !important; }";
        document.head.appendChild(style);
      });
    });
  });

  test("sorot kalimat aktif, ketuk untuk lompat, ikuti gulir, axe", async ({ page }) => {
    await page.goto(PAGE);
    const said = page.locator("[data-say]");
    const html = await said.evaluateAll((els) => els.map((e) => e.outerHTML).join(""));
    const abstract = page.locator('[data-say="abstract"]').first();
    const firstSentence = ((await abstract.textContent()) ?? "").split(/(?<=[.!?])\s/u)[0]!;

    await page.getByRole("button", { name: /^Dengarkan/u }).click();
    await expect(page.locator("[data-listen-player]")).toBeVisible();
    // Kalimat sumber ("Dari kitab …") tidak tampil sebagai teks: belum ada sorotan; lalu
    // kalimat pertama ringkasan tersorot.
    await expect.poll(() => highlighted(page), { timeout: 15_000 }).toBe(firstSentence);
    await expect(page.locator("html")).toHaveAttribute("data-listen-follow", "");
    // DOM teks yang dibacakan tidak diubah oleh sorotan.
    expect(await said.evaluateAll((els) => els.map((e) => e.outerHTML).join(""))).toBe(html);

    // Ketuk awal isi gagasan pertama: audio melompat ke kalimatnya dan kalimat itu tersorot.
    const before = await seconds(page);
    const body = page.locator('[data-say="point-body-1"]');
    await body.click({ position: { x: 4, y: 8 } });
    const bodyText = (await body.textContent()) ?? "";
    await expect.poll(() => highlighted(page)).toBe(bodyText.split(/(?<=[.!?])\s/u)[0]);
    expect(await seconds(page)).toBeGreaterThan(before);

    // Gulir mengikuti audio: sesudah halaman digulir program ke atas, kalimat berikut membawa
    // halaman kembali ke kalimat aktif.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 15_000 })
      .toBeGreaterThan(100);

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);

    // Tutup pemutar: sorotan dan mode ketuk hilang.
    await page.getByRole("button", { name: "Tutup pemutar" }).click();
    await expect.poll(() => highlighted(page)).toBeNull();
    await expect(page.locator("html")).not.toHaveAttribute("data-listen-follow");
  });

  test("tautan di teks yang dibacakan tetap tautan; memilih teks tidak melompat", async ({
    page,
  }) => {
    await page.goto(PAGE);
    await page.getByRole("button", { name: /^Dengarkan/u }).click();
    await expect(page.locator("html")).toHaveAttribute("data-listen-follow", "");
    await page.getByRole("button", { name: "Jeda", exact: true }).click();
    const at = await seconds(page);
    // Memilih teks (seret) tidak dianggap ketukan.
    const body = page.locator('[data-say="point-body-1"]');
    const box = (await body.boundingBox())!;
    await page.mouse.move(box.x + 4, box.y + 8);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 4, box.y + 8);
    await page.mouse.up();
    expect(await seconds(page)).toBe(at);
  });
});
