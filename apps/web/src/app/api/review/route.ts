import { getAnswerLog, listAnswerLogs, reviewInput, saveReview } from "@surau/db";
import { getEnv } from "../../../lib/cloudflare";
import {
  REVIEW_HEADERS,
  reviewIdentity,
  reviewRoomAllowed,
  reviewSameOrigin,
} from "../../../lib/review-auth";
import { readJsonBody } from "../../../lib/review-body";
import { reviewItem } from "../../../lib/review-data";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: REVIEW_HEADERS });
export async function GET(request: Request) {
  const env = await getEnv();
  const identity = await reviewIdentity(request.headers.get("cf-access-jwt-assertion"), env);
  if (!identity) return json({ error: "unauthorized" }, 401);
  // Akun editor terjemahan tidak otomatis menilai jawaban eval (X08, ADR-081).
  if (!reviewRoomAllowed(identity, "jawaban", env)) return json({ error: "forbidden_role" }, 403);
  const query = new URL(request.url).searchParams;
  const id = query.get("id");
  if (id) {
    const row = await getAnswerLog(env.APP_DB, id, new Date().toISOString());
    if (!row) return json({ error: "not_found" }, 404);
    return json(await reviewItem(row, env.CORPUS_DB, env.APP_DB, identity));
  }
  const offset = Number(query.get("offset") ?? "0");
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000)
    return json({ error: "invalid" }, 400);
  const rows = await listAnswerLogs(env.APP_DB, new Date().toISOString(), offset);
  return json({
    items: rows.map((r) => ({
      id: r.id,
      question_id: r.question_id,
      run_id: r.run_id,
      created_at: r.created_at,
    })),
    next: rows.length === 50 ? offset + 50 : null,
  });
}

export async function POST(request: Request) {
  const env = await getEnv();
  const identity = await reviewIdentity(request.headers.get("cf-access-jwt-assertion"), env);
  if (!identity) return json({ error: "unauthorized" }, 401);
  if (!reviewRoomAllowed(identity, "jawaban", env)) return json({ error: "forbidden_role" }, 403);
  if (!reviewSameOrigin(request)) return json({ error: "forbidden_origin" }, 403);
  const body = await readJsonBody(request, 12000);
  if (!body.ok) return json({ error: body.error }, body.status);
  const input = reviewInput.safeParse(body.value);
  if (!input.success) return json({ error: "invalid" }, 400);
  const now = new Date().toISOString();
  const row = await getAnswerLog(env.APP_DB, input.data.answer_id, now);
  if (!row) return json({ error: "not_found" }, 404);
  if ((await reviewItem(row, env.CORPUS_DB, env.APP_DB, identity)).stale)
    return json({ error: "stale_corpus" }, 409);
  const saved = await saveReview(env.APP_DB, input.data, identity, now);
  return saved ? json({ ok: true }) : json({ error: "stale_answer" }, 409);
}
