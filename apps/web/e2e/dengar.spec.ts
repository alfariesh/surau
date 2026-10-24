import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Pemutar "Dengarkan" (X17) di halaman uji /dev/dengar: audio SUNYI buatan (route /dev/dengar/
// sunyi.mp3, tanpa media.surau.org dan tanpa D1), jadi berjalan di `next dev` dan Preview CI
// (`DEV_PAGES`). Diperiksa: putar/jeda, kecepatan, bab = gagasan, Media Session (metadata berlabel
// suara AI + handler layar kunci), navigasi tanpa putus, lanjut posisi sesudah muat ulang, dan axe.

const PAGE = "/dev/dengar";
const TRACK = "uji/1";

/**
 * Tangkap handler Media Session supaya tombol layar kunci bisa "ditekan" dari tes. Indikator dev
 * Next.js (hanya `next dev`, pojok kanan bawah) disembunyikan karena menutupi tombol kecepatan.
 */
async function captureMediaSession(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.head.appendChild(style);
    });
    const handlers: Record<string, ((d: object) => void) | null> = {};
    (window as unknown as { __ms: typeof handlers }).__ms = handlers;
    const original = navigator.mediaSession.setActionHandler.bind(navigator.mediaSession);
    navigator.mediaSession.setActionHandler = (action, handler) => {
      handlers[action] = handler as ((d: object) => void) | null;
      original(action, handler);
    };
  });
}

const player = (page: Page) => page.locator("[data-listen-player]");
const chapter = (page: Page) => page.locator("[data-listen-chapter]");
const seconds = (page: Page) =>
  page
    .getByRole("slider", { name: "Posisi dengar" })
    .evaluate((el) => Number((el as HTMLInputElement).value));

async function lockScreen(page: Page, action: string, details: object = {}) {
  await page.evaluate(
    ([a, d]) =>
      (window as unknown as { __ms: Record<string, (x: object) => void> }).__ms[a as string]?.(
        d as object,
      ),
    [action, details] as const,
  );
}

test.describe("Dengarkan (X17)", () => {
  test.beforeEach(async ({ page }) => {
    await captureMediaSession(page);
  });

  test("putar, Media Session berlabel suara AI, jeda, kecepatan, bab, ±15 dtk", async ({
    page,
  }) => {
    await page.goto(PAGE);
    const button = page.locator(`[data-listen-button="${TRACK}"]`);
    await expect(button).toHaveAccessibleName("Dengarkan 2 menit");
    await expect(button).toHaveAccessibleDescription("Dibacakan suara AI (Narator Uji)");
    await button.click();
    await expect(player(page)).toBeVisible();
    await expect(button).toHaveAccessibleName(/^Jeda/u);
    await expect(player(page)).toContainText("Dibacakan suara AI (Narator Uji)");
    await expect
      .poll(() => page.evaluate(() => navigator.mediaSession.playbackState))
      .toBe("playing");
    expect(
      await page.evaluate(() => ({
        title: navigator.mediaSession.metadata?.title,
        artist: navigator.mediaSession.metadata?.artist,
      })),
    ).toEqual({ title: "Intisari: Intisari uji 1", artist: "Suara AI · Surau" });
    await expect.poll(() => seconds(page)).toBeGreaterThan(0);

    // Bab = gagasan: dari pembuka ke gagasan 1 (detik 10), lalu lewat tombol layar kunci ke gagasan 2.
    await expect(chapter(page)).toHaveText("Pembuka");
    await page.getByRole("button", { name: "Gagasan berikutnya" }).click();
    await expect(chapter(page)).toHaveText("Gagasan 1 dari 4");
    await lockScreen(page, "nexttrack");
    await expect(chapter(page)).toHaveText("Gagasan 2 dari 4");
    expect(await seconds(page)).toBeGreaterThanOrEqual(30);
    await lockScreen(page, "seekforward");
    expect(await seconds(page)).toBeGreaterThanOrEqual(45);
    await page.getByRole("button", { name: "Mundur 15 detik" }).click();
    expect(await seconds(page)).toBeLessThan(45);

    // Kecepatan berputar 0,75–2× dan tersimpan.
    await page.getByRole("button", { name: "Kecepatan 1×" }).click();
    await expect(page.getByRole("button", { name: "Kecepatan 1,25×" })).toBeVisible();
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem("surau:listen:v1") ?? "{}").rate),
    ).toBe(1.25);

    // Jeda dari pemutar dan dari layar kunci.
    await page.getByRole("button", { name: "Jeda", exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => navigator.mediaSession.playbackState))
      .toBe("paused");
    await lockScreen(page, "play");
    await expect
      .poll(() => page.evaluate(() => navigator.mediaSession.playbackState))
      .toBe("playing");

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });

  test("pindah halaman tanpa putus; lanjut posisi sesudah muat ulang", async ({ page }) => {
    await page.goto(PAGE);
    await page.locator(`[data-listen-button="${TRACK}"]`).click();
    await expect(player(page)).toBeVisible();
    await page.getByRole("button", { name: "Gagasan berikutnya" }).click();
    await page.getByRole("button", { name: "Gagasan berikutnya" }).click();
    expect(await seconds(page)).toBeGreaterThanOrEqual(30);

    // Navigasi klien: shell tidak di-remount, audio tetap berjalan dan waktu terus maju.
    await page.evaluate(() => ((window as unknown as { __tetap: boolean }).__tetap = true));
    await page.getByRole("link", { name: "Pindah halaman (pemutar tetap berjalan)" }).click();
    await expect(page).toHaveURL(/\/tentang$/u);
    expect(await page.evaluate(() => (window as unknown as { __tetap?: boolean }).__tetap)).toBe(
      true,
    );
    await expect(player(page)).toBeVisible();
    const before = await seconds(page);
    await expect.poll(() => seconds(page)).toBeGreaterThan(before);
    expect(await page.evaluate(() => navigator.mediaSession.playbackState)).toBe("playing");

    // Jeda (posisi disimpan), muat ulang: pemutar dipulihkan dari dengar.json, dijeda, di posisi itu.
    await page.getByRole("button", { name: "Jeda", exact: true }).click();
    const saved = await page.evaluate(
      (id) =>
        JSON.parse(localStorage.getItem("surau:listen:v1") ?? "{}").positions?.[id]?.t as number,
      TRACK,
    );
    expect(saved).toBeGreaterThanOrEqual(30);
    await page.route("**/kitab/uji/bab/1/intisari/dengar.json", (route) =>
      route.fulfill({
        json: {
          id: TRACK,
          key: "uji/id/1-000000000001.mp3",
          src: "/dev/dengar/sunyi.mp3?d=90",
          title: "Intisari uji 1",
          workTitle: "Kitab Uji",
          href: "/dev/dengar",
          duration: 90,
          voice: { kind: "ai", name: "Narator Uji" },
          chapters: [10, 30, 50, 70].map((start, i) => ({
            point_ord: i + 1,
            start,
            title: `Gagasan uji ${i + 1}`,
          })),
        },
      }),
    );
    await page.reload();
    await expect(player(page)).toBeVisible();
    await expect.poll(() => seconds(page)).toBe(Math.floor(saved));
    await page.getByRole("button", { name: "Dengarkan", exact: true }).click();
    await expect.poll(() => seconds(page)).toBeGreaterThan(Math.floor(saved));

    // Menutup pemutar: tidak dipulihkan lagi.
    await page.getByRole("button", { name: "Tutup pemutar" }).click();
    await expect(player(page)).toBeHidden();
    await page.reload();
    await page.waitForTimeout(500);
    await expect(player(page)).toBeHidden();
  });
});
