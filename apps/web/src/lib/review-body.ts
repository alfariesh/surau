// Pembacaan body JSON POST ruang tinjau (/api/review, /api/review/takhrij): JSON saja, dibatasi
// saat streaming (Content-Length saja tidak melindungi transfer chunked).
export type JsonBody =
  | { ok: true; value: unknown }
  | {
      ok: false;
      status: 400 | 413 | 415;
      error: "invalid" | "too_large" | "unsupported_media_type" | "invalid_json";
    };

export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBody> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json"))
    return { ok: false, status: 415, error: "unsupported_media_type" };
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400, error: "invalid" };
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return { ok: false, status: 413, error: "too_large" };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.byteLength;
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, status: 400, error: "invalid_json" };
  }
}
