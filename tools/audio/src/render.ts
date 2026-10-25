// Membuat audio satu Intisari (X17): skrip → teks per permintaan (leksikon diterapkan) → TTS dengan
// cache per sidik + tanda niat/terima (ADR-061) + request stitching dalam satu Intisari → MP3 per
// bingkai disambung dengan jeda antarsegmen → tag ID3 → berkas bersidik isi di `out/`.
// Satu permintaan per segmen (bab pemutar = gagasan), dipecah per kalimat hanya bila melebihi batas
// karakter penyedia. Pemanggilan berurutan: stitching butuh permintaan sebelumnya sudah selesai.
// Dengan `timestamps` (X18) setiap permintaan meminta waktu per karakter; bila SEMUA potongan
// punya waktu, berkas rakitan disertai timestamps per kalimat (tts_timestamps). Bila tidak,
// timestamps dibuat sesudahnya dengan forced alignment (`pnpm audio align`).
import { join } from "node:path";

import {
  AUDIO_ALIGNMENT_FORMAT,
  SCRIPT_LABEL,
  alignmentJson,
  alignmentObjectKey,
  audioManifestTrack,
  audioObjectKey,
  unspeakableChar,
} from "@surau/core";
import type { AudioAlignment, DigestScript, DigestView, ScriptSegmentKind } from "@surau/core";

import { charTokens, monotonic, sentenceTimes } from "./align.ts";
import { id3v2 } from "./id3.ts";
import { applyLexicon } from "./lexicon.ts";
import { styledSentences, withoutStyleTags } from "./style.ts";
import type { NarratorStyle } from "./style.ts";
import type { Lexicon } from "./lexicon.ts";
import { joinMp3, parseMp3, samplesToMs } from "./mp3.ts";
import type { JoinPart } from "./mp3.ts";
import type { TtsCapabilities, TtsProvider } from "./provider.ts";
import { TtsError } from "./provider.ts";
import {
  appendReceipt,
  readRendered,
  readSegment,
  removeIntent,
  segmentKey,
  sha256Hex,
  writeAtomic,
  writeIntent,
  writeRendered,
  writeSegment,
} from "./store.ts";
import type { AudioStore, RenderedTrack, SegmentMeta } from "./store.ts";

type AudioManifestAlignmentRef = NonNullable<RenderedTrack["track"]["alignment"]>;

/**
 * Pemeriksaan terakhir teks yang benar-benar dikirim (sesudah leksikon): tanpa huruf Arab, ⟦ ⟧, atau
 * tag `[ ]` (aturan 11) selain tag gaya dari daftar tetap. `/…/` hanya berasal dari lafal IPA leksikon.
 */
export function speakableRequest(text: string): string {
  const bad = unspeakableChar(withoutStyleTags(text));
  if (bad !== null)
    throw new Error(`teks permintaan TTS memuat "${bad}" yang tidak boleh dibacakan`);
  return text;
}

/** Jeda sunyi sesudah tiap jenis segmen (ms). Segmen terakhir tanpa jeda. */
export const GAP_AFTER_MS: Readonly<Record<ScriptSegmentKind, number>> = {
  label: 600,
  intro: 900,
  point: 900,
  quotes: 900,
  closing: 0,
};

export const LICENSE = "CC BY-NC-SA 4.0";
export const LICENSE_URL = "https://creativecommons.org/licenses/by-nc-sa/4.0/";

export interface RenderInput {
  view: DigestView;
  script: DigestScript;
  /** Judul Indonesia bagian (ID3, laporan). */
  title: string;
  voice: { id: string; name: string };
  lexicon: Lexicon;
  /** Gaya narator (ADR-101); bawaan `polos`. */
  style: NarratorStyle;
  work: { slug: string; title: string };
  /** Asal situs untuk tautan halaman Intisari di ID3, mis. https://surau.org. */
  siteOrigin: string;
  /** Minta waktu per karakter ke penyedia (X18; `submit --timestamps`). */
  timestamps?: boolean;
}

/** Pagu karakter tertagih satu putaran `submit` (dikurangi setiap permintaan baru). */
export interface Budget {
  remaining: number;
}

