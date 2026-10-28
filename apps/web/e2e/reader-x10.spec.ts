import type { Page } from "@playwright/test";

import { expect, test } from "./hidrasi";

// Rapikan pembaca (X10): preferensi tampilan dipasang skrip mentah (tanpa menunggu JS Next), daftar
// isi mengikuti posisi baca (subjudul aktif, leluhur dibuka di halaman sambungan), kaki halaman
// sambungan menurut halamannya sendiri, rincian label tinjauan menempel di dekat lencananya.

const SUB_202 = "/kitab/ihya/3/202#p13553";
const TOC_JSON = "/kitab/ihya/daftar-isi.json";

/** Buka halaman baca desktop dan tunggu pohon lengkap (X09) supaya klik chevron tidak hilang. */
async function gotoWithFullToc(page: Page, path: string) {
  const loaded = page.waitForResponse((r) => r.url().endsWith(TOC_JSON) && r.ok());
  await page.goto(path);
  await loaded;
}

/** Gulir sampai halaman sambungan termuat, lalu baca halaman itu (URL berganti). */
async function readContinued(page: Page, juz: number, pageNo: number) {
  const next = page.getByRole("region", {
    name: `Halaman sambungan, juz ${juz} halaman ${pageNo}`,
  });
  await expect(async () => {
    await page.mouse.wheel(0, 4000);
    await expect(next).toBeAttached({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });
  // Halaman terbaca = teks yang melewati garis 30% tinggi layar; kaki halaman sebelumnya (X10) ada di
  // antara kedua teks, jadi taruh awal teks halaman ini di 20% tinggi layar.
  await expect(async () => {
    await next.evaluate((el) =>
      window.scrollBy(0, el.getBoundingClientRect().top - window.innerHeight * 0.2),
    );
    await expect(page).toHaveURL(new RegExp(`/kitab/ihya/${juz}/${pageNo}$`), { timeout: 1500 });
  }).toPass({ timeout: 15_000 });
  return next;
}

test("preferensi pembaca terpasang di <html> walau JS Next tidak dimuat (skrip mentah)", async ({
  page,
}) => {
  await page.goto("/kitab/ihya/1/200");
  await page.evaluate(() => {
    localStorage.setItem("surau:reader-scale", "1.3");
    localStorage.setItem("surau:reader-tr-layout", "fold");
    localStorage.setItem("surau:reader-font", "amiri");
  });
  // `<Script strategy="beforeInteractive">` baru dijalankan runtime Next (chunk JS); skrip mentah
  // dijalankan browser saat HTML diurai.
  await page.route(/\/_next\/static\/.*\.js(\?|$)/, (route) => route.abort());
  await page.goto("/kitab/ihya/1/200", { waitUntil: "domcontentloaded" });
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-tr-layout", "fold");
  await expect(html).toHaveAttribute("data-reader-font", "amiri");
  expect(
    await page.evaluate(() => document.documentElement.style.getPropertyValue("--reader-scale")),
  ).toBe("1.3");
  expect(await page.content()).not.toContain("__next_s");
});

test("daftar isi: subjudul kurasi j3/202 jadi baris aktif", async ({ page, isMobile }) => {
  await page.goto("/kitab/ihya/3/202");
  if (isMobile) await page.getByRole("button", { name: "Daftar isi" }).first().click();
  const tree = isMobile
    ? page.getByRole("dialog").getByRole("treegrid", { name: "Daftar isi kitab" })
    : page.getByRole("complementary").getByRole("treegrid", { name: "Daftar isi kitab" });
  const current = tree.locator('a[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAttribute("href", SUB_202);
  await expect(current).toBeVisible();
});

test("daftar isi desktop: gulir bersambung 3/201 → 3/202 membuka cabang subjudul aktif; cabang yang ditutup pembaca tetap tertutup selama baris aktif sama", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "panel daftar isi samping hanya di desktop");
  await gotoWithFullToc(page, "/kitab/ihya/3/201");
  const tree = page.getByRole("complementary").getByRole("treegrid", { name: "Daftar isi kitab" });
  // Di 3/201 bagian aktif = node kitab (subjudulnya belum mulai), cabangnya tertutup.
  await expect(tree.locator('a[aria-current="page"]')).toHaveAttribute("href", /#bab-\d+$/);
  await expect(tree.locator(`a[href="${SUB_202}"]`)).toHaveCount(0);

  await readContinued(page, 3, 202);
  const current = tree.locator('a[aria-current="page"]');
  await expect(current).toHaveAttribute("href", SUB_202);
  await expect(current).toBeVisible();

  // Pembaca menutup cabang induknya; 3/203 masih di subjudul yang sama, jadi tidak dibuka paksa.
  const parent = tree.locator('[role="row"]:has([data-stem-accent])').first();
  await parent.locator("button.toc-chevron").click();
  await expect(tree.locator(`a[href="${SUB_202}"]`)).toHaveCount(0);
  await readContinued(page, 3, 203);
  await expect(tree.locator(`a[href="${SUB_202}"]`)).toHaveCount(0);
});

test("daftar isi desktop: pindah ke bagian saudara (1/147 → 1/148) membuka lagi induk yang ditutup pembaca", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "panel daftar isi samping hanya di desktop");
  await gotoWithFullToc(page, "/kitab/ihya/1/147");
  const tree = page.getByRole("complementary").getByRole("treegrid", { name: "Daftar isi kitab" });
  const current = tree.locator('a[aria-current="page"]');
  await expect(current).toHaveAttribute("href", /\/1\/147#bab-100048$/);
  // Tutup induk bersama (leluhurnya tidak berubah saat pindah ke saudara 100049).
  await tree
    .locator('[role="row"]:has([data-stem-accent])')
    .first()
    .locator("button.toc-chevron")
    .click();
  await expect(current).toHaveCount(0);
  await readContinued(page, 1, 148);
  await expect(current).toHaveAttribute("href", /\/1\/148#bab-100049$/);
  await expect(current).toBeVisible();
});

test("daftar isi ponsel: sheet yang dibuka saat membaca halaman sambungan menyorot subjudulnya", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "sheet daftar isi ponsel");
  await page.goto("/kitab/ihya/3/201");
  await page.waitForLoadState("load");
  await readContinued(page, 3, 202);
  // Tombol Daftar isi ada di toolbar atas halaman; klik biasa Playwright menggulir ke sana (dan
  // halaman terbaca kembali ke 3/201). Aktivasi virtual (seperti pembaca layar) membuka sheet tanpa
  // menggulir, jadi yang diuji: sheet yang baru dipasang membaca halaman terbaca terakhir.
  await page.getByRole("button", { name: "Daftar isi" }).first().dispatchEvent("click");
  await expect(page).toHaveURL(/\/kitab\/ihya\/3\/202$/);
  const tree = page.getByRole("dialog").getByRole("treegrid", { name: "Daftar isi kitab" });
  const current = tree.locator('a[aria-current="page"]');
  await expect(current).toHaveAttribute("href", SUB_202);
  await expect(current).toBeVisible();
});

