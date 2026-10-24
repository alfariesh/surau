// Tag ID3v2.4 berkas audio Intisari (X17, docs/05 §12): label "dibacakan suara AI", lisensi, dan
// atribusi ikut di metadata berkas, jadi tetap terbawa bila MP3 diunduh atau diputar di luar Surau.
// Ditulis sendiri (± 60 baris) karena hanya perlu beberapa bingkai teks UTF-8 + URL; deterministik
// (urutan tetap, tanpa tanggal "sekarang") supaya sidik berkas bisa direproduksi dari cache.

export interface Id3Tags {
  /** TIT2: judul berkas. */
  title: string;
  /** TPE1: pembaca (selalu menyebut suara AI untuk suara sintetis). */
  artist: string;
  /** TALB. */
  album: string;
  /** TLAN: kode bahasa ISO 639-2, mis. `ind`. */
  language: string;
  /** TDRC: tanggal rekam `YYYY-MM-DD`. */
  date: string;
  /** TCOP: "<tahun> <pemegang>, <lisensi>" (ID3 mewajibkan diawali tahun). */
  copyright: string;
  /** WCOP: URL lisensi. */
  licenseUrl: string;
  /** WOAS: URL halaman sumber (halaman Intisari). */
  sourceUrl: string;
  /** COMM: label lengkap + atribusi teks sumber. */
  comment: string;
  /** TXXX: pasangan tambahan, mis. `AI_GENERATED`. */
  extra: Readonly<Record<string, string>>;
  /** TSSE: alat + versi skrip/leksikon. */
  encoder: string;
}

const utf8 = new TextEncoder();

/** Bilangan 28-bit synchsafe (7 bit per byte), dipakai ukuran tag dan bingkai v2.4. */
export function synchsafe(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 0 || n >= 2 ** 28) throw new RangeError(`ukuran ID3: ${n}`);
  return Uint8Array.of((n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f);
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function frame(id: string, body: Uint8Array): Uint8Array {
  return concat([utf8.encode(id), synchsafe(body.length), Uint8Array.of(0, 0), body]);
}

/** Bingkai teks UTF-8 (encoding 3). */
const text = (id: string, value: string) =>
  frame(id, concat([Uint8Array.of(3), utf8.encode(value)]));

/** Bingkai URL (ISO-8859-1; hanya ASCII yang diterima). */
function url(id: string, value: string): Uint8Array {
  if (!/^[\x20-\x7e]+$/u.test(value)) throw new RangeError(`URL ID3 harus ASCII: ${value}`);
  return frame(id, utf8.encode(value));
}

/** Tag ID3v2.4 lengkap (header + bingkai, tanpa padding). */
export function id3v2(tags: Id3Tags): Uint8Array {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(tags.date)) throw new RangeError(`tanggal ID3: ${tags.date}`);
  if (!/^\d{4} /u.test(tags.copyright)) throw new RangeError("TCOP harus diawali tahun");
  const frames = [
    text("TIT2", tags.title),
    text("TPE1", tags.artist),
    text("TALB", tags.album),
    text("TLAN", tags.language),
    text("TDRC", tags.date),
    text("TCOP", tags.copyright),
    url("WCOP", tags.licenseUrl),
    url("WOAS", tags.sourceUrl),
    frame(
      "COMM",
      concat([
        Uint8Array.of(3),
        utf8.encode(tags.language.slice(0, 3)),
        Uint8Array.of(0),
        utf8.encode(tags.comment),
      ]),
    ),
    ...Object.entries(tags.extra).map(([k, v]) =>
      frame("TXXX", concat([Uint8Array.of(3), utf8.encode(k), Uint8Array.of(0), utf8.encode(v)])),
    ),
    text("TSSE", tags.encoder),
  ];
  const body = concat(frames);
  return concat([utf8.encode("ID3"), Uint8Array.of(4, 0, 0), synchsafe(body.length), body]);
}
