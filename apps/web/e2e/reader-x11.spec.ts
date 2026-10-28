import { expect, test } from "./hidrasi";
import type { Locator, Page } from "@playwright/test";

// Mode baca (X11, ADR-091): Arab · Keduanya untuk pembaca, daftar isi, Cari, dan menu ⋮. Butuh D1
// berisi Ihya (lokal: korpus build atau `pnpm dev:remote`; Preview: staging). Teks kitab tidak
// disalin ke sini: yang diperiksa atribut, struktur, dan posisi.

const PAGE = "/kitab/ihya/1/200";
const TEXT = { name: "Teks kitab", exact: true } as const;

async function setMode(page: Page, mode: "ar" | "both" | "tr", extra: Record<string, string> = {}) {
  await page.addInitScript(
    ({ mode, extra }) => {
      try {
        localStorage.setItem("surau:read-mode", mode);
        for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
      } catch {}
    },
    { mode, extra },
  );
}

/** Buka menu ⋮ navbar; mengembalikan grup pilihan mode baca di dalamnya. */
async function openMenu(page: Page) {
  await page.getByRole("button", { name: "Menu lainnya" }).click();
  const group = page.getByRole("radiogroup", { name: "Mode baca" });
  await expect(group).toBeVisible();
  return group;
}

/** Pilih mode baca lewat menu ⋮ navbar. */
async function pickFromMenu(page: Page, label: "Arab" | "Keduanya" | "Terjemahan") {
  const group = await openMenu(page);
  await group.getByRole("radio", { name: label }).click();
  await page.keyboard.press("Escape");
  await expect(group).toBeHidden();
}

/** Tunggu posisi elemen diam (animasi lembar panel/popover selesai) sebelum mengukurnya. */
async function settled(locator: Locator) {
  await expect
    .poll(() =>
      locator.evaluate(
        (el) =>
          new Promise<boolean>((resolve) => {
            const a = el.getBoundingClientRect().top;
            requestAnimationFrame(() =>
              requestAnimationFrame(() => resolve(el.getBoundingClientRect().top === a)),
            );
          }),
      ),
    )
    .toBe(true);
}

test("mode Arab dan sakelar lama terpasang di <html> walau JS Next tidak dimuat", async ({
  page,
}) => {
  await page.goto(PAGE);
  await page.evaluate(() => localStorage.setItem("surau:read-mode", "ar"));
  await page.route(/\/_next\/static\/.*\.js(\?|$)/, (route) => route.abort());
  await page.goto(PAGE, { waitUntil: "domcontentloaded" });
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-read-mode", "ar");
  const text = page.getByRole("region", TEXT);
  await expect(text.locator(".passage-translation").first()).toBeHidden();
  await expect(text.locator(".ai-notice")).toBeHidden();

  // Pengguna lama: "Tampilkan terjemahan AI" mati → mode Arab, kunci lama dipindah lalu dihapus.
  await page.evaluate(() => {
    localStorage.removeItem("surau:read-mode");
    localStorage.setItem("surau:reader-translation", "0");
  });
  await page.goto(PAGE, { waitUntil: "domcontentloaded" });
  await expect(html).toHaveAttribute("data-read-mode", "ar");
  expect(
    await page.evaluate(() => [
      localStorage.getItem("surau:read-mode"),
      localStorage.getItem("surau:reader-translation"),
    ]),
  ).toEqual(["ar", null]);
});

test("mode Arab menyembunyikan terjemahan dan semua bantuan terjemahan (regresi sakelar lama)", async ({
  page,
  isMobile,
}) => {
  await setMode(page, "ar");
  await page.goto(PAGE);
  const text = page.getByRole("region", TEXT);
  await expect(text.locator(".passage-translation").first()).toBeHidden();
  await expect(text.locator(".ai-notice")).toBeHidden();
  // Sakelar lama tidak menyembunyikan ini: ringkasan AI, kaki AI, judul Indonesia.
  for (const aid of await page.locator("[data-tr-aid]").all()) await expect(aid).toBeHidden();
  await expect(page.locator("[data-reader-title] .ai-badge")).toBeHidden();
  if (!isMobile) {
    const toc = page.getByRole("complementary", { name: "Daftar isi" });
    await expect(toc.locator(".toc-title-id").first()).toBeHidden();
    await expect(toc.locator(".toc-title-ar").first()).toBeVisible();
  }
  // Teks Arab tetap utuh.
  await expect(text.locator(".passage .arabic-text").first()).toBeVisible();
});

