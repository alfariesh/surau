import { beforeEach, expect, test, vi } from "vite-plus/test";
import { reviewIdentity } from "../../../lib/review-auth";
import { getAnswerLog, listAnswerLogs, saveReview } from "@surau/db";
import { reviewItem } from "../../../lib/review-data";
import { GET, POST } from "./route";
import { GET as exportReview } from "./export/route";
vi.mock("../../../lib/cloudflare", () => ({ getEnv: async () => ({ APP_DB: {}, CORPUS_DB: {} }) }));
vi.mock("../../../lib/review-auth", async (original) => ({
  ...(await original<typeof import("../../../lib/review-auth")>()),
  reviewIdentity: vi.fn<typeof reviewIdentity>(),
}));
vi.mock("../../../lib/review-data", () => ({ reviewItem: vi.fn<typeof reviewItem>() }));
vi.mock("@surau/db", async (original) => ({
  ...(await original<typeof import("@surau/db")>()),
  getAnswerLog: vi.fn<typeof getAnswerLog>(),
  listAnswerLogs: vi.fn<typeof listAnswerLogs>(),
  saveReview: vi.fn<typeof saveReview>(),
  getReviews: vi.fn<typeof import("@surau/db").getReviews>(async () => []),
}));
const body = {
  answer_id: "test_j001",
  answer_hash: "a".repeat(64),
  reviewer_name: "Agent QA",
  question_verdict: "approved",
  verdict: null,
  language_score: null,
  faithfulness: null,
  attribution: null,
  reason: "Fixture",
};
const post = (data: unknown = body, origin = "https://surau.example", type = "application/json") =>
  new Request("https://surau.example/api/review", {
    method: "POST",
    headers: { origin, "content-type": type },
    body: typeof data === "string" ? data : JSON.stringify(data),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(reviewIdentity).mockResolvedValue("b".repeat(64));
  vi.mocked(listAnswerLogs).mockResolvedValue([]);
  vi.mocked(getAnswerLog).mockResolvedValue({ id: body.answer_id } as Awaited<
    ReturnType<typeof getAnswerLog>
  >);
  vi.mocked(reviewItem).mockResolvedValue({ stale: false } as Awaited<
    ReturnType<typeof reviewItem>
  >);
  vi.mocked(saveReview).mockResolvedValue(true);
});
test("tidak terautentikasi tidak membaca atau menulis data, termasuk ekspor", async () => {
  vi.mocked(reviewIdentity).mockResolvedValue(null);
  for (const response of [
    await GET(new Request("https://preview.example/api/review")),
    await POST(post()),
    await exportReview(new Request("https://preview.example/api/review/export")),
  ]) {
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  }
  expect(getAnswerLog).not.toHaveBeenCalled();
  expect(listAnswerLogs).not.toHaveBeenCalled();
  expect(saveReview).not.toHaveBeenCalled();
});
test("Origin, tipe, ukuran, dan bentuk input diperiksa sebelum menulis", async () => {
  expect((await POST(post(body, "https://evil.example"))).status).toBe(403);
  expect((await POST(post(body, undefined, "text/plain"))).status).toBe(415);
  expect((await POST(post("x".repeat(12001)))).status).toBe(413);
  expect((await POST(post("{"))).status).toBe(400);
  expect((await POST(post({ ...body, verdict: "benar" }))).status).toBe(400);
  expect(saveReview).not.toHaveBeenCalled();
});
test("persistensi berhasil; korpus/hash lama memberi konflik", async () => {
  expect((await POST(post())).status).toBe(200);
  expect(saveReview).toHaveBeenCalledWith({}, body, "b".repeat(64), expect.any(String));
  vi.mocked(saveReview).mockResolvedValue(false);
  expect((await POST(post())).status).toBe(409);
  vi.mocked(reviewItem).mockResolvedValue({ stale: true } as Awaited<
    ReturnType<typeof reviewItem>
  >);
  expect((await POST(post())).status).toBe(409);
});
test("paginasi dibatasi dan ekspor tidak dapat di-cache", async () => {
  expect((await GET(new Request("https://surau.example/api/review?offset=-1"))).status).toBe(400);
  const response = await exportReview(new Request("https://surau.example/api/review/export"));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-disposition")).toContain("attachment");
});