export type RenderOutcome =
  | { status: "rendered" | "reused"; rendered: RenderedTrack; billed: number }
  | { status: "budget"; needed: number; billed: number };

/** Kelompokkan kalimat menjadi teks permintaan ≤ `max` karakter (dipisah spasi). */
export function requestTexts(sentences: readonly string[], max: number): string[] {
  const out: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (s.length > max) throw new RangeError(`satu kalimat ${s.length} karakter > batas ${max}`);
    const next = current === "" ? s : `${current} ${s}`;
    if (next.length > max) {
      out.push(current);
      current = s;
    } else {
      current = next;
    }
  }
  if (current !== "") out.push(current);
  return out;
}

interface Piece {
  segment: number;
  text: string;
  key: string;
  /** Kalimat skrip di potongan ini: indeks di segmennya + rentangnya di `text` (X18). */
  sentences: { index: number; start: number; end: number }[];
}

/** Semua permintaan TTS sebuah skrip (sesudah leksikon), urut. */
export function piecesOf(input: RenderInput, cap: TtsCapabilities): Piece[] {
  return input.script.segments.flatMap((seg, segment) => {
    const lexed = seg.sentences.map((s) => applyLexicon(s, input.lexicon));
    // Gaya narator (ADR-101) hanya menambah tag di AWAL kalimat; rentang kalimat dimulai sesudahnya.
    const styled = styledSentences(lexed, seg.roles, input.style, seg.kind);
    let next = 0;
    return requestTexts(styled, cap.maxCharsPerRequest).map((text) => {
      // `requestTexts` menggabung kalimat berurutan dengan satu spasi.
      const sentences: Piece["sentences"] = [];
      for (let at = 0; next < styled.length && at < text.length; next++) {
        const tag = styled[next]!.length - lexed[next]!.length;
        sentences.push({ index: next, start: at + tag, end: at + styled[next]!.length });
        at += styled[next]!.length + 1;
      }
      return {
        segment,
        text: speakableRequest(text),
        sentences,
        key: segmentKey({
          provider: cap.provider,
          model: cap.model,
          outputFormat: cap.outputFormat,
          voiceId: input.voice.id,
          languageCode: input.script.lang,
          text,
        }),
      };
    });
  });
}

/** Karakter yang masih harus dibayar untuk sebuah skrip (permintaan yang belum ada di cache). */
export function uncachedChars(store: AudioStore, input: RenderInput, cap: TtsCapabilities): number {
  return piecesOf(input, cap)
    .filter((p) => readSegment(store, p.key) === null)
    .reduce((n, p) => n + p.text.length, 0);
}

