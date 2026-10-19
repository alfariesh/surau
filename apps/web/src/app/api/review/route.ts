import { getAnswerLog, listAnswerLogs, reviewInput, saveReview } from "@surau/db";
import { getEnv } from "../../../lib/cloudflare";
import { REVIEW_HEADERS, reviewIdentity, reviewSameOrigin } from "../../../lib/review-auth";
import { reviewItem } from "../../../lib/review-data";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: REVIEW_HEADERS });
export async function GET(request: Request) {
  const env = await getEnv();
  const identity = await reviewIdentity(request.headers.get("cf-access-jwt-assertion"), env);
  if (!identity) return json({ error: "unauthorized" }, 401);
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
  if (!reviewSameOrigin(request)) return json({ error: "forbidden_origin" }, 403);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json"))
    return json({ error: "unsupported_media_type" }, 415);
  // Pembacaan streaming dibatasi: Content-Length saja tidak melindungi transfer chunked.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "invalid" }, 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 12000) {
      await reader.cancel();
      return json({ error: "too_large" }, 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.byteLength;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const input = reviewInput.safeParse(raw);
  if (!input.success) return json({ error: "invalid" }, 400);
  const now = new Date().toISOString();
  const row = await getAnswerLog(env.APP_DB, input.data.answer_id, now);
  if (!row) return json({ error: "not_found" }, 404);
  if ((await reviewItem(row, env.CORPUS_DB, env.APP_DB, identity)).stale)
    return json({ error: "stale_corpus" }, 409);
  const saved = await saveReview(env.APP_DB, input.data, identity, now);
  return saved ? json({ ok: true }) : json({ error: "stale_answer" }, 409);
}
