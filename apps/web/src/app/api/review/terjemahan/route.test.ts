import { beforeEach, expect, test, vi } from "vite-plus/test";
import { reviewIdentity } from "../../../../lib/review-auth";
import {
  saveTranslationDecision,
  translationQueue,
  translationReviewItem,
} from "../../../../lib/translation-review";
import { GET as answerGET, POST as answerPOST } from "../route";
import { GET as exportGET } from "../export/route";
import { GET as takhrijGET } from "../takhrij/route";
import { GET, POST } from "./route";

// Peran ruang tinjau (X08, ADR-081) dengan kunci uji: akun editor terjemahan terdaftar, akun
// penilai jawaban (belum terdaftar = akses lama), dan tanpa token.
const EDITOR = "e".repeat(64);
const ANSWER_REVIEWER = "b".repeat(64);
const BOTH = "c".repeat(64);
const EDITORS = JSON.stringify([
  { key: EDITOR, name: "Uji", prefix: "Ust.", ustadz: true, mcp_name: true },
  { key: BOTH, name: "Ganda", ustadz: false, mcp_name: false, also: ["jawaban", "takhrij"] },
]);

vi.mock("../../../../lib/cloudflare", () => ({
  getEnv: async () => ({ APP_DB: {}, CORPUS_DB: {}, TRANSLATION_EDITORS: EDITORS }),
}));
vi.mock("../../../../lib/review-auth", async (original) => ({
  ...(await original<typeof import("../../../../lib/review-auth")>()),
  reviewIdentity: vi.fn<typeof reviewIdentity>(),
}));
vi.mock("../../../../lib/translation-review", async (original) => ({
  ...(await original<typeof import("../../../../lib/translation-review")>()),
  translationQueue: vi.fn<typeof translationQueue>(),
  translationReviewItem: vi.fn<typeof translationReviewItem>(),
  saveTranslationDecision: vi.fn<typeof saveTranslationDecision>(),
}));
vi.mock("@surau/db", async (original) => ({
  ...(await original<typeof import("@surau/db")>()),
  listAnswerLogs: vi.fn<typeof import("@surau/db").listAnswerLogs>(async () => []),
}));

const url = "https://surau.example/api/review/terjemahan";
const body = {
  action: "revise",
  passage_id: 12,
  base_sha256: "a".repeat(64),
  active_id: null,
  text: "Terjemahan perbaikan.",
  reason: "Istilah",
};
const post = (data: unknown = body, origin = "https://surau.example") =>
  new Request(url, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(data),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(reviewIdentity).mockResolvedValue(EDITOR);
  vi.mocked(translationQueue).mockResolvedValue({ items: [] } as unknown as Awaited<
    ReturnType<typeof translationQueue>
  >);
  vi.mocked(saveTranslationDecision).mockResolvedValue({ ok: true, id: 1 });
});

test("tanpa token Access: 401 di semua ruang", async () => {
  vi.mocked(reviewIdentity).mockResolvedValue(null);
  expect((await GET(new Request(url))).status).toBe(401);
  expect((await POST(post())).status).toBe(401);
  expect((await answerGET(new Request("https://surau.example/api/review"))).status).toBe(401);
  expect((await takhrijGET(new Request("https://surau.example/api/review/takhrij"))).status).toBe(
    401,
  );
  expect(saveTranslationDecision).not.toHaveBeenCalled();
});

test("akun Access sah yang tidak terdaftar tidak bisa membaca/menyimpan koreksi, walau mengetik nama", async () => {
  vi.mocked(reviewIdentity).mockResolvedValue(ANSWER_REVIEWER);
  expect((await GET(new Request(url))).status).toBe(403);
  const res = await POST(post({ ...body, author_name: "Ust. Uji" }));
  expect(res.status).toBe(403);
  expect(await res.json()).toEqual({ error: "not_registered" });
  expect(saveTranslationDecision).not.toHaveBeenCalled();
  // Penilai jawaban tetap memakai ruang jawaban (akses lama).
  expect((await answerGET(new Request("https://surau.example/api/review"))).status).toBe(200);
});

test("token editor terjemahan tidak bisa membaca atau menilai jawaban eval (403)", async () => {
  const answerUrl = "https://surau.example/api/review";
  expect((await answerGET(new Request(answerUrl))).status).toBe(403);
  expect(
    (
      await answerPOST(
        new Request(answerUrl, {
          method: "POST",
          headers: { origin: "https://surau.example", "content-type": "application/json" },
          body: "{}",
        }),
      )
    ).status,
  ).toBe(403);
  expect((await exportGET(new Request(`${answerUrl}/export`))).status).toBe(403);
  expect((await takhrijGET(new Request(`${answerUrl}/takhrij`))).status).toBe(403);
  // Akun yang didaftarkan dengan ruang tambahan boleh keduanya.
  vi.mocked(reviewIdentity).mockResolvedValue(BOTH);
  expect((await answerGET(new Request(answerUrl))).status).toBe(200);
  expect((await GET(new Request(url))).status).toBe(200);
});

test("POST: Origin persis, skema ketat, galat dipetakan ke kode HTTP", async () => {
  expect((await POST(post(body, "https://lain.example"))).status).toBe(403);
  expect((await POST(post({ ...body, reason: "" }))).status).toBe(400);
  expect((await POST(post({ ...body, extra: 1 }))).status).toBe(400);
  expect(saveTranslationDecision).not.toHaveBeenCalled();
  const ok = await POST(post());
  expect(ok.status).toBe(200);
  expect(ok.headers.get("cache-control")).toContain("no-store");
  expect(vi.mocked(saveTranslationDecision).mock.calls[0]?.[1]).toMatchObject({
    short: "Ust. Uji",
    role: "ustadz",
  });
  for (const [error, status] of [
    ["conflict", 409],
    ["limit", 429],
    ["not_found", 404],
    ["unchanged", 400],
    ["not_allowed", 409],
  ] as const) {
    vi.mocked(saveTranslationDecision).mockResolvedValue({ ok: false, error });
    expect((await POST(post())).status).toBe(status);
  }
  vi.mocked(saveTranslationDecision).mockResolvedValue({
    ok: false,
    error: "invalid_text",
    issues: [{ code: "placeholder_missing", detail: "⟦QS 1:2⟧" }],
  });
  const invalid = await POST(post());
  expect(invalid.status).toBe(422);
  expect(await invalid.json()).toMatchObject({ issues: [{ code: "placeholder_missing" }] });
  const big = new Request(url, {
    method: "POST",
    headers: { origin: "https://surau.example", "content-type": "application/json" },
    body: JSON.stringify({ ...body, text: "x".repeat(41000) }),
  });
  expect((await POST(big)).status).toBe(413);
});

test("GET: filter/offset/rujukan divalidasi", async () => {
  expect((await GET(new Request(`${url}?filter=done&offset=20`))).status).toBe(200);
  expect(translationQueue).toHaveBeenCalledWith(expect.anything(), "done", 20);
  expect((await GET(new Request(`${url}?filter=semua`))).status).toBe(400);
  expect((await GET(new Request(`${url}?ref=bukan`))).status).toBe(400);
  vi.mocked(translationReviewItem).mockResolvedValue(null);
  expect((await GET(new Request(`${url}?ref=p2824`))).status).toBe(404);
  expect(translationReviewItem).toHaveBeenCalledWith(expect.anything(), 10002824);
});
