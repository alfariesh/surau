// Metadata audio "Dengarkan" ter-commit (X17, ADR-097 butir 6): `data/audio/<kitab>-audio.json`.
// Sumber kebenaran baris `audio_track`. Tanpa teks: hanya kunci objek, sidik dan ukuran berkas,
// durasi, asal suara, versi skrip/leksikon, dan bab. Ingest memuat sebuah track hanya bila
// `script_sha256`-nya sama dengan skrip yang dibangun ulang dari Intisari di build itu
// (`loadDigestScript`), jadi audio yang membacakan Intisari lama gugur sendiri.
//
// Objek R2 tidak pernah ditimpa: kuncinya memuat sidik isi berkas MP3 (`<node>-<sha12>.mp3`), sehingga
// ganti suara, leksikon, atau skrip selalu menghasilkan kunci baru. Manifest boleh menyimpan riwayat
// (beberapa track untuk node yang sama); yang dimuat adalah track terbaru yang skripnya cocok.
import { audioChapters, voiceKind } from "@surau/db";
import type { AudioTrackRow } from "@surau/db";
import { z } from "zod";

import { audioManifestAlignment } from "./audio-alignment.ts";

export const AUDIO_MANIFEST_FORMAT = 1;

/** Tipe isi objek audio (kolom `audio_track.mime`). */
export const AUDIO_MIME = "audio/mpeg";

/** Header cache objek R2: kunci memuat sidik isi, jadi aman disimpan setahun dan tidak berubah. */
export const AUDIO_CACHE_CONTROL = "public, max-age=31536000, immutable";

const sha256 = z.string().regex(/^[0-9a-f]{64}$/u, "sha256 heksadesimal kecil");
const int = z.number().int();

/** Kunci objek media: `<karya>/<lang>/<node>-<12 heks pertama sha256 isi>.mp3`. */
export function audioObjectKey(work: string, lang: string, nodeId: number, fileSha256: string) {
  return `${work}/${lang}/${nodeId}-${fileSha256.slice(0, 12)}.mp3`;
}

export const audioManifestTrack = z
  .strictObject({
    toc_node_id: int.positive(),
    lang: z.string().regex(/^[a-z]{2,3}$/u),
    voice_kind: voiceKind,
    r2_key: z.string().regex(/^[a-z0-9-]+\/[a-z]{2,3}\/\d+-[0-9a-f]{12}\.mp3$/u),
    /** sha256 isi berkas MP3 (diperiksa `pnpm audio verify`). */
    sha256,
    bytes: int.positive(),
    duration_ms: int.positive(),
    provider: z.string().min(1),
    voice_id: z.string().min(1),
    voice_name: z.string().min(1),
    /** Model TTS; null untuk narator manusia. */
    model: z.string().min(1).nullable(),
    /** Format keluaran penyedia, mis. `mp3_44100_64`. */
    output_format: z.string().min(1),
    script_sha256: sha256,
    script_version: int.positive(),
    spoken_version: int.positive(),
    lexicon_version: z.string().min(1),
    chapters: audioChapters,
    /**
     * Timestamps per kalimat untuk sorotan teks (X18), atau null. Boleh ditambahkan sesudah track
     * tercatat (`pnpm audio align`): objek audio tidak berubah, hanya rujukan ini.
     */
    alignment: audioManifestAlignment.nullable().default(null),
    /** Karakter yang ditagih penyedia (jumlah header `character-cost`; 0 bila dari cache). */
    characters: int.nonnegative(),
    created_at: z.iso.datetime(),
  })
  .refine((t) => (t.voice_kind === "ai") === (t.model !== null), "model hanya untuk suara AI")
  .refine(
    (t) => t.r2_key.endsWith(`/${t.lang}/${t.toc_node_id}-${t.sha256.slice(0, 12)}.mp3`),
    "r2_key harus memuat lang, node, dan sidik isi berkas",
  )
  .refine(
    (t) =>
      t.alignment === null ||
      t.alignment.r2_key.startsWith(t.r2_key.slice(0, t.r2_key.lastIndexOf("-") + 1)),
    "alignment.r2_key di karya, bahasa, dan node yang sama",
  )
  .refine(
    (t) =>
      t.chapters.every(
        (c, i, all) => c.start_ms < t.duration_ms && (i === 0 || all[i - 1]!.start_ms < c.start_ms),
      ),
    "bab urut waktu dan di dalam durasi",
  );