test("pilihan mode baca dari panel Tampilan bertahan sesudah muat ulang; kontrol terjemahan nonaktif", async ({
  page,
}) => {
  await page.goto(PAGE);
  await page
    .getByRole("group", { name: "Alat baca" })
    .getByRole("button", { name: "Tampilan" })
    .click();
  const panel = page.getByRole("dialog", { name: "Tampilan baca" });
  const group = panel.getByRole("radiogroup", { name: "Mode baca" });
  await expect(group).toBeVisible();
  await settled(group);
  const top = await group.evaluate((el) => el.getBoundingClientRect().top);
  await group.getByRole("radio", { name: "Arab" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-read-mode", "ar");
  await settled(group);
  // Pilihan tidak bergeser di bawah jari (pratinjau dan keterangan setinggi tetap).
  expect(
    Math.abs((await group.evaluate((el) => el.getBoundingClientRect().top)) - top),
  ).toBeLessThan(1);
  await expect(panel.getByRole("button", { name: /Tata letak terjemahan/ })).toBeDisabled();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-read-mode", "ar");
});

test("ganti mode dari menu ⋮: paragraf yang sedang dibaca tidak bergeser (≤ 2 px)", async ({
  page,
}) => {
  await page.goto(PAGE);
  const text = page.getByRole("region", TEXT);
  await expect(text.locator(".passage").nth(4)).toBeVisible();
  for (const label of ["Arab", "Keduanya", "Terjemahan", "Keduanya"] as const) {
    // Paragraf kelima di sekitar sepertiga atas layar.
    await text
      .locator(".passage")
      .nth(4)
      .evaluate((el) => {
        el.scrollIntoView({ block: "start" });
        window.scrollBy({ top: -120, behavior: "instant" });
      });
    // Diukur sesudah menu terbuka (klik alat uji bisa menggulir tombol navbar ke tengah layar).
    const group = await openMenu(page);
    await settled(group);
    // Jangkar = paragraf pertama yang mulai di bawah navbar (lib/keep-position.ts).
    const anchor = await page.evaluate(() => {
      const el = [...document.querySelectorAll(".reader-text .passage")].find(
        (p) => p.getBoundingClientRect().top >= 63,
      );
      return el === undefined ? null : { id: el.id, top: el.getBoundingClientRect().top };
    });
    expect(anchor).not.toBeNull();
    // Klik lewat DOM (bukan gerak tetikus alat uji): yang diukur hanya perubahan mode. Fokus dulu
    // di dalam menu, supaya Escape sesudahnya menutup menu.
    const radio = group.getByRole("radio", { name: label });
    await radio.focus();
    await radio.dispatchEvent("click");
    const html = page.locator("html");
    if (label === "Arab") await expect(html).toHaveAttribute("data-read-mode", "ar");
    else if (label === "Terjemahan") await expect(html).toHaveAttribute("data-read-mode", "tr");
    else await expect(html).not.toHaveAttribute("data-read-mode");
    const after = await page
      .locator(`#${anchor!.id}`)
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(after - anchor!.top)).toBeLessThanOrEqual(2);
    await page.keyboard.press("Escape");
    await expect(group).toBeHidden();
  }
});

test("berdampingan: paragraf tanpa terjemahan selebar penuh; mode Arab tanpa grid (regresi)", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "tata letak berdampingan hanya di kolom teks lebar");
  await page.setViewportSize({ width: 1600, height: 1000 });
  await setMode(page, "both", { "surau:reader-tr-layout": "side" });
  // j3/368 #p15425: satu dari paragraf yang belum punya terjemahan (laporan terjemahan; sesudah
  // terjemahan ulang X21 tinggal 5 paragraf, ditolak validator tiga kali). Bila ia kelak
  // diterjemahkan, ganti ke paragraf lain dari daftar "Belum lolos" di laporan terjemahan.
  await page.goto("/kitab/ihya/3/368");
  const untranslated = page.locator(".reader-text .passage[data-no-tr]:not(.passage-heading)");
  await expect(untranslated.first()).toBeVisible();
  const column = await page
    .locator(".reader-text")
    .first()
    .evaluate((el) => el.clientWidth);
  const arWidth = await untranslated
    .first()
    .locator(".arabic-text")
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(arWidth).toBeGreaterThan(column * 0.9);
  const translated = page.locator(".reader-text .passage:not([data-no-tr]):not(.passage-heading)");
  await expect(translated.first()).toHaveCSS("display", "grid");

  await pickFromMenu(page, "Arab");
  await expect(translated.first()).toHaveCSS("display", "flex");
});

