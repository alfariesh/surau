// ElevenLabs Text-to-Speech lewat REST langsung (X17, ADR-097 butir 6; tanpa SDK npm). Docs dicek
// 2026-10-24 (elevenlabs.io/docs/llms.txt, api.elevenlabs.io/openapi.json):
// - POST /v1/text-to-speech/{voice_id}?output_format=mp3_44100_64, body {text, model_id, language_code,
//   previous_request_ids ≤ 3}; v4 ≤ 10.000 karakter per permintaan; stitching didukung v4 bila id
//   ≤ 2 jam dan permintaan sebelumnya sudah selesai. v4 tidak punya style/speed: tempo diatur pemutar.
// - Header respons `request-id`, `character-cost`. Galat {detail:{type,code,message,request_id}};
//   422 = detail[]. 429 concurrent_limit_exceeded/rate_limit_exceeded/system_busy (dan bentuk lama
//   too_many_concurrent_requests) belum diproses → diulang dengan jeda; 402 insufficient_credits.
// - GET /v1/user/subscription (character_count, character_limit), GET /v1/voices/{id}: butuh izin
//   kunci user_read/voices_read; kunci yang hanya berizin Text to Speech mendapat 401/403 → null.
// - Sorotan kalimat (X18, docs dicek 2026-10-25): POST …/{voice_id}/with-timestamps, body sama, respons
//   JSON {audio_base64, alignment|null, normalized_alignment|null}; `alignment` = waktu per karakter
//   teks yang DIKIRIM (normalized_alignment = teks sesudah normalisasi penyedia, tidak dipakai). Docs
//   tidak menyebut dukungan eleven_v4, jadi `alignment` null diterima (cadangan forced alignment).
//   POST /v1/forced-alignment multipart {file, text} → {characters[], words[{text,start,end,loss}],
//   loss}; bahasa Indonesia termasuk; ditagih seperti Speech to Text (per durasi audio).
// Kunci API tidak pernah dicetak.
import type { CharacterAlignment } from "../align.ts";
import type {
  Aligner,
  ForcedAlignment,
  Quota,
  SynthesisRequest,
  SynthesisResult,
  TtsCapabilities,
  TtsProvider,
  VoiceInfo,
} from "../provider.ts";
import { TtsError } from "../provider.ts";

export const ELEVENLABS_API = "https://api.elevenlabs.io";
export const ELEVENLABS_MODEL = "eleven_v4";
/** MP3 44,1 kHz 64 kbps (tersedia di paket Starter; 192 kbps butuh Creator+). */
export const ELEVENLABS_FORMAT = "mp3_44100_64";

const RETRY_CODES = new Set([
  "concurrent_limit_exceeded",
  "too_many_concurrent_requests",
  "rate_limit_exceeded",
  "system_busy",
]);

export interface ElevenLabsOptions {
  apiKey: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Batas waktu satu permintaan sintesis (ms). */
  timeoutMs?: number;
  /** Percobaan maksimal untuk galat yang pasti belum diproses. */
  attempts?: number;
}

interface ErrorBody {
  detail?: { type?: string; code?: string; status?: string; message?: string } | unknown[];
}

async function errorOf(res: Response): Promise<TtsError> {
  let code: string | null = null;
  let message = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as ErrorBody;
    const d = body.detail;
    if (Array.isArray(d)) {
      code = "validation_error";
      message = `validasi ditolak (${d.length} butir)`;
    } else if (d !== undefined && d !== null) {
      code = d.code ?? d.status ?? d.type ?? null;
      message = d.message ?? message;
    }
  } catch {
    // Badan bukan JSON: cukup status HTTP.
  }
  const retryable =
    res.status === 503 || (res.status === 429 && (code === null || RETRY_CODES.has(code)));
  // 5xx selain 503: belum pasti tidak diproses, jadi diperlakukan "mungkin tertagih" (ADR-061).
  const charged = res.status >= 500 && res.status !== 503 ? "unknown" : "no";
  return new TtsError(
    `ElevenLabs ${res.status}${code ? ` ${code}` : ""}: ${message}`,
    res.status,
    code,
    retryable,
    charged,
  );
}

