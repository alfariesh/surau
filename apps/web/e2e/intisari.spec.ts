import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./hidrasi";
import type { Page } from "@playwright/test";

// Intisari (X16, ADR-097): halaman Intisari, hub, dan jejaknya di pembaca. Dua lapis:
// 1. Fixture `/dev/intisari` (data buatan, tanpa D1; ada di `next dev` dan Preview, 404 di produksi):
//    struktur, label AI, Dasar teks, kutipan, dalil, Uji pemahaman, tanda sudah dibaca, axe.
// 2. Data korpus (Preview = staging): bila korpus belum punya Intisari (skema < 9 atau sebelum X15b
//    memuat pilot), hub 404 dan pembaca tanpa lencana/tautan Intisari; bila sudah, teks Arab setiap
//    kartu kutipan dibandingkan dengan `/api/kutipan` (salinan DB) dan setiap gagasan wajib punya
//    Dasar teks. Teks kitab tidak disalin ke sini.

const FIXTURE = "/dev/intisari";
const HUB = "/kitab/ihya/intisari";

async function openFixture(page: Page, path = FIXTURE) {
  const res = await page.goto(path);
  test.skip(res?.status() === 404, "halaman fixture tidak tersedia di lingkungan ini (produksi)");
}

test.describe("fixture /dev/intisari", () => {
  test("label AI, gagasan bernomor dengan Dasar teks, kutipan Arab, dalil, penutup", async ({
    page,
  }) => {
    await openFixture(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Kitab Uji");
    await expect(page.locator(".ai-badge", { hasText: "Intisari AI" }).first()).toBeVisible();
    await expect(page.locator("[data-intisari-meta]")).toContainText(
      "Dibuat Claude Sonnet 5.5 (digest-book@1)",
    );
    const points = page.locator("li[id^='gagasan-']");
    await expect(points).toHaveCount(3);
    for (const point of await points.all()) {
      const basis = point.locator("a[data-basis]");
      expect(await basis.count()).toBeGreaterThan(0);
      await expect(basis.first()).toHaveAttribute("href", /#p\d+$/);
    }
    const quote = page.locator("[data-quote-range] blockquote").first();
    await expect(quote).toHaveAttribute("lang", "ar");
    await expect(quote).toHaveAttribute("dir", "rtl");
    // Chip dalil membawa ke daftar Dalil di halaman yang sama.
    await page.locator("a.intisari-chip[href='#dalil-hadits-1']").click();
    await expect(page.locator("#dalil-hadits-1")).toBeInViewport();
    await expect(page.locator("#dalil-hadits-1")).toContainText(
      "dikenali otomatis dari teks takhrij, belum ditinjau",
    );
    await expect(page.getByRole("link", { name: "Baca teks lengkap" })).toHaveAttribute(
      "href",
      "/kitab/uji/bab/9900001",
    );
  });

  test("Uji pemahaman terlipat; membuka pertanyaan menunjukkan gagasan yang menjawabnya", async ({
    page,
  }) => {
    await openFixture(page);
    const question = page.locator("details.intisari-question").first();
    await expect(question).not.toHaveAttribute("open");
    await expect(question.getByText("Jawabannya di gagasan 1")).toBeHidden();
    await question.locator("summary").click();
    await expect(question.getByText("Jawabannya di gagasan 1")).toBeVisible();
    await question.getByRole("link", { name: "Baca gagasannya" }).click();
    await expect(page.locator("#gagasan-1")).toBeInViewport();
  });

  test("tata letak Bab tanpa pembuka/penutup; sampai di akhir = tanda sudah dibaca di browser ini", async ({
    page,
  }) => {
    await openFixture(page, `${FIXTURE}?tier=section`);
    await expect(page.getByRole("heading", { name: "Yang dibahas" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Lanjut ke teks lengkap" })).toBeVisible();
    await page.getByRole("heading", { name: "Lanjut ke teks lengkap" }).scrollIntoViewIfNeeded();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("surau:intisari:read:v1")))
      .toBe("[9900002]");
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`tanpa pelanggaran a11y (${scheme === "light" ? "terang" : "gelap"}) + urutan heading`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await openFixture(page);
      await expect(page.locator("html")).toHaveClass(new RegExp(scheme));
      const wcag = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(wcag.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
      const order = await new AxeBuilder({ page }).withRules(["heading-order"]).analyze();
      expect(order.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
    });
  }
});

interface TocNode {
  id: number;
  kind: "node" | "sub";
  digest?: { minutes: number };
  children: TocNode[];
}

/** Node berintisari menurut pohon daftar isi lengkap (lencana `digest`, X16); kosong = belum ada. */
async function digestNodes(page: Page): Promise<number[]> {
  const res = await page.request.get("/kitab/ihya/daftar-isi.json");
  expect(res.ok()).toBe(true);
  const { items } = (await res.json()) as { items: TocNode[] };
  const flat = (list: TocNode[]): TocNode[] => list.flatMap((n) => [n, ...flat(n.children)]);
  return flat(items).flatMap((n) => (n.kind === "node" && n.digest ? [n.id] : []));
}

test.describe("data korpus", () => {
  test("tanpa Intisari: hub 404, pembaca dan halaman karya tanpa lencana atau tautan Intisari", async ({
    page,
  }) => {
    test.skip((await digestNodes(page)).length > 0, "korpus sudah punya Intisari: tes berikutnya");
    expect((await page.request.get(HUB)).status()).toBe(404);
    await page.goto("/kitab/ihya/1/200");
    await expect(page.locator("[data-intisari-teaser]")).toHaveCount(0);
    await expect(page.locator(".toc-intisari")).toHaveCount(0);
    await page.goto("/kitab/ihya");
    await expect(page.locator(`a[href='${HUB}']`)).toHaveCount(0);
  });

  test("dengan Intisari: kutipan Arab = salinan DB (/api/kutipan), setiap gagasan punya Dasar teks, label AI", async ({
    page,
  }) => {
    const nodes = await digestNodes(page);
    test.skip(nodes.length === 0, "korpus belum punya Intisari (X15b langkah 9)");
    // Tombol hub di halaman karya ada tepat bila hub tidak 404.
    await page.goto("/kitab/ihya");
    const hubLinks = await page.locator(`a[href='${HUB}']`).count();
    expect((await page.request.get(HUB)).status()).toBe(hubLinks > 0 ? 200 : 404);
    await page.goto(`/kitab/ihya/bab/${nodes[0]}/intisari`);
    await expect(page.locator(".ai-badge", { hasText: "Intisari AI" }).first()).toBeVisible();
    await expect(page.locator("[data-intisari-meta]")).toContainText("Dibuat ");
    for (const point of await page.locator("li[id^='gagasan-']").all()) {
      await expect(point.locator("a[data-basis]").first()).toHaveAttribute("href", /#p\d+$/);
    }
    for (const card of await page.locator("[data-quote-range]").all()) {
      const range = await card.getAttribute("data-quote-range");
      const res = await page.request.get(`/api/kutipan?r=${range}`);
      expect(res.ok(), `/api/kutipan ${range}`).toBe(true);
      const body = (await res.json()) as { items: ({ text: string } | null)[] };
      expect(await card.locator("blockquote").textContent()).toBe(body.items[0]?.text);
    }
  });
});