for (const setup of [
  { name: "mode Arab", mode: "ar" as const, extra: {} as Record<string, string> },
  {
    name: "Keduanya + Dilipat",
    mode: "both" as const,
    extra: { "surau:reader-tr-layout": "fold" },
  },
]) {
  test(`kata cari Indonesia di teks tersembunyi dibuka dan tersorot (${setup.name}, regresi)`, async ({
    page,
  }) => {
    await setMode(page, setup.mode, setup.extra);
    await page.goto(`${PAGE}?q=${encodeURIComponent("malam jumat")}#p2826`);
    const target = page.locator("#p2826");
    await expect(target.locator(".passage-translation-body")).toBeVisible();
    await expect(target).toHaveAttribute("data-tr-peek", "");
    // Sorotan ada di teks yang kini terlihat; paragraf tujuan tetap di tempat lompatannya.
    expect(await page.evaluate(() => CSS.highlights.get("surau-cari")?.size ?? 0)).toBeGreaterThan(
      0,
    );
    const top = await target.evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(top - 80)).toBeLessThanOrEqual(2);
  });
}

test("halaman sambungan gulir bersambung ikut mode Arab", async ({ page }) => {
  await setMode(page, "ar");
  await page.goto(PAGE);
  const next = page.getByRole("region", { name: "Halaman sambungan, juz 1 halaman 201" });
  await expect(async () => {
    await page.mouse.wheel(0, 4000);
    await expect(next).toBeAttached({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });
  await expect(next.locator(".passage .arabic-text").first()).toBeVisible();
  await expect(next.locator(".passage-translation").first()).toBeHidden();
});

test("kartu Cari di mode Arab: terjemahan hanya bila jalur terjemahan yang cocok", async ({
  page,
}) => {
  await setMode(page, "ar");
  await page.goto(`/cari?q=${encodeURIComponent("الصبر")}`);
  const cards = page.locator("li[data-keep-position]");
  await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  await expect(cards.first().locator(".search-snippet").first()).toBeVisible();
  await expect(cards.locator('[lang="id"]:not(.bg-surface-secondary)')).toHaveCount(0);

  await page.goto("/cari?q=sabar");
  await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  const first = cards.first();
  await expect(first.getByText(/Cocok di terjemahan AI/).first()).toBeVisible();
  await expect(first.locator('[lang="id"]').first()).toBeVisible();
  // Menu ⋮ di Cari ikut menampilkan mode baca.
  await page.getByRole("button", { name: "Menu lainnya" }).click();
  await expect(page.getByRole("radiogroup", { name: "Mode baca" })).toBeVisible();
});

test("daftar isi di mode Arab: nama baris = judul Arab yang terlihat, bukan judul Indonesia (regresi)", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "panel daftar isi samping hanya di desktop");
  await page.goto(PAGE);
  const toc = page.getByRole("complementary", { name: "Daftar isi" });
  const titleId = (await toc.locator(".toc-title-id").first().textContent())?.trim() ?? "";
  expect(titleId.length).toBeGreaterThan(3);
  await expect(toc.getByRole("row", { name: titleId, exact: true })).toHaveCount(1);
  await pickFromMenu(page, "Arab");
  await expect(toc.getByRole("row", { name: titleId, exact: true })).toHaveCount(0);
  const titleAr = (await toc.locator(".toc-title-ar").first().textContent())?.trim() ?? "";
  await expect(toc.getByRole("row", { name: titleAr, exact: true })).toHaveCount(1);
});