/** Kemampuan eleven_v4 (dipakai juga `plan` tanpa kunci API). */
export const ELEVENLABS_CAPABILITIES: TtsCapabilities = {
  provider: "elevenlabs",
  model: ELEVENLABS_MODEL,
  outputFormat: ELEVENLABS_FORMAT,
  maxCharsPerRequest: 10_000,
  maxPreviousRequests: 3,
  previousRequestMaxAgeMs: 2 * 60 * 60 * 1000,
  inlineIpa: true,
  timestamps: true,
};

const numbers = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((n) => typeof n === "number");

/** `alignment` respons with-timestamps bila bentuknya utuh (panjang ketiga larik sama), selain itu null. */
export function characterAlignmentOf(v: unknown): CharacterAlignment | null {
  if (typeof v !== "object" || v === null) return null;
  const a = v as Record<string, unknown>;
  const chars = a.characters;
  const starts = a.character_start_times_seconds;
  const ends = a.character_end_times_seconds;
  if (
    !Array.isArray(chars) ||
    !chars.every((c) => typeof c === "string") ||
    !numbers(starts) ||
    !numbers(ends) ||
    starts.length !== chars.length ||
    ends.length !== chars.length
  ) {
    return null;
  }
  return {
    characters: chars as string[],
    character_start_times_seconds: starts,
    character_end_times_seconds: ends,
  };
}

export class ElevenLabs implements TtsProvider, Aligner {
  readonly capabilities: TtsCapabilities = ELEVENLABS_CAPABILITIES;
  readonly alignerName = "elevenlabs/forced-alignment";

  readonly #key: string;
  readonly #fetch: typeof fetch;
  readonly #sleep: (ms: number) => Promise<void>;
  readonly #timeoutMs: number;
  readonly #attempts: number;

  constructor(opts: ElevenLabsOptions) {
    if (opts.apiKey.trim() === "") throw new Error("ELEVENLABS_API_KEY kosong");
    this.#key = opts.apiKey;
    this.#fetch = opts.fetch ?? fetch;
    this.#sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.#timeoutMs = opts.timeoutMs ?? 180_000;
    this.#attempts = opts.attempts ?? 5;
  }

  #headers(extra: Record<string, string> = {}): Record<string, string> {
    return { "xi-api-key": this.#key, ...extra };
  }

