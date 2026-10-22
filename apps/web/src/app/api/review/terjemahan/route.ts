import { canUseTinjauRoom, parseTranslationEditors, translationRevisionInput } from "@surau/core";
import type { TranslationEditor } from "@surau/core";
import { getEnv } from "../../../../lib/cloudflare";
import { REVIEW_HEADERS, reviewIdentity, reviewSameOrigin } from "../../../../lib/review-auth";
import { readJsonBody } from "../../../../lib/review-body";
import {
  TR_QUEUE_FILTERS,
  resolvePassageRef,
  saveTranslationDecision,
  translationQueue,
  translationReviewItem,
} from "../../../../lib/translation-review";
import type { TrDeps, TrQueueFilter } from "../../../../lib/translation-review";

// Koreksi terjemahan (X08, ADR-081). Dilindungi Access `Surau Tinjau` (turunan /api/review) DAN
// verifikasi JWT di aplikasi (gagal tertutup di semua host, ADR-052), lalu peran: hanya akun yang
// kuncinya terdaftar di `TRANSLATION_EDITORS` (nama yang diketik tidak pernah dipakai).
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: REVIEW_HEADERS });

/** Teks ≤8.000 karakter (UTF-8 sampai 3 bait) + escape JSON + alasan. */
const BODY_MAX_BYTES = 40_000;

type EditorAuth =
  | { ok: false; response: Response }
  | { ok: true; editor: TranslationEditor; deps: TrDeps };

async function editorOf(request: Request): Promise<EditorAuth> {
  const env = await getEnv();
  const identity = await reviewIdentity(request.headers.get("cf-access-jwt-assertion"), env);
  if (!identity) return { ok: false, response: json({ error: "unauthorized" }, 401) };
  const editors = parseTranslationEditors(env.TRANSLATION_EDITORS);
  const editor = editors.get(identity);
  if (!canUseTinjauRoom(identity, "terjemahan", editors) || editor === undefined)
    return { ok: false, response: json({ error: "not_registered" }, 403) };
  return {
    ok: true,
    editor,
    deps: { corpus: env.CORPUS_DB, app: env.APP_DB, identity, now: new Date().toISOString() },
  };
}

export async function GET(request: Request) {
  const auth = await editorOf(request);
  if (!auth.ok) return auth.response;
  const query = new URL(request.url).searchParams;
  const ref = query.get("ref") ?? query.get("id");
  if (ref !== null) {
    const id = ref.length <= 300 ? resolvePassageRef(ref) : null;
    if (id === null) return json({ error: "invalid" }, 400);
    const item = await translationReviewItem(auth.deps, id);
    return item === null ? json({ error: "not_found" }, 404) : json(item);
  }
  const filter = query.get("filter") ?? "todo";
  const offset = Number(query.get("offset") ?? "0");
  if (
    !(TR_QUEUE_FILTERS as readonly string[]).includes(filter) ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 100000
  )
    return json({ error: "invalid" }, 400);
  return json(await translationQueue(auth.deps, filter as TrQueueFilter, offset));
}

const STATUS = {
  not_found: 404,
  conflict: 409,
  limit: 429,
  not_allowed: 409,
  unchanged: 400,
  invalid_text: 422,
} as const;

export async function POST(request: Request) {
  const auth = await editorOf(request);
  if (!auth.ok) return auth.response;
  if (!reviewSameOrigin(request)) return json({ error: "forbidden_origin" }, 403);
  const body = await readJsonBody(request, BODY_MAX_BYTES);
  if (!body.ok) return json({ error: body.error }, body.status);
  const input = translationRevisionInput.safeParse(body.value);
  if (!input.success) return json({ error: "invalid" }, 400);
  const saved = await saveTranslationDecision(auth.deps, auth.editor, input.data);
  if (!saved.ok)
    return json({ error: saved.error, issues: saved.issues ?? [] }, STATUS[saved.error]);
  // Hanya jenis aksi yang dicatat (tanpa teks, nama, atau identitas).
  console.info(JSON.stringify({ event: "translation_revision", action: input.data.action }));
  return json({ ok: true, id: saved.id });
}
