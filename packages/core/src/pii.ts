// Penyamaran data pribadi dalam teks bebas pengguna (S20, docs/05 §8): dipakai sebelum teks
// disimpan atau ditampilkan di /admin dan /tinjau (pesan laporan kesalahan; laporan jawaban S21).
// Deterministik dan konservatif: lebih baik menyamarkan angka yang tidak perlu daripada membiarkan
// nomor telepon atau NIK tersimpan. Nama orang TIDAK dikenali (tidak bisa andal tanpa model);
// keterbatasan ini tercatat di kebijakan privasi.

export interface RedactResult {
  text: string;
  /** Jumlah bagian yang disamarkan. */
  redacted: number;
}

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/giu;
// Deretan angka (boleh dipisah spasi, titik, strip, garis miring, kurung; boleh diawali +) yang
// memuat ≥ 9 digit: nomor telepon (08…, +62…, 021-…), NIK (16 digit), rekening, kartu. Rentang
// tahun (1058-1111) dan tanggal (21/10/2026) yang 8 digit tidak disamarkan.
const DIGITS = /\+?(?:\d[\s.\-/()]{0,2}){8,}\d/gu;
const HANDLE = /(?<![\p{L}\p{N}._%+-])@[\p{L}\p{N}_.]{3,}/gu;

/** Tautan surau.org tanpa query/fragmen dipertahankan (berguna untuk laporan); lainnya disamarkan. */
function keepUrl(raw: string): string | null {
  try {
    const url = new URL(raw.replace(/[.,;:!?)\]]+$/u, ""));
    const host = url.hostname.toLowerCase();
    if (url.protocol === "https:" && (host === "surau.org" || host.endsWith(".surau.org")))
      return `https://${host}${url.pathname}`;
  } catch {
    return null;
  }
  return null;
}

export function redactPii(input: string): RedactResult {
  let redacted = 0;
  const mark = (label: string) => () => {
    redacted++;
    return label;
  };
  let text = input.replace(EMAIL, mark("[email]"));
  text = text.replace(URL_RE, (raw) => {
    const kept = keepUrl(raw);
    if (kept !== null) {
      // Tanda baca penutup kalimat yang ikut tertangkap dikembalikan.
      const tail = raw.slice(raw.replace(/[.,;:!?)\]]+$/u, "").length);
      return kept + tail;
    }
    redacted++;
    return "[tautan]";
  });
  text = text.replace(DIGITS, mark("[nomor]"));
  text = text.replace(HANDLE, mark("[akun]"));
  return { text, redacted };
}
