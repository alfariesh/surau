import { takhrijReviewInput } from "@surau/core";
import { getEnv } from "../../../../lib/cloudflare";
import { REVIEW_HEADERS, reviewIdentity, reviewSameOrigin } from "../../../../lib/review-auth";
import { readJsonBody } from "../../../../lib/review-body";
import {
  QUEUE_FILTERS,
  saveTakhrijDecision,
  takhrijQueue,
  takhrijReviewItem,
} from "../../../../lib/takhrij-queue";
import type { QueueFilter } from "../../../../lib/takhrij-queue";

// Antrean tinjauan label status hadits (X07, ADR-070). Dilindungi Access `Surau Tinjau` (turunan
// /api/review) DAN verifikasi JWT di aplikasi (gagal tertutup di semua host, ADR-052).
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: REVIEW_HEADERS });

export async function GET(request: Request) {
  const env = await getEnv();
  const identity = await reviewIdentity(request.headers.get("cf-access-jwt-assertion"), env);
  if (!identity) return json({ error: "unauthorized" }, 401);
  const deps = {
    corpus: env.CORPUS_DB,
    app: env.APP_DB,
    identity,
    now: new Date().toISOString(),
  };
  const query = new URL(request.url).searchParams;
  const id = query.get("id");
  if (id !== null) {
    if (!/^[1-9][0-9]{0,9}$/u.test(id)) return json({ error: "invalid" }, 400);
    const item = await takhrijReviewItem(deps, Number(id));
    return item === null ? json({ error: "not_found" }, 404) : json(item);
  }
  const filter = query.get("filter") ?? "todo";
  const offset = Number(query.get("offset") ?? "0");
  if (
    !(QUEUE_FILTERS as readonly string[]).includes(filter) ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 100000
  )
    return json({ error: "invalid" }, 400);
  return json(await takhrijQueue(deps, filter as QueueFilter, offset));
}

export async function POST(request: Request) {
  const env = await getEnv();
  const identity = await reviewIdentity(request.headers.get("cf-access-jwt-assertion"), env);
  if (!identity) return json({ error: "unauthorized" }, 401);
  if (!reviewSameOrigin(request)) return json({ error: "forbidden_origin" }, 403);
  const body = await readJsonBody(request, 6000);
  if (!body.ok) return json({ error: body.error }, body.status);
  const input = takhrijReviewInput.safeParse(body.value);
  if (!input.success) return json({ error: "invalid" }, 400);
  const saved = await saveTakhrijDecision(
    { corpus: env.CORPUS_DB, app: env.APP_DB, identity, now: new Date().toISOString() },
    input.data,
  );
  if (saved === "not_found") return json({ error: "not_found" }, 404);
  if (saved === "stale") return json({ error: "stale_label" }, 409);
  return json({ ok: true });
}