test("kaki halaman menurut halamannya sendiri: j1/200 tanpa tanda perlu ditinjau, j1/201 bertanda", async ({
  page,
}) => {
  await page.goto("/kitab/ihya/1/200");
  const review = /pemeriksaan otomatis saat impor/;
  // Kaki halaman pertama tepat di bawah teksnya (bukan di kaki artikel sesudah halaman sambungan).
  const first = page.locator("article > footer[data-page-foot]");
  await expect(first).toHaveCount(1);
  await expect(first).toContainText(/belum ditinjau manusia/);
  await expect(first).not.toContainText(review);
  await readContinued(page, 1, 201);
  const foot = page.locator('section[data-continued="1/201"] [data-page-foot]');
  await expect(foot).toContainText(review);
  await expect(foot).toContainText(/belum ditinjau manusia/);
  // Urutan: kaki halaman 200 sebelum halaman sambungan 201.
  expect(
    await first.evaluate(
      (el) =>
        el.compareDocumentPosition(document.querySelector('section[data-continued="1/201"]')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ),
  ).toBeTruthy();
  // Kaki artikel hanya sumber + lisensi + laporan.
  await expect(page.locator("article > footer:not([data-page-foot])")).not.toContainText(
    /belum ditinjau manusia/,
  );
});

test("rincian label tinjauan menempel di dekat lencananya dan tetap di dalam layar 375 px", async ({
  page,
}) => {
  // Tanpa bergantung pada korpus (Preview/produksi belum punya tinjauan manusia): lencana + popover
  // bermarkup sama dengan AiBadge disisipkan ke halaman pembaca nyata, jadi CSS globals.css teruji.
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/kitab/ihya/1/200");
  // Sisipkan sesudah hidrasi (React membuang node asing saat hidrasi).
  await page.waitForLoadState("networkidle");
  const supported = await page.evaluate(() => CSS.supports("position-area", "bottom"));
  const detail =
    "Terjemahan AI ini dikoreksi Ust. Uji Lc. pada 22 Oktober 2026. Kata dalam kurung siku [ … ] adalah tambahan penerjemah.";
  await page.evaluate((text) => {
    // Wadah sendiri di dalam kolom teks (bukan di dalam paragraf yang dikelola React).
    const host = document.createElement("div");
    host.className = "passage-translation";
    host.id = "uji-wadah";
    // Metode Node (bukan `Element.after`/`append`): tipe Element di repo bertabrakan dengan HTMLRewriter.
    const first = document.querySelector(".passage")!;
    first.parentNode!.insertBefore(host, first.nextSibling);
    for (const [id, align] of [
      ["uji-kiri", "start"],
      ["uji-kanan", "end"],
    ] as const) {
      const row = document.createElement("span");
      row.style.cssText = `display:flex;justify-content:flex-${align}`;
      const button = document.createElement("button");
      button.className = "ai-badge ai-badge-review";
      button.type = "button";
      button.textContent = "Terjemahan AI · dikoreksi Ust. Uji";
      button.setAttribute("popovertarget", id);
      button.id = `${id}-lencana`;
      const pop = document.createElement("span");
      pop.className = "tr-review-popover";
      pop.id = id;
      pop.setAttribute("popover", "auto");
      pop.setAttribute("role", "note");
      pop.textContent = text;
      row.appendChild(button);
      row.appendChild(pop);
      host.appendChild(row);
    }
  }, detail);
  await expect(page.locator("#uji-kanan-lencana")).toBeAttached();

  for (const id of ["uji-kiri", "uji-kanan"]) {
    const badge = page.locator(`#${id}-lencana`);
    const pop = page.locator(`#${id}`);
    // Lencana di tengah layar: rincian tepat di bawahnya, selebar mungkin di dalam layar.
    await badge.evaluate((el) => {
      const r = el.getBoundingClientRect();
      window.scrollBy(0, r.top - window.innerHeight / 3);
    });
    await badge.click();
    await expect(pop).toBeVisible();
    let b = (await badge.boundingBox())!;
    let p = (await pop.boundingBox())!;
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x + p.width).toBeLessThanOrEqual(375);
    // Tidak menyempit di lencana dekat tepi kanan (teks panjang mengisi lebar maksimum).
    expect(p.width).toBeGreaterThan(300);
    if (supported) {
      expect(p.y).toBeGreaterThanOrEqual(b.y + b.height);
      expect(p.y - (b.y + b.height)).toBeLessThan(16);
    }
    await page.keyboard.press("Escape");
    await expect(pop).toBeHidden();

    // Lencana dekat dasar layar: rincian pindah ke atasnya, tidak terpotong.
    await badge.evaluate((el) => {
      const r = el.getBoundingClientRect();
      window.scrollBy(0, r.bottom - window.innerHeight + 8);
    });
    await badge.click();
    await expect(pop).toBeVisible();
    b = (await badge.boundingBox())!;
    p = (await pop.boundingBox())!;
    expect(p.y + p.height).toBeLessThanOrEqual(740);
    if (supported) expect(p.y + p.height).toBeLessThanOrEqual(b.y);
    await page.keyboard.press("Escape");
  }
});
