import { beforeEach, expect, test, vi } from "vite-plus/test";
import { adminIdentity } from "../../../../lib/review-auth";
import {
  adminRevertAuthorSince,
  adminRevertRevision,
  adminTranslationOverview,
} from "../../../../lib/translation-review";
import { GET, POST } from "./route";

vi.mock("../../../../lib/cloudflare", () => ({
  getEnv: async () => ({ APP_DB: {}, CORPUS_DB: {} }),
}));
vi.mock("../../../../lib/review-auth", async (original) => ({
  ...(await original<typeof import("../../../../lib/review-auth")>()),
  adminIdentity: vi.fn<typeof adminIdentity>(),
}));
vi.mock("../../../../lib/translation-review", async (original) => ({
  ...(await original<typeof import("../../../../lib/translation-review")>()),
  adminTranslationOverview: vi.fn<typeof adminTranslationOverview>(),
  adminRevertRevision: vi.fn<typeof adminRevertRevision>(),
  adminRevertAuthorSince: vi.fn<typeof adminRevertAuthorSince>(),
}));

const ORIGIN = "https://surau.example";
const URL_ = `${ORIGIN}/api/admin/terjemahan`;
const post = (data: unknown, origin = ORIGIN) =>
  new Request(URL_, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(data),
  });
const KEY = "b".repeat(64);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminIdentity).mockResolvedValue("c".repeat(64));
  vi.mocked(adminTranslationOverview).mockResolvedValue({
    recent: [],
    next_before: null,
    authors: [],
  });
  vi.mocked(adminRevertRevision).mockResolvedValue({ ok: true, id: 9 });
  vi.mocked(adminRevertAuthorSince).mockResolvedValue({ reverted: 2, skipped: 1, remaining: 0 });
});

test("tanpa identitas admin (mis. token penilai /tinjau): 401, tidak membaca/menulis", async () => {
  vi.mocked(adminIdentity).mockResolvedValue(null);
  expect((await GET(new Request(URL_))).status).toBe(401);
  expect((await POST(post({ action: "revert", id: 3 }))).status).toBe(401);
  expect(adminTranslationOverview).not.toHaveBeenCalled();
  expect(adminRevertRevision).not.toHaveBeenCalled();
});

test("batalkan satu revisi dan batalkan massal satu editor sejak tanggal", async () => {
  expect((await POST(post({ action: "revert", id: 3 }))).status).toBe(200);
  expect(vi.mocked(adminRevertRevision).mock.calls[0]?.[1]).toBe(3);
  vi.mocked(adminRevertRevision).mockResolvedValue({ ok: false, error: "conflict" });
  expect((await POST(post({ action: "revert", id: 3 }))).status).toBe(409);
  const res = await POST(post({ action: "revert_author", author_key: KEY, since: "2026-10-20" }));
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ result: { reverted: 2, skipped: 1 } });
  expect(vi.mocked(adminRevertAuthorSince).mock.calls[0]?.slice(1)).toEqual([
    KEY,
    "2026-10-20T00:00:00.000Z",
  ]);
});

test("validasi: Origin, kunci, tanggal, halaman", async () => {
  expect((await POST(post({ action: "revert", id: 3 }, "https://lain.example"))).status).toBe(403);
  for (const bad of [
    { action: "revert", id: 0 },
    { action: "revert_author", author_key: "x", since: "2026-10-20" },
    { action: "revert_author", author_key: KEY, since: "20-10-2026" },
    { action: "hapus", id: 3 },
  ])
    expect((await POST(post(bad))).status).toBe(400);
  expect((await GET(new Request(`${URL_}?before=abc`))).status).toBe(400);
  expect((await GET(new Request(`${URL_}?before=40`))).status).toBe(200);
  expect(vi.mocked(adminTranslationOverview).mock.calls.at(-1)?.[2]).toBe(40);
});
