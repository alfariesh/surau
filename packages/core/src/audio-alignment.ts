// Timestamps per kalimat audio "Dengarkan" (X18, ADR-102): objek JSON immutable di bucket media,
// ditunjuk `audio_track.alignment_key`, untuk sorotan kalimat yang mengikuti audio di halaman
// Intisari. Isinya hanya angka: waktu [mulai, akhir) dalam ms untuk setiap kalimat skrip, sejajar
// `DigestScript.segments[i].sentences` (skrip yang sama persis, dijamin `script_sha256`). Tanpa teks:
// halaman memetakan kalimat ke teks tampil lewat `DigestScript.sources`.
//
// Kunci objek memuat sidik isinya (`<karya>/<lang>/<node>-<sha12>.align.json`), jadi tidak pernah
// ditimpa; timestamps yang dibuat ulang (metode lain) menjadi objek baru.
import { z } from "zod";

export const AUDIO_ALIGNMENT_FORMAT = 1;

/** Tipe isi objek timestamps. */
export const ALIGNMENT_MIME = "application/json";

/**
 * Asal waktu: tts_timestamps = waktu karakter dari permintaan TTS itu sendiri (`/with-timestamps`);
 * forced_alignment = penyelarasan teks skrip atas MP3 rakitan (`/v1/forced-alignment`).
 */
export const alignmentMethod = z.enum(["tts_timestamps", "forced_alignment"]);
export type AlignmentMethod = z.infer<typeof alignmentMethod>;

const sha256 = z.string().regex(/^[0-9a-f]{64}$/u, "sha256 heksadesimal kecil");
const ms = z.number().int().nonnegative();

/** [mulai, akhir) satu kalimat dalam ms; null = kalimat yang waktunya tidak terpetakan. */
export const sentenceSpan = z
  .tuple([ms, ms])
  .refine(([start, end]) => start <= end, "akhir kalimat tidak sebelum mulainya");

export const audioAlignment = z
  .strictObject({
    format: z.literal(AUDIO_ALIGNMENT_FORMAT),
    /** sha256 isi berkas MP3 yang diselaraskan. */
    audio_sha256: sha256,
    /** sha skrip yang dibacakan: kalimat ke-j segmen ke-i = `segments[i][j]`. */
    script_sha256: sha256,
    method: alignmentMethod,
    segments: z.array(z.array(sentenceSpan.nullable())),
  })
  .refine((a) => {
    let last = 0;
    for (const span of a.segments.flat()) {
      if (span === null) continue;
      if (span[0] < last) return false;
      last = span[0];
    }
    return true;
  }, "kalimat urut waktu");
export type AudioAlignment = z.infer<typeof audioAlignment>;

/** Kunci objek timestamps: `<karya>/<lang>/<node>-<12 heks pertama sha256 isi JSON>.align.json`. */
export function alignmentObjectKey(work: string, lang: string, nodeId: number, fileSha256: string) {
  return `${work}/${lang}/${nodeId}-${fileSha256.slice(0, 12)}.align.json`;
}

export const ALIGNMENT_KEY = /^[a-z0-9-]+\/[a-z]{2,3}\/\d+-[0-9a-f]{12}\.align\.json$/u;

/** Rujukan objek timestamps di manifest audio. */
export const audioManifestAlignment = z.strictObject({
  r2_key: z.string().regex(ALIGNMENT_KEY),
  /** sha256 isi JSON (diperiksa `pnpm audio verify`). */
  sha256,
  bytes: z.number().int().positive(),
  method: alignmentMethod,
});
export type AudioManifestAlignment = z.infer<typeof audioManifestAlignment>;

/** Bentuk timestamps cocok dengan skrip: jumlah segmen dan kalimat per segmen sama. */
export function alignmentFits(
  alignment: Pick<AudioAlignment, "segments">,
  script: { segments: readonly { sentences: readonly unknown[] }[] },
): boolean {
  return (
    alignment.segments.length === script.segments.length &&
    alignment.segments.every((s, i) => s.length === script.segments[i]!.sentences.length)
  );
}

/** Teks JSON kanonis objek timestamps (satu baris; sidiknya = kunci objek). */
export const alignmentJson = (a: AudioAlignment): string => JSON.stringify(audioAlignment.parse(a));