test("ganti mode di Cari: kartu yang sedang dibaca tidak bergeser (≤ 2 px)", async ({ page }) => {
  await setMode(page, "both");
  await page.goto(`/cari?q=${encodeURIComponent("الصبر")}`);
  const cards = page.locator("li[data-keep-position]");
  await expect(cards.nth(4)).toBeVisible({ timeout: 15_000 });
  await cards.nth(4).evaluate((el) => {
    el.scrollIntoView({ block: "start" });
    window.scrollBy({ top: -120, behavior: "instant" });
  });
  const group = await openMenu(page);
  await settled(group);
  const anchor = await page.evaluate(() => {
    const el = [...document.querySelectorAll("li[data-keep-position]")].find(
      (c) => c.getBoundingClientRect().top >= 63,
    );
    return el === undefined
      ? null
      : {
          index: [...document.querySelectorAll("li[data-keep-position]")].indexOf(el),
          top: el.getBoundingClientRect().top,
        };
  });
  expect(anchor).not.toBeNull();
  const radio = group.getByRole("radio", { name: "Arab" });
  await radio.focus();
  await radio.dispatchEvent("click");
  await expect(page.locator("html")).toHaveAttribute("data-read-mode", "ar");
  // Terjemahan kartu di atasnya benar-benar hilang (kueri Arab), jadi tanpa jaga posisi kartu melompat.
  await expect(cards.locator('[lang="id"]:not(.bg-surface-secondary)')).toHaveCount(0);
  const after = await cards.nth(anchor!.index).evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(after - anchor!.top)).toBeLessThanOrEqual(2);
});

// --- Mode Terjemahan (bagian B) ---

test("mode Terjemahan: Arab tiap paragraf terlipat dan dibuka per paragraf; ⋮ tetap terjangkau", async ({
  page,
}) => {
  await setMode(page, "tr");
  await page.goto(PAGE);
  const passage = page.locator("#p2824");
  await expect(passage.locator(".passage-translation-body")).toBeVisible();
  await expect(passage.locator(".passage-ar")).toBeHidden();
  const toggle = passage.getByRole("button", { name: "Teks Arab" });
  await expect(async () => {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
  }).toPass();
  await expect(passage.locator(".passage-ar")).toBeVisible();
  // ⋮ di baris alat (yang di dalam teks Arab tidak digandakan).
  const actions = passage.getByRole("button", { name: /Aksi paragraf/ });
  await expect(actions).toHaveCount(1);
  await expect(actions).toBeVisible();
  await actions.click();
  await expect(page.getByRole("menuitem", { name: "Salin sitasi paragraf" })).toBeVisible();
  await page.keyboard.press("Escape");
  await toggle.click();
  await expect(passage.locator(".passage-ar")).toBeHidden();
  // Judul tidak pernah dilipat.
  await expect(page.locator(".passage-heading .reader-heading").first()).toBeVisible();
});

test("mode Terjemahan: paragraf tanpa terjemahan menampilkan teks Arab dengan keterangan", async ({
  page,
}) => {
  await setMode(page, "tr");
  await page.goto("/kitab/ihya/3/368#p15425");
  const passage = page.locator("#p15425");
  await expect(passage.locator(".arabic-text")).toBeVisible();
  await expect(passage.locator(".no-tr-note")).toBeVisible();
  await expect(passage.locator(".passage-tools")).toHaveCount(0);
});

