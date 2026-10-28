import { expect, test } from "./hidrasi";

// /tanya (S21). Di Preview, Jawab memakai surau-api-staging dengan sakelar staging biasanya MATI,
// jadi tes ini tidak bergantung pada LLM: label, komposer, dan arahan ke Cari bila tidak tersedia.

test("Maknaz: label asisten riset, komposer, privasi, dan arahan ke Cari bila Jawab tidak tersedia", async ({
  page,
}) => {
  // Status Jawab dimuat klien dari GET /api/jawab sesudah hidrasi: tunggu jawabannya dulu supaya
  // cabang yang diuji ditentukan oleh status sebenarnya, bukan oleh waktu muat.
  const statusResponse = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/jawab" && r.request().method() === "GET",
  );
  await page.goto("/tanya");
  await expect(page.getByRole("heading", { level: 1, name: "Maknaz" })).toBeVisible();
  await expect(page.getByText("Surau adalah asisten riset, bukan pemberi fatwa.")).toBeVisible();
  const textbox = page.getByRole("textbox", { name: "Pertanyaan" });
  await expect(textbox).toBeVisible();
  await expect(page.getByRole("link", { name: "Kebijakan privasi" })).toHaveAttribute(
    "href",
    "/privasi",
  );
  const res = await statusResponse;
  const body = res.status() === 200 ? ((await res.json()) as { available?: boolean }) : null;
  const unavailable = res.status() === 404 || body?.available === false;
  const submit = page.getByRole("button", { name: "Tanya Maknaz", exact: true });
  if (unavailable) {
    // Produksi (rute mati → "belum dibuka") atau Preview (sakelar staging mati → "dimatikan").
    await expect(
      page.getByText(
        /Maknaz (sedang dimatikan|belum siap|belum dibuka)|Anggaran AI|Kuota pertanyaan/,
      ),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Cari di Surau" }).first()).toHaveAttribute(
      "href",
      /^\/cari/,
    );
    await expect(textbox).toBeDisabled();
    await expect(submit).toBeDisabled();
  } else {
    // Jawab menyala (atau status sementara tidak diketahui): komposer aktif, tombol menunggu teks.
    await expect(textbox).toBeEnabled();
    await expect(submit).toBeDisabled();
    await textbox.fill("Apa kata al-Ghazali tentang sabar?");
    await expect(submit).toBeEnabled();
  }
});

test("Privasi dan transparansi biaya tampil", async ({ page }) => {
  await page.goto("/privasi");
  await expect(page.getByRole("heading", { level: 1, name: "Kebijakan privasi" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lama penyimpanan" })).toBeVisible();
  await page.goto("/transparansi");
  await expect(page.getByRole("heading", { level: 1, name: "Transparansi biaya" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Biaya AI untuk Maknaz" })).toBeVisible();
});

test("API kutipan menolak rentang tidak sah dan tidak pernah mengarang teks", async ({
  request,
}) => {
  expect((await request.get("/api/kutipan?r=abc")).status()).toBe(400);
  const res = await request.get("/api/kutipan?r=999999999:0:10");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ items: [null] });
});
