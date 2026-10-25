// Penyambung MP3 per bingkai (X17): keluaran TTS per segmen (MPEG Layer III) disambung menjadi satu
// berkas per Intisari, dengan jeda sunyi di antara segmen. Tanpa dekode ulang: bingkai disalin apa
// adanya, tag ID3/APE dan bingkai info Xing/Info/VBRI dibuang (bingkai info di tengah berkas membuat
// pemutar salah menghitung durasi).
//
// Berkas hasil harus CBR satu bitrate. Tanpa indeks Xing, browser menghitung durasi dan posisi seek
// dari ukuran berkas ÷ bitrate; bitrate campuran membuat lompatan bab meleset. Jadi bingkai sunyi
// memakai bitrate yang sama dengan audionya, dan segmen dengan bitrate berbeda ditolak.

export interface Mp3Format {
  /** 1 = MPEG-1, 2 = MPEG-2, 2.5 = MPEG-2.5 (selalu Layer III). */
  version: 1 | 2 | 2.5;
  sampleRate: number;
  channels: 1 | 2;
  /** Bitrate (kbps) semua bingkai audio. */
  bitrate: number;
  samplesPerFrame: number;
}

export interface Mp3Stream {
  format: Mp3Format;
  /** Bingkai audio (tanpa tag dan bingkai info), urut. */
  frames: Uint8Array[];
  samples: number;
}

export class Mp3Error extends Error {
  override name = "Mp3Error";
}

