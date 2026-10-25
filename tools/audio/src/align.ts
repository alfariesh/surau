// Waktu per kalimat untuk sorotan teks (X18, ADR-103). Dua sumber waktu, satu pemetaan:
// - tts_timestamps: waktu per KARAKTER teks yang dikirim ke TTS (`/with-timestamps`), per permintaan,
//   lalu digeser ke awal potongan itu di berkas rakitan;
// - forced_alignment: waktu per KATA dari penyelarasan teks skrip atas MP3 rakitan.
// Token waktu dicocokkan berurutan ke teks (bukan per indeks), sehingga spasi yang dibuang penyedia,
// tanda baca yang dipisah, atau karakter yang tidak dikenali tidak menggeser kalimat sesudahnya.
// Kalimat yang tidak mendapat satu token pun bernilai null (halaman tidak menyorotnya).

/** Satu token bertimestamp dari penyedia (detik). */
export interface TimedToken {
  text: string;
  start: number;
  end: number;
}

/** Rentang satu kalimat di teks yang diselaraskan. */
export interface TextRange {
  start: number;
  end: number;
}

/** Teks gabungan kalimat (dipisah `joiner`) beserta rentang tiap kalimat di dalamnya. */
export function layoutSentences(
  sentences: readonly string[],
  joiner = " ",
): { text: string; ranges: TextRange[] } {
  const ranges: TextRange[] = [];
  let text = "";
  for (const s of sentences) {
    if (text !== "") text += joiner;
    ranges.push({ start: text.length, end: text.length + s.length });
    text += s;
  }
  return { text, ranges };
}

/** Jarak terjauh pencarian token berikutnya dari kursor (karakter): token yang tidak cocok dilewati. */
const LOOKAHEAD = 64;

/**
 * Waktu [mulai, akhir) dalam ms untuk setiap rentang kalimat, dari token bertimestamp yang
 * berurutan; `offsetMs` digeser ke semua waktu. null = kalimat tanpa token yang cocok.
 */
export function sentenceTimes(
  text: string,
  ranges: readonly TextRange[],
  tokens: readonly TimedToken[],
  offsetMs = 0,
): ([number, number] | null)[] {
  const out: ([number, number] | null)[] = ranges.map(() => null);
  let cursor = 0;
  let r = 0;
  for (const token of tokens) {
    const needle = token.text.trim();
    if (needle === "" || !Number.isFinite(token.start) || !Number.isFinite(token.end)) continue;
    const at = text.indexOf(needle, cursor);
    if (at < 0 || at - cursor > LOOKAHEAD) continue;
    cursor = at + needle.length;
    while (r < ranges.length && ranges[r]!.end <= at) r++;
    const range = ranges[r];
    if (range === undefined) break;
    if (at < range.start) continue;
    const start = Math.round(token.start * 1000) + offsetMs;
    const end = Math.max(start, Math.round(token.end * 1000) + offsetMs);
    const prev = out[r];
    out[r] = prev === null || prev === undefined ? [start, end] : [prev[0], Math.max(prev[1], end)];
  }
  return out;
}

/** Token per karakter dari `alignment` ElevenLabs `/with-timestamps`. */
export interface CharacterAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export const charTokens = (a: CharacterAlignment): TimedToken[] =>
  a.characters.map((text, i) => ({
    text,
    start: a.character_start_times_seconds[i] ?? Number.NaN,
    end: a.character_end_times_seconds[i] ?? Number.NaN,
  }));

/**
 * Waktu awal kalimat tidak boleh mundur (objek timestamps menolaknya): kalimat yang mulainya sebelum
 * kalimat sebelumnya dianggap tidak terpetakan.
 */
export function monotonic(
  spans: readonly ([number, number] | null)[],
): ([number, number] | null)[] {
  let last = 0;
  return spans.map((s) => {
    if (s === null || s[0] < last) return null;
    last = s[0];
    return s;
  });
}