export type AudioManifestTrack = z.infer<typeof audioManifestTrack>;

export const audioManifest = z.strictObject({
  format: z.literal(AUDIO_MANIFEST_FORMAT),
  work: z.string().regex(/^[a-z0-9-]+$/u),
  edition_id: int.positive(),
  /** Asal publik objek (domain kustom bucket R2 media). */
  media_origin: z.url({ protocol: /^https$/u }),
  bucket: z.string().min(1),
  tracks: z.array(audioManifestTrack),
});
export type AudioManifest = z.infer<typeof audioManifest>;

export const emptyAudioManifest = (
  work: string,
  editionId: number,
  mediaOrigin: string,
  bucket: string,
): AudioManifest => ({
  format: AUDIO_MANIFEST_FORMAT,
  work,
  edition_id: editionId,
  media_origin: mediaOrigin,
  bucket,
  tracks: [],
});

/** Baris `audio_track` dari satu track manifest. */
export function audioTrackRowOf(t: AudioManifestTrack): AudioTrackRow {
  return {
    toc_node_id: t.toc_node_id,
    lang: t.lang,
    voice_kind: t.voice_kind,
    r2_key: t.r2_key,
    mime: AUDIO_MIME,
    bytes: t.bytes,
    duration_ms: t.duration_ms,
    provider: t.provider,
    voice_id: t.voice_id,
    voice_name: t.voice_name,
    model: t.model,
    script_sha256: t.script_sha256,
    script_version: t.script_version,
    lexicon_version: t.lexicon_version,
    chapters_json: JSON.stringify(t.chapters),
    alignment_key: t.alignment?.r2_key ?? null,
    created_at: t.created_at,
  };
}

export interface AudioSelection {
  rows: AudioTrackRow[];
  /** Track yang tidak dimuat beserta alasannya (untuk laporan ingest). */
  dropped: {
    r2_key: string;
    reason: "no_digest" | "stale_script" | "superseded" | "script_error";
  }[];
}

/**
 * Track manifest yang dimuat ke korpus: hanya yang `script_sha256`-nya sama dengan skrip Intisari di
 * build ini (`scripts`: `<node>:<lang>` → sha skrip; node tanpa Intisari tidak ada di peta). Per
 * (node, lang, jenis suara) dipilih yang terbaru; sisanya `superseded`. `failed` = kunci yang
 * skripnya gagal dibangun (gugur sebagai `script_error`, bukan menghentikan build).
 */
export function selectAudioTracks(
  manifest: AudioManifest,
  scripts: ReadonlyMap<string, string>,
  failed: ReadonlySet<string> = new Set(),
): AudioSelection {
  const dropped: AudioSelection["dropped"] = [];
  const best = new Map<string, AudioManifestTrack>();
  for (const t of manifest.tracks) {
    const node = `${t.toc_node_id}:${t.lang}`;
    const sha = scripts.get(node);
    if (sha === undefined) {
      dropped.push({ r2_key: t.r2_key, reason: failed.has(node) ? "script_error" : "no_digest" });
      continue;
    }
    if (sha !== t.script_sha256) {
      dropped.push({ r2_key: t.r2_key, reason: "stale_script" });
      continue;
    }
    const key = `${t.toc_node_id}:${t.lang}:${t.voice_kind}`;
    const prev = best.get(key);
    if (prev === undefined || Date.parse(prev.created_at) < Date.parse(t.created_at)) {
      if (prev !== undefined) dropped.push({ r2_key: prev.r2_key, reason: "superseded" });
      best.set(key, t);
    } else {
      dropped.push({ r2_key: t.r2_key, reason: "superseded" });
    }
  }
  const rows = [...best.values()]
    .sort((a, b) => a.toc_node_id - b.toc_node_id || a.lang.localeCompare(b.lang))
    .map(audioTrackRowOf);
  return { rows, dropped };
}
