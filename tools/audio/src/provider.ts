// Antarmuka penyedia suara AI (X17, ADR-097 butir 6). ElevenLabs v4 dulu (`providers/elevenlabs.ts`);
// penyedia lain (mis. Chirp 3 HD, Gemini TTS bila uji dengar menolak v4) cukup memenuhi antarmuka ini.

export interface TtsCapabilities {
  provider: string;
  model: string;
  /** Format keluaran penyedia (dicatat di manifest), mis. `mp3_44100_64`. */
  outputFormat: string;
  /** Batas karakter teks per permintaan. */
  maxCharsPerRequest: number;
  /** Jumlah id permintaan sebelumnya yang boleh dikirim untuk request stitching (0 = tidak didukung). */
  maxPreviousRequests: number;
  /** Umur maksimal id permintaan sebelumnya yang masih bisa dipakai stitching (ms). */
  previousRequestMaxAgeMs: number;
  /** Mendukung lafal IPA inline `/…/` di teks. */
  inlineIpa: boolean;
}

export interface SynthesisRequest {
  text: string;
  voiceId: string;
  /** ISO 639-1, mis. `id`. */
  languageCode: string;
  /** Id permintaan segmen sebelumnya (kronologis), untuk kesinambungan intonasi. */
  previousRequestIds: readonly string[];
}

export interface SynthesisResult {
  audio: Uint8Array;
  /** Id permintaan di sisi penyedia (untuk stitching dan rekonsiliasi), bila ada. */
  requestId: string | null;
  /** Karakter yang ditagih (header penyedia), bila ada. */
  characterCost: number | null;
}

export interface Quota {
  used: number;
  limit: number;
  /** Waktu kuota direset (ISO), bila diketahui. */
  resetsAt: string | null;
  tier: string | null;
}

export interface VoiceInfo {
  voiceId: string;
  name: string;
  category: string | null;
}

/**
 * Galat penyedia. `retryable` = permintaan pasti belum diproses (antre/kuota per menit), aman diulang;
 * `charged` = "unknown" bila permintaan mungkin sudah diproses dan ditagih (jaringan putus, batas
 * waktu): jangan diulang otomatis (pola ADR-061), tanda niatnya dibiarkan untuk diperiksa.
 */
export class TtsError extends Error {
  override name = "TtsError";
  readonly status: number | null;
  readonly code: string | null;
  readonly retryable: boolean;
  readonly charged: "no" | "unknown";
  constructor(
    message: string,
    status: number | null,
    code: string | null,
    retryable: boolean,
    charged: "no" | "unknown",
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.charged = charged;
  }
}

export interface TtsProvider {
  readonly capabilities: TtsCapabilities;
  synthesize(request: SynthesisRequest): Promise<SynthesisResult>;
  /** Kuota karakter akun; null bila kunci API tidak berizin membacanya. */
  quota(): Promise<Quota | null>;
  /** Data suara; null bila kunci API tidak berizin membacanya. */
  voice(voiceId: string): Promise<VoiceInfo | null>;
}
