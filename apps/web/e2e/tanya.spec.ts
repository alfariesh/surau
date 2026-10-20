import { expect, test } from "@playwright/test";

// /tanya (S21). Di Preview, Jawab memakai surau-api-staging dengan sakelar staging biasanya MATI,
// jadi tes ini tidak bergantung pada LLM: label, komposer, dan arahan ke Cari bila tidak tersedia.

test("Tanya: label asisten riset, komposer, privasi, dan arahan ke Cari bila Jawab tidak tersedia", async ({
  page,
}) => {
  await page.goto("/tanya");
  await expect(page.getByRole("heading", { level: 1, name: "Tanya kitab" })).toBeVisible();
  await expect(page.getByText("Surau adalah asisten riset, bukan pemberi fatwa.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Pertanyaan" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kebijakan privasi" })).toHaveAttribute(
    "href",
    "/privasi",
  );
  // Status Jawab dimuat dari /api/jawab; bila tidak tersedia, komposer mati dan ada tautan Cari.
  const unavailable = page.getByText(
    /Tanya (sedang dimatikan|belum siap|belum dibuka)|Anggaran AI|Kuota pertanyaan/,
  );
  const submit = page.getByRole("button", { name: "Tanya", exact: true });
  await expect(unavailable.or(submit)).toBeVisible();
  if (await unavailable.isVisible()) {
    await expect(page.getByRole("link", { name: "Cari di Surau" }).first()).toHaveAttribute(
      "href",
      /^\/cari/,
    );
    await expect(page.getByRole("textbox", { name: "Pertanyaan" })).toBeDisabled();
  }
});

test("Privasi dan transparansi biaya tampil", async ({ page }) => {
  await page.goto("/privasi");
  await expect(page.getByRole("heading", { level: 1, name: "Kebijakan privasi" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lama penyimpanan" })).toBeVisible();
  await page.goto("/transparansi");
  await expect(page.getByRole("heading", { level: 1, name: "Transparansi biaya" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Biaya AI untuk Tanya" })).toBeVisible();
});

test("API kutipan menolak rentang tidak sah dan tidak pernah mengarang teks", async ({
  request,
}) => {
  expect((await request.get("/api/kutipan?r=abc")).status()).toBe(400);
  const res = await request.get("/api/kutipan?r=999999999:0:10");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ items: [null] });
});
