import { beforeEach, expect, test, vi } from "vite-plus/test";
import { reviewIdentity } from "../../../../lib/review-auth";
import {
  saveTakhrijDecision,
  takhrijQueue,
  takhrijReviewItem,
} from "../../../../lib/takhrij-queue";
import { GET, POST } from "./route";

vi.mock("../../../../lib/cloudflare", () => ({
  getEnv: async () => ({ APP_DB: {}, CORPUS_DB: {} }),
}));
vi.mock("../../../../lib/review-auth", async (original) => ({
  ...(await original<typeof import("../../../../lib/review-auth")>()),
  reviewIdentity: vi.fn<typeof reviewIdentity>(),
}));
vi.mock("../../../../lib/takhrij-queue", async (original) => ({
  ...(await original<typeof import("../../../../lib/takhrij-queue")>()),
  takhrijQueue: vi.fn<typeof takhrijQueue>(),
  takhrijReviewItem: vi.fn<typeof takhrijReviewItem>(),
  saveTakhrijDecision: vi.fn<typeof saveTakhrijDecision>(),
}));

const body = {
  passage_id: 12,
  rules_version: 1,
  label_hash: "a".repeat(64),
  reviewer_name: "Agent QA",
  decision: "corrected",
  kinds: ["daif"],
  note: "",
};
const url = "https://surau.example/api/review/takhrij";
const post = (data: unknown = body, origin = "https://surau.example") =>
  new Request(url, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(data),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(reviewIdentity).mockResolvedValue("b".repeat(64));
  vi.mocked(takhrijQueue).mockResolvedValue({ items: [] } as unknown as Awaited<
    ReturnType<typeof takhrijQueue>
  >);
  vi.mocked(saveTakhrijDecision).mockResolvedValue("ok");
});

test("tanpa identitas Access: tidak membaca atau menulis", async () => {
  vi.mocked(reviewIdentity).mockResolvedValue(null);
  expect((await GET(new Request(url))).status).toBe(401);
  expect((await POST(post())).status).toBe(401);
  expect(takhrijQueue).not.toHaveBeenCalled();
  expect(saveTakhrijDecision).not.toHaveBeenCalled();
});

test("GET: filter/offset/ID divalidasi; respons privat no-store", async () => {
  const ok = await GET(new Request(`${url}?filter=done&offset=20`));
  expect(ok.status).toBe(200);
  expect(ok.headers.get("cache-control")).toContain("no-store");
  expect(takhrijQueue).toHaveBeenCalledWith(expect.anything(), "done", 20);
  expect((await GET(new Request(`${url}?filter=semua`))).status).toBe(400);
  expect((await GET(new Request(`${url}?offset=-1`))).status).toBe(400);
  expect((await GET(new Request(`${url}?id=abc`))).status).toBe(400);
  vi.mocked(takhrijReviewItem).mockResolvedValue(null);
  expect((await GET(new Request(`${url}?id=12`))).status).toBe(404);
});

test("POST: Origin persis, skema ketat, label basi = 409", async () => {
  expect((await POST(post(body, "https://lain.example"))).status).toBe(403);
  expect((await POST(post({ ...body, kinds: null }))).status).toBe(400);
  expect((await POST(post({ ...body, kinds: ["bukan_istilah"] }))).status).toBe(400);
  expect((await POST(post({ ...body, extra: 1 }))).status).toBe(400);
  expect(saveTakhrijDecision).not.toHaveBeenCalled();
  expect((await POST(post())).status).toBe(200);
  vi.mocked(saveTakhrijDecision).mockResolvedValue("stale");
  expect((await POST(post())).status).toBe(409);
  vi.mocked(saveTakhrijDecision).mockResolvedValue("not_found");
  expect((await POST(post())).status).toBe(404);
  const big = new Request(url, {
    method: "POST",
    headers: { origin: "https://surau.example", "content-type": "application/json" },
    body: JSON.stringify({ ...body, note: "x".repeat(7000) }),
  });
  expect((await POST(big)).status).toBe(413);
});