test("mode Terjemahan: kata cari Arab di teks yang terlipat membuka Arab paragraf itu", async ({
  page,
}) => {
  await setMode(page, "tr");
  // Tanpa #pN (yang sendiri sudah membuka Arab paragraf tujuannya): yang diuji penyorot kata cari.
  await page.goto(`${PAGE}?q=${encodeURIComponent("الجمعة")}`);
  await expect
    .poll(() => page.evaluate(() => CSS.highlights.get("surau-cari")?.size ?? 0))
    .toBeGreaterThan(0);
  const opened = page.locator(".reader-text .passage[data-ar-open]");
  await expect(opened.first()).toBeVisible();
  await expect(opened.first().locator(".passage-ar").first()).toBeVisible();
  await expect(opened.first().getByRole("button", { name: "Teks Arab" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
});

test("mode Terjemahan: salinan terjemahan tetap berlabel AI", async ({
  page,
  context,
  baseURL,
  isMobile,
}) => {
  test.skip(isMobile, "seleksi teks dengan mouse");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await setMode(page, "tr");
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

test("mode Terjemahan di Cari: terjemahan lebih dulu, potongan Arab tetap tampil", async ({
  page,
}) => {
  await setMode(page, "tr");
  await page.goto(`/cari?q=${encodeURIComponent("الصبر")}`);
  const card = page.locator("li[data-keep-position]").first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  const order = await card.evaluate((el) => {
    const hit = el.querySelector(".search-snippet")!.parentElement!;
    return [...hit.children].map((c) =>
      c.classList.contains("search-snippet") ? "arabic" : c.getAttribute("lang") ? "tr" : "other",
    );
  });
  expect(order.indexOf("tr")).toBeGreaterThanOrEqual(0);
  expect(order.indexOf("tr")).toBeLessThan(order.indexOf("arabic"));
});

test("menu ⋮ di Maknaz menampilkan mode baca", async ({ page }) => {
  await page.goto("/tanya");
  await page.getByRole("button", { name: "Menu lainnya" }).click();
  await expect(page.getByRole("radiogroup", { name: "Mode baca" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Terjemahan" })).toBeVisible();
});

test("mode Terjemahan: permalink #pN dan tautan balik catatan kaki membuka Arab paragrafnya", async ({
  page,
}) => {
  await setMode(page, "tr");
  await page.goto(`${PAGE}#p2826`);
  await expect(page.locator("#p2826")).toHaveAttribute("data-ar-open", "");
  await expect(page.locator("#p2826 .passage-ar")).toBeVisible();
  // Tautan "kembali ke teks" dari daftar catatan kaki menuju penanda di dalam Arab yang terlipat.
  const back = page.locator(".reader-footnotes a[href^='#ref-']").first();
  const href = (await back.getAttribute("href")) ?? "";
  const owner = await page.evaluate(
    (id) => document.getElementById(id)?.closest(".passage")?.id ?? null,
    href.slice(1),
  );
  expect(owner).not.toBeNull();
  if (owner !== "p2826") {
    await expect(page.locator(`#${owner} .passage-ar`)).toBeHidden();
  }
  await back.click();
  await expect(page.locator(`#${owner}`)).toHaveAttribute("data-ar-open", "");
  await expect(page.locator(href)).toBeVisible();
});

test("mode Terjemahan: teks Arab yang dibuka tersalin apa adanya (tanpa label tombol)", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(isMobile, "seleksi teks dengan mouse");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await setMode(page, "tr");
  await page.goto(PAGE);
  const passage = page.locator("#p2824");
  const toggle = passage.getByRole("button", { name: "Teks Arab" });
  await expect(async () => {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
  }).toPass();
  const arabic = passage.locator(".passage-ar");
  const expected = await arabic.evaluate((el) => (el as HTMLElement).innerText.trim());
  await arabic.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.press("ControlOrMeta+c");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.trim()).toBe(expected);
  expect(copied).not.toContain("Teks Arab");
});