  async synthesize(req: SynthesisRequest): Promise<SynthesisResult> {
    if (req.text.length > this.capabilities.maxCharsPerRequest) {
      throw new TtsError(
        `teks ${req.text.length} karakter > batas per permintaan`,
        null,
        "text_too_long",
        false,
        "no",
      );
    }
    const timestamps = req.timestamps === true;
    const url = `${ELEVENLABS_API}/v1/text-to-speech/${encodeURIComponent(req.voiceId)}${timestamps ? "/with-timestamps" : ""}?output_format=${ELEVENLABS_FORMAT}`;
    const body = JSON.stringify({
      text: req.text,
      model_id: ELEVENLABS_MODEL,
      language_code: req.languageCode,
      ...(req.previousRequestIds.length > 0
        ? {
            previous_request_ids: req.previousRequestIds.slice(
              -this.capabilities.maxPreviousRequests,
            ),
          }
        : {}),
    });
    for (let attempt = 1; ; attempt++) {
      let res: Response;
      try {
        res = await this.#fetch(url, {
          method: "POST",
          headers: this.#headers({
            "content-type": "application/json",
            accept: timestamps ? "application/json" : "audio/mpeg",
          }),
          body,
          signal: AbortSignal.timeout(this.#timeoutMs),
        });
      } catch (error) {
        // Putus di tengah jalan: server mungkin sudah memproses dan menagih. Jangan diulang.
        throw new TtsError(
          `permintaan ElevenLabs gagal tanpa jawaban (${error instanceof Error ? error.name : "galat"}); mungkin sudah tertagih`,
          null,
          "network",
          false,
          "unknown",
        );
      }
      if (res.ok) {
        const cost = res.headers.get("character-cost");
        const meta = {
          requestId: res.headers.get("request-id"),
          characterCost: cost === null || !/^\d+$/u.test(cost) ? null : Number(cost),
        };
        if (!timestamps) return { audio: new Uint8Array(await res.arrayBuffer()), ...meta };
        // 200 = tertagih: badan yang rusak tetap dikembalikan sebagai audio kosong (ditolak
        // penyambung sesudah tanda terima dicatat), bukan dilempar sebelum tanda terima.
        let body: { audio_base64?: unknown; alignment?: unknown } = {};
        try {
          body = (await res.json()) as typeof body;
        } catch {
          // Bukan JSON: audio kosong, alignment null.
        }
        return {
          audio:
            typeof body.audio_base64 === "string"
              ? new Uint8Array(Buffer.from(body.audio_base64, "base64"))
              : new Uint8Array(),
          alignment: characterAlignmentOf(body.alignment),
          ...meta,
        };
      }
      const error = await errorOf(res);
      if (!error.retryable || attempt >= this.#attempts) throw error;
      await this.#sleep(1000 * 2 ** (attempt - 1));
    }
  }

  /**
   * Forced alignment teks atas satu berkas MP3 (X18). Tidak diulang otomatis: putus di tengah jalan
   * mungkin sudah tertagih (murah, per durasi audio; dicatat pemanggil).
   */
  async align(audio: Uint8Array, text: string): Promise<ForcedAlignment> {
    const form = new FormData();
    form.append("file", new Blob([audio], { type: "audio/mpeg" }), "intisari.mp3");
    form.append("text", text);
    let res: Response;
    try {
      res = await this.#fetch(`${ELEVENLABS_API}/v1/forced-alignment`, {
        method: "POST",
        headers: this.#headers({ accept: "application/json" }),
        body: form,
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (error) {
      throw new TtsError(
        `forced alignment gagal tanpa jawaban (${error instanceof Error ? error.name : "galat"}); mungkin sudah tertagih`,
        null,
        "network",
        false,
        "unknown",
      );
    }
    if (!res.ok) throw await errorOf(res);
    // 200 = tertagih: badan yang rusak dikembalikan sebagai hasil kosong (kalimat tanpa waktu),
    // bukan dilempar, supaya pemanggil tetap mencatat tanda terimanya (ADR-061).
    let body: { words?: { text?: unknown; start?: unknown; end?: unknown }[]; loss?: unknown } = {};
    try {
      body = (await res.json()) as typeof body;
    } catch {
      // Bukan JSON: tanpa kata.
    }
    const words = (Array.isArray(body.words) ? body.words : []).flatMap((w) =>
      typeof w.text === "string" && typeof w.start === "number" && typeof w.end === "number"
        ? [{ text: w.text, start: w.start, end: w.end }]
        : [],
    );
    return { words, loss: typeof body.loss === "number" ? body.loss : null };
  }

  async #getJson(path: string): Promise<unknown> {
    const res = await this.#fetch(`${ELEVENLABS_API}${path}`, {
      headers: this.#headers({ accept: "application/json" }),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) throw await errorOf(res);
    return res.json();
  }

  async quota(): Promise<Quota | null> {
    const body = (await this.#getJson("/v1/user/subscription")) as {
      character_count?: number;
      character_limit?: number;
      next_character_count_reset_unix?: number | null;
      tier?: string | null;
    } | null;
    if (
      body === null ||
      typeof body.character_count !== "number" ||
      typeof body.character_limit !== "number"
    ) {
      return null;
    }
    const reset = body.next_character_count_reset_unix;
    return {
      used: body.character_count,
      limit: body.character_limit,
      resetsAt: typeof reset === "number" ? new Date(reset * 1000).toISOString() : null,
      tier: body.tier ?? null,
    };
  }

  async voice(voiceId: string): Promise<VoiceInfo | null> {
    const body = (await this.#getJson(`/v1/voices/${encodeURIComponent(voiceId)}`)) as {
      voice_id?: string;
      name?: string;
      category?: string | null;
    } | null;
    if (body === null || typeof body.name !== "string") return null;
    return { voiceId: body.voice_id ?? voiceId, name: body.name, category: body.category ?? null };
  }
}
