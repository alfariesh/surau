import { expect, test } from "@playwright/test";

// Penundaan skrip di Worker (ADR-123): hanya berlaku bila e2e berjalan terhadap Worker (Preview CI,
// `BASE_URL` diisi). `next dev` lokal tidak melewati worker.ts, jadi tes ini dilewati di sana.
test.skip(!process.env.BASE_URL, "butuh Worker (BASE_URL), bukan next dev");

test("HTML halaman kitab: skrip async Next dipindah ke pemuat yang menunggu CSS", async ({
  request,
}) => {
  const res = await request.get("/kitab/ihya/1/200");
  expect(res.ok()).toBe(true);
  const html = await res.text();
  const head = html.slice(0, html.indexOf("</head>"));
  expect(head).not.toMatch(/<script[^>]*src="\/_next\/static\/[^"]*"[^>]*\sasync/);
  expect(head).toContain(`querySelectorAll('link[rel="stylesheet"]')`);
  expect(head).toMatch(/"src":"\/_next\/static\/[^"]+\.js"/);
  // RSC navigasi klien tidak ditulis ulang.
  const rsc = await request.get("/kitab/ihya/1/200", { headers: { RSC: "1" } });
  expect(rsc.headers()["content-type"] ?? "").not.toContain("text/html");
});