const BITRATES: Readonly<Record<"1" | "2", readonly number[]>> = {
  "1": [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  "2": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES: Readonly<Record<string, readonly number[]>> = {
  "1": [44100, 48000, 32000],
  "2": [22050, 24000, 16000],
  "2.5": [11025, 12000, 8000],
};

interface FrameHeader {
  version: 1 | 2 | 2.5;
  protected: boolean;
  bitrateIndex: number;
  bitrate: number;
  sampleRate: number;
  padding: boolean;
  channels: 1 | 2;
  /** Panjang bingkai dalam byte (header termasuk). */
  length: number;
  samples: number;
  /** Panjang side info (byte) sesudah header (+CRC). */
  sideInfo: number;
}

/** Header bingkai Layer III di `data[pos..]`, atau null bila bukan header yang sah. */
function readHeader(data: Uint8Array, pos: number): FrameHeader | null {
  if (pos + 4 > data.length) return null;
  const b1 = data[pos + 1] as number;
  const b2 = data[pos + 2] as number;
  const b3 = data[pos + 3] as number;
  if (data[pos] !== 0xff || (b1 & 0xe0) !== 0xe0) return null;
  const versionBits = (b1 >> 3) & 0b11;
  if (versionBits === 0b01) return null;
  if (((b1 >> 1) & 0b11) !== 0b01) return null; // hanya Layer III
  const version = versionBits === 0b11 ? 1 : versionBits === 0b10 ? 2 : 2.5;
  const bitrateIndex = b2 >> 4;
  const rateIndex = (b2 >> 2) & 0b11;
  if (bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return null;
  const bitrate = (BITRATES[version === 1 ? "1" : "2"] as readonly number[])[
    bitrateIndex
  ] as number;
  const sampleRate = (SAMPLE_RATES[String(version)] as readonly number[])[rateIndex] as number;
  const padding = ((b2 >> 1) & 1) === 1;
  const channels = b3 >> 6 === 0b11 ? 1 : 2;
  const samples = version === 1 ? 1152 : 576;
  const length = Math.floor(((samples / 8) * bitrate * 1000) / sampleRate) + (padding ? 1 : 0);
  const sideInfo = version === 1 ? (channels === 1 ? 17 : 32) : channels === 1 ? 9 : 17;
  return {
    version,
    protected: (b1 & 1) === 0,
    bitrateIndex,
    bitrate,
    sampleRate,
    padding,
    channels,
    length,
    samples,
    sideInfo,
  };
}

/** Panjang tag ID3v2 di awal `data[pos..]` (0 bila tidak ada). */
function id3v2Length(data: Uint8Array, pos: number): number {
  if (pos + 10 > data.length) return 0;
  if (data[pos] !== 0x49 || data[pos + 1] !== 0x44 || data[pos + 2] !== 0x33) return 0;
  const size =
    ((data[pos + 6] as number) << 21) |
    ((data[pos + 7] as number) << 14) |
    ((data[pos + 8] as number) << 7) |
    (data[pos + 9] as number);
  const footer = ((data[pos + 5] as number) & 0x10) !== 0 ? 10 : 0;
  return 10 + size + footer;
}

const ascii = (data: Uint8Array, pos: number, n: number): string =>
  String.fromCharCode(...data.subarray(pos, pos + n));

/** Bingkai pertama berisi tag info encoder (Xing/Info/VBRI), bukan audio. */
function isInfoFrame(data: Uint8Array, pos: number, h: FrameHeader): boolean {
  const at = pos + 4 + (h.protected ? 2 : 0) + h.sideInfo;
  const tag = ascii(data, at, 4);
  return tag === "Xing" || tag === "Info" || ascii(data, pos + 36, 4) === "VBRI";
}

/** `main_data_begin` bingkai: 0 = tidak meminjam byte dari bingkai sebelumnya (bit reservoir). */
function mainDataBegin(frame: Uint8Array, h: FrameHeader): number {
  const at = 4 + (h.protected ? 2 : 0);
  const hi = frame[at] as number;
  const lo = frame[at + 1] as number;
  return h.version === 1 ? (hi << 1) | (lo >> 7) : hi;
}

/**
 * Urai berkas MP3 Layer III: lewati tag ID3v2 di awal, ID3v1/APE di akhir, dan bingkai info; tolak
 * data yang bukan bingkai, format yang berubah di tengah, atau bitrate yang tidak tetap.
 */
export function parseMp3(data: Uint8Array): Mp3Stream {
  let pos = 0;
  for (let n = id3v2Length(data, pos); n > 0; n = id3v2Length(data, pos)) pos += n;
  let end = data.length;
  if (end - pos >= 128 && ascii(data, end - 128, 3) === "TAG") end -= 128;
  if (end - pos >= 32 && ascii(data, end - 32, 8) === "APETAGEX") {
    // Footer APE: ukuran tag (termasuk footer, tanpa header) di +12, flag di +20 (bit 31 = ada header).
    const footer = new DataView(data.buffer, data.byteOffset + end - 32, 32);
    const hasHeader = (footer.getUint32(20, true) & 0x80000000) !== 0;
    end -= footer.getUint32(12, true) + (hasHeader ? 32 : 0);
  }
  const frames: Uint8Array[] = [];
  let format: Mp3Format | null = null;
  let samples = 0;
  let first = true;
  while (pos < end) {
    const h = readHeader(data, pos);
    if (h === null) throw new Mp3Error(`bukan bingkai MP3 Layer III di byte ${pos}`);
    if (pos + h.length > end) throw new Mp3Error(`bingkai terpotong di byte ${pos}`);
    if (first && isInfoFrame(data, pos, h)) {
      pos += h.length;
      first = false;
      continue;
    }
    const frame = data.subarray(pos, pos + h.length);
    if (format === null) {
      if (mainDataBegin(frame, h) !== 0) {
        throw new Mp3Error("bingkai audio pertama meminjam data bingkai sebelumnya");
      }
      format = {
        version: h.version,
        sampleRate: h.sampleRate,
        channels: h.channels,
        bitrate: h.bitrate,
        samplesPerFrame: h.samples,
      };
    } else if (
      h.version !== format.version ||
      h.sampleRate !== format.sampleRate ||
      h.channels !== format.channels
    ) {
      throw new Mp3Error(`format bingkai berubah di byte ${pos}`);
    } else if (h.bitrate !== format.bitrate) {
      throw new Mp3Error(
        `bitrate tidak tetap (${format.bitrate} → ${h.bitrate} kbps di byte ${pos}); butuh indeks Xing`,
      );
    }
    frames.push(frame);
    samples += h.samples;
    pos += h.length;
    first = false;
  }
  if (format === null) throw new Mp3Error("tidak ada bingkai audio");
  return { format, frames, samples };
}

/** Durasi (ms, dibulatkan) dari jumlah sampel. */
export const samplesToMs = (samples: number, sampleRate: number): number =>
  Math.round((samples * 1000) / sampleRate);

/**
 * Bingkai sunyi sepanjang ±`ms` dengan format dan bitrate yang sama: side info nol (tanpa data
 * audio, `main_data_begin` 0), padding mengikuti rata-rata bitrate supaya tetap CBR.
 */
export function silentFrames(format: Mp3Format, ms: number): Uint8Array[] {
  const count = Math.round((ms * format.sampleRate) / 1000 / format.samplesPerFrame);
  const table = BITRATES[format.version === 1 ? "1" : "2"] as readonly number[];
  const bitrateIndex = table.indexOf(format.bitrate);
  const rateIndex = (SAMPLE_RATES[String(format.version)] as readonly number[]).indexOf(
    format.sampleRate,
  );
  if (bitrateIndex < 1 || rateIndex < 0) throw new Mp3Error("format tidak dikenal");
  const versionBits = format.version === 1 ? 0b11 : format.version === 2 ? 0b10 : 0b00;
  const numerator = (format.samplesPerFrame / 8) * format.bitrate * 1000;
  const base = Math.floor(numerator / format.sampleRate);
  const remainder = numerator % format.sampleRate;
  const out: Uint8Array[] = [];
  let carry = 0;
  for (let i = 0; i < count; i++) {
    carry += remainder;
    const pad = carry >= format.sampleRate;
    if (pad) carry -= format.sampleRate;
    const frame = new Uint8Array(base + (pad ? 1 : 0));
    frame[0] = 0xff;
    frame[1] = 0xe0 | (versionBits << 3) | (0b01 << 1) | 1; // Layer III, tanpa CRC
    frame[2] = (bitrateIndex << 4) | (rateIndex << 2) | (pad ? 0b10 : 0);
    frame[3] = format.channels === 1 ? 0b11 << 6 : 0b01 << 6;
    out.push(frame);
  }
  return out;
}

export interface JoinPart {
  stream: Mp3Stream;
  /** Jeda sunyi sesudah bagian ini (ms); 0 = tanpa jeda. */
  gapAfterMs: number;
}

export interface JoinedAudio {
  /** Bingkai audio gabungan (tanpa tag). */
  audio: Uint8Array;
  format: Mp3Format;
  samples: number;
  /** Sampel ke-berapa setiap bagian mulai (untuk bab pemutar). */
  starts: number[];
}

/** Sambung bagian-bagian MP3 berformat sama, dengan jeda sunyi di antaranya. */
export function joinMp3(parts: readonly JoinPart[]): JoinedAudio {
  const head = parts[0];
  if (head === undefined) throw new Mp3Error("tidak ada bagian untuk disambung");
  const format = head.stream.format;
  const chunks: Uint8Array[] = [];
  const starts: number[] = [];
  let samples = 0;
  for (const part of parts) {
    const f = part.stream.format;
    if (
      f.version !== format.version ||
      f.sampleRate !== format.sampleRate ||
      f.channels !== format.channels ||
      f.bitrate !== format.bitrate
    ) {
      throw new Mp3Error("format antarsegmen berbeda; semua segmen harus satu format keluaran");
    }
    starts.push(samples);
    chunks.push(...part.stream.frames);
    samples += part.stream.samples;
    if (part.gapAfterMs > 0) {
      const gap = silentFrames(format, part.gapAfterMs);
      chunks.push(...gap);
      samples += gap.length * format.samplesPerFrame;
    }
  }
  const audio = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of chunks) {
    audio.set(c, at);
    at += c.length;
  }
  return { audio, format, samples, starts };
}
