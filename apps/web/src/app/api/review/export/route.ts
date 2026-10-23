import { getReviews, listAnswerLogs } from "@surau/db";
import { getEnv } from "../../../../lib/cloudflare";
import { REVIEW_HEADERS, reviewIdentity, reviewRoomAllowed } from "../../../../lib/review-auth";

/** JSONL privat, halaman 50 jawaban. Jangan tautkan ekspor ini di laporan publik. */
export async function GET(request: Request) {
  const env = await getEnv();
  const identity = await reviewIdentity(request.headers.get("cf-access-jwt-assertion"), env);
  if (!identity)
    return Response.json({ error: "unauthorized" }, { status: 401, headers: REVIEW_HEADERS });
  if (!reviewRoomAllowed(identity, "jawaban", env))
    return Response.json({ error: "forbidden_role" }, { status: 403, headers: REVIEW_HEADERS });
  const offset = Number(new URL(request.url).searchParams.get("offset") ?? "0");
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000)
    return Response.json({ error: "invalid" }, { status: 400, headers: REVIEW_HEADERS });
  const rows = await listAnswerLogs(env.APP_DB, new Date().toISOString(), offset);
  const output = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      reviews: (await getReviews(env.APP_DB, r.id)).map(
        ({ reviewer_key: _key, ...review }) => review,
      ),
    })),
  );
  return new Response(output.map((r) => JSON.stringify(r)).join("\n") + "\n", {
    headers: {
      ...REVIEW_HEADERS,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Content-Disposition": `attachment; filename="surau-review-${offset}.jsonl"`,
      "X-Next-Offset": rows.length === 50 ? String(offset + 50) : "",
    },
  });
}
