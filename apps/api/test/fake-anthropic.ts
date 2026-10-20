// Anthropic tiruan untuk tes Worker Jawab: klien SDK ASLI (`createAnthropic`) dengan `fetch` palsu,
// jadi parsing JSON dan SSE (termasuk `citations_delta`) ikut teruji. Tidak ada jaringan.
import type Anthropic from "@anthropic-ai/sdk";
import { createAnthropic } from "@surau/llm";

export interface SentDocument {
  title: string;
  blocks: string[];
}
export interface SentRequest {
  model: string;
  kind: "route" | "answer";
  body: Record<string, unknown>;
  documents: SentDocument[];
}

export interface FakeBlock {
  text: string;
  /** Sitasi content_block_location: dokumen + rentang blok; `cited` mengganti cited_text. */
  cite?: { doc: number; from: number; to: number; cited?: string }[];
}
export type FakeAnswer =
  | {
      blocks: FakeBlock[];
      stop?: "end_turn" | "refusal" | "max_tokens";
      /** Jeda sebelum respons datang (uji klien memutus koneksi saat menunggu model). */
      delayMs?: number;
    }
  | { status: number }
  /** `fetch` gagal tanpa respons HTTP (koneksi putus/timeout): status galat = null. */
  | { throws: true }
  /** Stream yang tidak pernah selesai sampai request dibatalkan (uji abort klien). */
  | { hold: true };
export type FakeRoute =
  | { sections: number[]; queries: string[]; hadith: boolean }
  | { status: number };

const usage = {
  input_tokens: 1000,
  output_tokens: 100,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

function sse(events: Record<string, unknown>[]): string {
  return events.map((e) => `event: ${String(e.type)}\ndata: ${JSON.stringify(e)}\n\n`).join("");
}

function answerStream(
  model: string,
  a: { blocks: FakeBlock[]; stop?: string },
  docs: SentDocument[],
) {
  const events: Record<string, unknown>[] = [
    {
      type: "message_start",
      message: {
        id: "msg_t",
        type: "message",
        role: "assistant",
        model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage,
      },
    },
  ];
  a.blocks.forEach((b, index) => {
    events.push({
      type: "content_block_start",
      index,
      content_block: { type: "text", text: "", citations: b.cite ? [] : null },
    });
    events.push({
      type: "content_block_delta",
      index,
      delta: { type: "text_delta", text: b.text },
    });
    for (const c of b.cite ?? []) {
      const doc = docs[c.doc];
      events.push({
        type: "content_block_delta",
        index,
        delta: {
          type: "citations_delta",
          citation: {
            type: "content_block_location",
            cited_text: c.cited ?? (doc ? doc.blocks.slice(c.from, c.to).join("") : "x"),
            document_index: c.doc,
            document_title: doc?.title ?? null,
            file_id: null,
            start_block_index: c.from,
            end_block_index: c.to,
          },
        },
      });
    }
    events.push({ type: "content_block_stop", index });
  });
  events.push({
    type: "message_delta",
    delta: {
      stop_reason: a.stop ?? "end_turn",
      stop_sequence: null,
      ...(a.stop === "refusal"
        ? { stop_details: { type: "refusal", category: "general_harms", explanation: null } }
        : {}),
    },
    usage: { output_tokens: 120 },
  });
  events.push({ type: "message_stop" });
  return new Response(sse(events), { headers: { "content-type": "text/event-stream" } });
}

/**
 * `route` dan `answer` dipanggil berurutan per jenis request (indeks percobaan). Fungsi answer
 * menerima dokumen yang dikirim pipeline supaya sitasi bisa menunjuk dokumen yang benar.
 */
export function fakeAnthropic(handlers: {
  route: (n: number) => FakeRoute;
  answer: (n: number, docs: SentDocument[], model: string) => FakeAnswer;
}): { client: Anthropic; sent: SentRequest[] } {
  const sent: SentRequest[] = [];
  let routes = 0;
  let answers = 0;
  const fake: typeof fetch = async (_input, init) => {
    const body = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as Record<
      string,
      unknown
    >;
    const model = String(body.model);
    const messages = body.messages as { content: unknown }[];
    const content = Array.isArray(messages[0]?.content)
      ? (messages[0]?.content as Record<string, unknown>[])
      : [];
    const documents: SentDocument[] = content
      .filter((b) => b.type === "document")
      .map((d) => ({
        title: String(d.title),
        blocks: ((d.source as { content: { text: string }[] }).content ?? []).map((b) => b.text),
      }));
    const isRoute = (body.output_config as { format?: unknown } | undefined)?.format !== undefined;
    sent.push({ model, kind: isRoute ? "route" : "answer", body, documents });
    if (isRoute) {
      const r = handlers.route(routes++);
      if ("status" in r)
        return Response.json(
          { type: "error", error: { type: "api_error", message: "x" } },
          { status: r.status },
        );
      return Response.json({
        id: "msg_r",
        type: "message",
        role: "assistant",
        model,
        content: [{ type: "text", text: JSON.stringify(r), citations: null }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage,
      });
    }
    const a = handlers.answer(answers++, documents, model);
    if ("throws" in a) throw new TypeError("koneksi putus (tiruan)");
    if ("status" in a)
      return Response.json(
        { type: "error", error: { type: "overloaded_error", message: "x" } },
        { status: a.status },
      );
    if ("hold" in a) {
      const signal = init?.signal;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          signal?.addEventListener("abort", () =>
            controller.error(new DOMException("dibatalkan", "AbortError")),
          );
        },
      });
      return new Response(body, { headers: { "content-type": "text/event-stream" } });
    }
    if (a.delayMs !== undefined) await new Promise((r) => setTimeout(r, a.delayMs));
    return answerStream(model, a, documents);
  };
  return { client: createAnthropic("kunci-uji", { fetch: fake, maxRetries: 0 }), sent };
}

/** Indeks dokumen yang isinya (gabungan blok) sama dengan `text`. */
export function docIndex(docs: SentDocument[], text: string): number {
  const i = docs.findIndex((d) => d.blocks.join("") === text);
  if (i < 0) throw new Error("dokumen tidak dikirim");
  return i;
}

/** Baca seluruh SSE menjadi daftar {event, data}. */
export async function readSse(res: Response): Promise<{ event: string; data: unknown }[]> {
  const text = await res.text();
  return text
    .split("\n\n")
    .filter((chunk) => chunk.includes("event:"))
    .map((chunk) => {
      const event = /^event: (.*)$/mu.exec(chunk)?.[1] ?? "";
      const data = chunk
        .split("\n")
        .filter((l) => l.startsWith("data: "))
        .map((l) => l.slice(6))
        .join("\n");
      return { event, data: JSON.parse(data) as unknown };
    });
}
