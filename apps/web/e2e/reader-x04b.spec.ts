import { expect, test } from "@playwright/test";

// Mutu baca pembaca (X04 bagian B): subjudul kurasi di daftar isi pembaca (W7), judul node yang
// diperbaiki (butir daftar pembuka, jangkar sumber terlalu awal), dan judul Indonesia berlabel AI
// (W8, hanya bila korpus skema ≥ 7). Butuh D1 berisi Ihya (lokal: korpus build; Preview: staging).
// Teks kitab tidak disalin ke sini: diperiksa lewat peran, jangkar, dan struktur.

const TEXT = { name: "Teks kitab", exact: true } as const;

test("judul node dari butir daftar: butir = teks biasa, judul di akhir paragraf berikutnya = h2 + jangkar", async ({
  page,
}) => {
  await page.goto("/kitab/ihya/4/142");
  const text = page.getByRole("region", TEXT);
  await expect(text.locator("#p16599").locator("h2, h3")).toHaveCount(0);
  await expect(text.locator("#p16600 h2")).toHaveCount(1);
  await expect(text.locator("#p16600 #bab-100224")).toHaveCount(1);
});

test("judul kitab sesudah kolofon kitab sebelumnya tampil sebagai h2 berjangkar", async ({
  page,
}) => {
  await page.goto("/kitab/ihya/1/208");
  const text = page.getByRole("region", TEXT);
  await expect(text.locator("#p2973 h2")).toHaveCount(1);
  await expect(text.locator("#p2973 #bab-100077")).toHaveCount(1);
  await expect(text.locator("#p2971 #bab-100077")).toHaveCount(0);
});

test("daftar isi pembaca memuat subjudul kurasi sebagai anak node (tautan #pN)", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "daftar isi samping hanya di desktop");
  await page.goto("/kitab/ihya/3/202");
  const tree = page.getByRole("complementary").getByRole("treegrid", { name: "Daftar isi kitab" });
  // Bagian aktif (Kitab Dzamm ad-Dunya) tidak punya subbab di daftar isi korpus; subjudulnya ada.
  const sub = tree.locator('a[href="/kitab/ihya/3/202#p13553"]');
  await expect(async () => {
    if ((await sub.count()) === 0) {
      await tree
        .locator('[role="row"][data-current], [role="row"]:has([data-current])')
        .first()
        .locator("button.toc-chevron")
        .click();
    }
    await expect(sub).toHaveCount(1, { timeout: 1000 });
  }).toPass();
  await expect(tree.locator("[data-sub]").first()).toBeVisible();
});

test("judul Indonesia (korpus skema 7): berlabel di daftar isi + kepala halaman; <title>, OG, breadcrumb tetap Arab", async ({
  page,
}) => {
  await page.goto("/kitab/ihya/3/202");
  const note = page.locator(".toc-title-note").first();
  test.skip((await note.count()) === 0, "korpus belum punya judul Indonesia (skema < 7)");
  await expect(note).toContainText("Terjemahan AI");
  await expect(note).toContainText(/translate-toc-title@\d+/);
  const header = page.locator("[data-reader-title]");
  const titleId = header.locator("span[lang='id']");
  await expect(titleId.locator(".ai-badge")).toHaveText("Terjemahan AI");
  const indonesian = ((await titleId.textContent()) ?? "").replace("Terjemahan AI", "").trim();
  expect(indonesian.length).toBeGreaterThan(0);
  const title = await page.title();
  const og = (await page.locator('meta[property="og:title"]').getAttribute("content")) ?? "";
  const crumbs = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(
    " ",
  );
  for (const s of [title, og, crumbs]) expect(s).not.toContain(indonesian);
  expect(title).toMatch(/\p{Script=Arabic}/u);
});