export async function renderNode(
  store: AudioStore,
  provider: TtsProvider,
  input: RenderInput,
  budget: Budget,
  now: () => Date = () => new Date(),
): Promise<RenderOutcome> {
  const cap = provider.capabilities;
  const nodeId = input.script.node_id;
  const pieces = piecesOf(input, cap);
  const keys = pieces.map((p) => p.key);
  const previous = readRendered(store, nodeId);
  if (
    previous !== null &&
    previous.track.script_sha256 === input.script.sha256 &&
    previous.track.lexicon_version === input.lexicon.version &&
    previous.track.voice_id === input.voice.id &&
    previous.track.style === input.style.id &&
    JSON.stringify(previous.segment_keys) === JSON.stringify(keys)
  ) {
    return { status: "reused", rendered: previous, billed: 0 };
  }

  const metas: SegmentMeta[] = [];
  const audio: Uint8Array[] = [];
  let billed = 0;
  for (const piece of pieces) {
    const cached = readSegment(store, piece.key);
    if (cached !== null) {
      metas.push(cached.meta);
      audio.push(cached.audio);
      continue;
    }
    if (piece.text.length > budget.remaining) {
      return { status: "budget", needed: piece.text.length, billed };
    }
    const at = now();
    // Stitching: id permintaan segmen sebelumnya di Intisari ini yang masih cukup baru.
    const previousRequestIds = metas
      .filter(
        (m) =>
          m.request_id !== null &&
          at.getTime() - Date.parse(m.created_at) <= cap.previousRequestMaxAgeMs,
      )
      .map((m) => m.request_id as string)
      .slice(-cap.maxPreviousRequests);
    writeIntent(store, {
      key: piece.key,
      node_id: nodeId,
      segment: piece.segment,
      chars: piece.text.length,
      pid: process.pid,
      started_at: at.toISOString(),
    });
    let result;
    try {
      result = await provider.synthesize({
        text: piece.text,
        voiceId: input.voice.id,
        languageCode: input.script.lang,
        previousRequestIds,
        ...(input.timestamps === true && cap.timestamps ? { timestamps: true } : {}),
      });
    } catch (error) {
      // Tanda niat hanya dilepas bila permintaan pasti belum tertagih.
      if (error instanceof TtsError && error.charged === "no") removeIntent(store, piece.key);
      throw error;
    }
    const meta: SegmentMeta = {
      key: piece.key,
      provider: cap.provider,
      model: cap.model,
      output_format: cap.outputFormat,
      voice_id: input.voice.id,
      language_code: input.script.lang,
      chars: piece.text.length,
      request_id: result.requestId,
      character_cost: result.characterCost,
      alignment: result.alignment ?? null,
      created_at: now().toISOString(),
    };
    // Respons 200 = tertagih: tanda terima dicatat SEBELUM keluarannya diperiksa (ADR-061).
    appendReceipt(store, {
      key: piece.key,
      node_id: nodeId,
      provider: cap.provider,
      model: cap.model,
      voice_id: input.voice.id,
      chars: meta.chars,
      character_cost: meta.character_cost,
      request_id: meta.request_id,
      at: meta.created_at,
    });
    try {
      parseMp3(result.audio);
    } catch (error) {
      // Keluaran yang tidak bisa disambung tidak masuk cache; bait mentah disimpan untuk diperiksa.
      writeAtomic(join(store.root, "rejected", `${piece.key}.mp3`), result.audio);
      removeIntent(store, piece.key);
      throw new Error(
        `keluaran TTS node ${nodeId} segmen ${piece.segment} bukan MP3 yang bisa disambung (${error instanceof Error ? error.message : String(error)}); sudah tertagih dan tercatat, bait mentah di data/build/audio/rejected/`,
        { cause: error },
      );
    }
    writeSegment(store, meta, result.audio);
    removeIntent(store, piece.key);
    const cost = meta.character_cost ?? meta.chars;
    budget.remaining -= cost;
    billed += cost;
    metas.push(meta);
    audio.push(result.audio);
  }

  const rendered = assemble(input, pieces, metas, audio, cap, now());
  writeRendered(store, rendered.track, rendered.bytes, rendered.alignment);
  return { status: "rendered", rendered: rendered.track, billed };
}

