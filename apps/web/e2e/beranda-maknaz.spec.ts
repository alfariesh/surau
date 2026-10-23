import type { Page } from "@playwright/test";

import { expect, test } from "@playwright/test";

import { tanyaText } from "../src/i18n/tanya";

// Kotak cari Beranda → Maknaz (ADR-086). /api/jawab dipalsukan di browser (page.route), jadi tidak
// ada permintaan yang sampai ke server: tanpa LLM berbayar di Preview. Dilewati bila segmen Maknaz
// tidak ada (produksi sebelum `/rilis 4`).

interface FakeJawab {
  posts: number;
}

async function fakeJawab(page: Page, status: { challenge: boolean; sitekey: string | null }) {
  const fake: FakeJawab = { posts: 0 };
  await page.route("**/api/jawab", (route) => {
    if (route.request().method() === "POST") {
      fake.posts++;
      return route.fulfill({ status: 503, json: { error: "internal" } });
    }
    return route.fulfill({
      json: { available: true, reason: null, quota: { used: 0, limit: 10 }, ...status },
    });
  });
  // Skrip Turnstile tidak dimuat.
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  return fake;
}

async function askFromHome(page: Page, question: string) {
  await page.goto("/");
  const segment = page.getByRole("search").getByRole("radio", { name: "Maknaz" });
  test.skip((await segment.count()) === 0, "Maknaz mati di lingkungan ini");
  // Klik sebelum hidrasi tidak berbuat apa-apa: ulangi sampai segmen benar-benar terpilih.
  await expect(async () => {
    await segment.click();
    await expect(segment).toBeChecked({ timeout: 1000 });
  }).toPass();
  // Status dimuat saat Maknaz dipilih: tunggu sisa kuota tampil sebelum mengirim.
  await expect(page.getByRole("search").getByText(tanyaText.quota(0, 10))).toBeVisible();
  const box = page.getByRole("search").getByRole("textbox");
  await box.fill(question);
  await box.press("Enter");
  await expect(page).toHaveURL(/\/tanya$/);
}

test("Maknaz dari Beranda: tepat satu kiriman, tanpa pertanyaan di alamat, tidak terkirim ulang saat dimuat ulang", async ({
  page,
}) => {
  const fake = await fakeJawab(page, { challenge: false, sitekey: null });
  const question = "Pertanyaan uji e2e dari Beranda";
  await askFromHome(page, question);

  await expect(page.getByText(question)).toBeVisible();
  await expect.poll(() => fake.posts).toBe(1);
  expect(page.url()).not.toContain("?");

  await page.reload();
  await expect(page.getByText(question)).toHaveCount(0);
  expect(fake.posts).toBe(1);
});

test("Maknaz dari Beranda dengan tantangan: Turnstile dulu, belum ada kiriman", async ({
  page,
}) => {
  const fake = await fakeJawab(page, { challenge: true, sitekey: "1x00000000000000000000AA" });
  const question = "Pertanyaan uji e2e dengan tantangan";
  await askFromHome(page, question);

  await expect(page.getByText(question)).toBeVisible();
  // Fase tantangan dimulai; skrip Turnstile diblokir di tes, jadi widgetnya beralih ke pesan
  // "tidak tersedia" (hanya fase tantangan yang bisa sampai ke pesan ini). Tidak ada POST.
  await expect(
    page.getByRole("main").getByText(tanyaText.errors.challenge_unavailable!).first(),
  ).toBeVisible();
  expect(fake.posts).toBe(0);
});
