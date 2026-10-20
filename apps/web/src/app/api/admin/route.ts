import { budgetPeriod, setBudgetCap, setFeedbackStatus, setSetting } from "@surau/db";
import { adminAction } from "../../../lib/admin-action";
import { adminOverview } from "../../../lib/admin-data";
import { getEnv } from "../../../lib/cloudflare";
import { REVIEW_HEADERS, adminIdentity, reviewSameOrigin } from "../../../lib/review-auth";

// /api/admin (S20, ADR-065): data dan aksi /admin. Dilindungi Cloudflare Access (`Surau Admin`, T-14)
// di tepi DAN validasi JWT di sini (AUD admin; token penilai /tinjau ditolak). Mutasi: Origin sama,
// JSON ≤4 KB, skema Zod. Tidak ada aksi yang membaca atau menampilkan teks pertanyaan pengguna.

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: REVIEW_HEADERS });

async function identity(request: Request) {
  const env = await getEnv();
  return { env, id: await adminIdentity(request.headers.get("cf-access-jwt-assertion"), env) };
}

export async function GET(request: Request) {
  const { env, id } = await identity(request);
  if (!id) return json({ error: "unauthorized" }, 401);
  return json(await adminOverview(env.APP_DB));
}

export async function POST(request: Request) {
  const { env, id } = await identity(request);
  if (!id) return json({ error: "unauthorized" }, 401);
  if (!reviewSameOrigin(request)) return json({ error: "forbidden_origin" }, 403);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json"))
    return json({ error: "unsupported_media_type" }, 415);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 4096) return json({ error: "too_large" }, 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = adminAction.safeParse(raw);
  if (!parsed.success) return json({ error: "invalid" }, 400);
  const a = parsed.data;
  const at = new Date();
  const now = at.toISOString();
  const db = env.APP_DB;
  if (a.action === "jawab_enabled") await setSetting(db, "jawab_enabled", a.value ? "1" : "0", now);
  else if (a.action === "budget") await setBudgetCap(db, a.usd, budgetPeriod(at), now);
  else if (a.action === "quota") {
    await setSetting(db, "quota_anon_daily", String(a.anon), now);
    await setSetting(db, "quota_ip_daily", String(a.ip), now);
  } else if (!(await setFeedbackStatus(db, a.id, a.status, now)))
    return json({ error: "not_found" }, 404);
  // Hanya jenis aksi yang dicatat (tanpa nilai atau identitas).
  console.info(JSON.stringify({ event: "admin_action", action: a.action }));
  return json(await adminOverview(db, at));
}