/** Rakit potongan TTS menjadi satu berkas + metadata track (deterministik dari masukannya). */
export function assemble(
  input: RenderInput,
  pieces: readonly Piece[],
  metas: readonly SegmentMeta[],
  audio: readonly Uint8Array[],
  cap: TtsCapabilities,
  createdAt: Date,
): { track: RenderedTrack; bytes: Uint8Array; alignment: string | null } {
  const { script, view } = input;
  const lastSegment = script.segments.length - 1;
  const parts: JoinPart[] = pieces.map((p, i) => {
    const lastOfSegment = pieces[i + 1]?.segment !== p.segment;
    const kind = script.segments[p.segment]!.kind;
    return {
      stream: parseMp3(audio[i]!),
      gapAfterMs: lastOfSegment && p.segment !== lastSegment ? GAP_AFTER_MS[kind] : 0,
    };
  });
  const joined = joinMp3(parts);
  const rate = joined.format.sampleRate;
  const firstPiece = (segment: number) => pieces.findIndex((p) => p.segment === segment);
  const chapters = script.segments.flatMap((seg, segment) =>
    seg.kind === "point" && seg.point_ord !== null
      ? [
          {
            point_ord: seg.point_ord,
            start_ms: samplesToMs(joined.starts[firstPiece(segment)]!, rate),
          },
        ]
      : [],
  );
  const created_at = createdAt.toISOString();
  const pageUrl = `${input.siteOrigin}/kitab/${input.work.slug}/bab/${script.node_id}/intisari`;
  const tag = id3v2({
    title: `Intisari: ${input.title}`,
    artist: `Dibacakan suara AI (${input.voice.name}, ${cap.provider} ${cap.model})`,
    album: `Intisari ${input.work.title}`,
    language: "ind",
    date: created_at.slice(0, 10),
    copyright: `${created_at.slice(0, 4)} Surau, ${LICENSE}`,
    licenseUrl: LICENSE_URL,
    sourceUrl: pageUrl,
    comment: `${SCRIPT_LABEL} Intisari adalah pintu ke kitab, bukan penggantinya: teks lengkap dan dasar setiap gagasan ada di ${pageUrl}. Teks sumber: ${view.source.attribution} (${view.source.license}).`,
    extra: {
      AI_GENERATED: `Intisari: ${view.model} (${view.prompt_version}, ${view.created_at}); suara AI: ${cap.provider} ${cap.model}, ${input.voice.name}`,
      SCRIPT: `skrip v${script.script_version}, lisan v${script.spoken_version}, sha ${script.sha256.slice(0, 12)}, leksikon ${input.lexicon.version}`,
    },
    encoder: "Surau tools/audio",
  });
  const bytes = new Uint8Array(tag.length + joined.audio.length);
  bytes.set(tag, 0);
  bytes.set(joined.audio, tag.length);
  const sha256 = sha256Hex(bytes);
  const r2_key = audioObjectKey(input.work.slug, script.lang, script.node_id, sha256);
  // Timestamps per kalimat dari waktu karakter TTS, hanya bila setiap potongan punya (X18).
  let alignment: { json: string; ref: AudioManifestAlignmentRef } | null = null;
  if (metas.length > 0 && metas.every((m) => m.alignment !== null)) {
    const segments: AudioAlignment["segments"] = script.segments.map((seg) =>
      seg.sentences.map(() => null),
    );
    pieces.forEach((p, i) => {
      const spans = sentenceTimes(
        p.text,
        p.sentences,
        charTokens(metas[i]!.alignment!),
        samplesToMs(joined.starts[i]!, rate),
      );
      p.sentences.forEach((s, j) => (segments[p.segment]![s.index] = spans[j] ?? null));
    });
    const flat = monotonic(segments.flat());
    let k = 0;
    const json = alignmentJson({
      format: AUDIO_ALIGNMENT_FORMAT,
      audio_sha256: sha256,
      script_sha256: script.sha256,
      method: "tts_timestamps",
      segments: segments.map((seg) => seg.map(() => flat[k++] ?? null)),
    });
    const fileSha = sha256Hex(json);
    alignment = {
      json,
      ref: {
        r2_key: alignmentObjectKey(input.work.slug, script.lang, script.node_id, fileSha),
        sha256: fileSha,
        bytes: Buffer.byteLength(json),
        method: "tts_timestamps",
      },
    };
  }
  const track = audioManifestTrack.parse({
    toc_node_id: script.node_id,
    lang: script.lang,
    voice_kind: "ai",
    r2_key,
    sha256,
    bytes: bytes.length,
    duration_ms: samplesToMs(joined.samples, rate),
    provider: cap.provider,
    voice_id: input.voice.id,
    voice_name: input.voice.name,
    model: cap.model,
    output_format: cap.outputFormat,
    script_sha256: script.sha256,
    script_version: script.script_version,
    spoken_version: script.spoken_version,
    lexicon_version: input.lexicon.version,
    style: input.style.id,
    chapters,
    alignment: alignment?.ref ?? null,
    characters: metas.reduce((n, m) => n + (m.character_cost ?? m.chars), 0),
    created_at,
  });
  return {
    track: {
      track,
      title: input.title,
      segment_keys: pieces.map((p) => p.key),
      file: `out/${r2_key.split("/").at(-1)}`,
      alignment_file: alignment === null ? null : `out/${alignment.ref.r2_key.split("/").at(-1)}`,
    },
    bytes,
    alignment: alignment?.json ?? null,
  };
}
