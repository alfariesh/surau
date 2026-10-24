import { z } from "zod";
import { getEnv } from "../../../../lib/cloudflare";
import { REVIEW_HEADERS, adminIdentity, reviewSameOrigin } from "../../../../lib/review-auth";
import { readJsonBody } from "../../../../lib/review-body";
import {
  adminRevertAuthorSince,
  adminRevertRevision,
  adminTranslationOverview,
} from "../../../../lib/translation-review";

// /api/admin/terjemahan (X08, ADR-081): daftar koreksi terjemahan terbaru + batalkan (satu revisi,
// atau semua koreksi satu editor sejak tanggal tertentu). Hanya pemilik: Access `Surau Admin` di
// tepi DAN JWT AUD admin di sini (token penilai /tinjau ditolak). Mutasi: Origin sama, JSON ≤2 KB.
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: REVIEW_HEADERS });

const action = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("revert"), id: z.number().int().positive() }),
  z.strictObject({
    action: z.literal("revert_author"),
    author_key: z.string().regex(/^[a-f0-9]{64}$/u),
    since: z.iso.date(),
  }),
]);

async function admin(request: Request) {
  const env = await getEnv();
  return { env, id: await adminIdentity(request.headers.get("cf-access-jwt-assertion"), env) };
}

export async function GET(request: Request) {
  const { env, id } = await admin(request);
  if (!id) return json({ error: "unauthorized" }, 401);
  const before = new URL(request.url).searchParams.get("before");
  if (before !== null && !/^[1-9][0-9]{0,12}$/u.test(before))
    return json({ error: "invalid" }, 400);
  return json(
    await adminTranslationOverview(
      env.APP_DB,
      env.CORPUS_DB,
      before === null ? null : Number(before),
    ),
  );
}

export async function POST(request: Request) {
  const { env, id } = await admin(request);
  if (!id) return json({ error: "unauthorized" }, 401);
  if (!reviewSameOrigin(request)) return json({ error: "forbidden_origin" }, 403);
  const body = await readJsonBody(request, 2048);
  if (!body.ok) return json({ error: body.error }, body.status);
  const parsed = action.safeParse(body.value);
  if (!parsed.success) return json({ error: "invalid" }, 400);
  const deps = {
    corpus: env.CORPUS_DB,
    app: env.APP_DB,
    identity: id,
    now: new Date().toISOString(),
  };
  const a = parsed.data;
  // Hanya jenis aksi yang dicatat (tanpa teks, nama, atau identitas).
  console.info(JSON.stringify({ event: "admin_action", action: `translation_${a.action}` }));
  if (a.action === "revert") {
    const saved = await adminRevertRevision(deps, a.id);
    if (!saved.ok) return json({ error: saved.error }, saved.error === "not_found" ? 404 : 409);
    return json({ overview: await adminTranslationOverview(env.APP_DB, env.CORPUS_DB) });
  }
  const result = await adminRevertAuthorSince(deps, a.author_key, `${a.since}T00:00:00.000Z`);
  return json({ result, overview: await adminTranslationOverview(env.APP_DB, env.CORPUS_DB) });
}
