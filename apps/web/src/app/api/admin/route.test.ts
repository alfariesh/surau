import { beforeEach, expect, test, vi } from "vite-plus/test";
import { setBudgetCap, setFeedbackStatus, setQuotaLimits, setSetting } from "@surau/db";
import { adminIdentity } from "../../../lib/review-auth";
import { adminOverview } from "../../../lib/admin-data";
import { GET, POST } from "./route";

vi.mock("../../../lib/cloudflare", () => ({ getEnv: async () => ({ APP_DB: {} }) }));
vi.mock("../../../lib/review-auth", async (original) => ({
  ...(await original<typeof import("../../../lib/review-auth")>()),
  adminIdentity: vi.fn<typeof adminIdentity>(),
}));
vi.mock("../../../lib/admin-data", () => ({ adminOverview: vi.fn<typeof adminOverview>() }));
vi.mock("@surau/db", async (original) => ({
  ...(await original<typeof import("@surau/db")>()),
  setSetting: vi.fn<typeof setSetting>(),
  setBudgetCap: vi.fn<typeof setBudgetCap>(),
  setFeedbackStatus: vi.fn<typeof setFeedbackStatus>(),
  setQuotaLimits: vi.fn<typeof setQuotaLimits>(),
}));

const ORIGIN = "https://surau.example";
const post = (data: unknown, origin = ORIGIN, type = "application/json") =>
  new Request(`${ORIGIN}/api/admin`, {
    method: "POST",
    headers: { origin, "content-type": type },
    body: typeof data === "string" ? data : JSON.stringify(data),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminIdentity).mockResolvedValue("c".repeat(64));
  vi.mocked(adminOverview).mockResolvedValue({ ok: true } as unknown as Awaited<
    ReturnType<typeof adminOverview>
  >);
  vi.mocked(setFeedbackStatus).mockResolvedValue(true);
});

test("tanpa identitas admin: 401 tanpa membaca atau menulis apa pun", async () => {
  vi.mocked(adminIdentity).mockResolvedValue(null);
  for (const res of [
    await GET(new Request(`${ORIGIN}/api/admin`)),
    await POST(post({ action: "jawab_enabled", value: true })),
  ]) {
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  }
  expect(adminOverview).not.toHaveBeenCalled();
  expect(setSetting).not.toHaveBeenCalled();
});

test("Origin, tipe, ukuran, dan bentuk aksi diperiksa sebelum menulis", async () => {
  expect(
    (await POST(post({ action: "jawab_enabled", value: true }, "https://evil.example"))).status,
  ).toBe(403);
  expect(
    (await POST(post({ action: "jawab_enabled", value: true }, ORIGIN, "text/plain"))).status,
  ).toBe(415);
  expect((await POST(post("x".repeat(5000)))).status).toBe(413);
  expect((await POST(post("{"))).status).toBe(400);
  for (const bad of [
    { action: "jawab_enabled", value: "1" },
    { action: "budget", usd: -1 },
    { action: "budget", usd: 1.5 },
    { action: "quota", anon: 10 },
    { action: "feedback_status", id: 1, status: "hapus" },
    { action: "hapus_semua" },
  ])
    expect((await POST(post(bad))).status).toBe(400);
  expect(setSetting).not.toHaveBeenCalled();
  expect(setBudgetCap).not.toHaveBeenCalled();
});

test("aksi sah menulis pengaturan lalu mengembalikan ringkasan terbaru", async () => {
  expect((await POST(post({ action: "jawab_enabled", value: true }))).status).toBe(200);
  expect(setSetting).toHaveBeenCalledWith({}, "jawab_enabled", "1", expect.any(String));
  expect((await POST(post({ action: "budget", usd: 15 }))).status).toBe(200);
  expect(setBudgetCap).toHaveBeenCalledWith(
    {},
    15,
    expect.stringMatching(/^\d{4}-\d{2}$/u),
    expect.any(String),
  );
  expect((await POST(post({ action: "quota", anon: 5, ip: 20 }))).status).toBe(200);
  expect(setQuotaLimits).toHaveBeenCalledWith({}, { anon: 5, ip: 20 }, expect.any(String));
  const res = await POST(post({ action: "feedback_status", id: 3, status: "fixed" }));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  vi.mocked(setFeedbackStatus).mockResolvedValue(false);
  expect((await POST(post({ action: "feedback_status", id: 99, status: "fixed" }))).status).toBe(
    404,
  );
});
