// Serah-terima pertanyaan dari kotak cari Beranda ke /tanya (ADR-086). Hanya di memori tab (variabel
// modul): tidak lewat alamat (`?q=`), supaya memuat ulang atau membagikan tautan tidak mengirim
// pertanyaan lagi (kuota), dan tidak di penyimpanan perangkat (riwayat Maknaz hanya di memori tab,
// ADR-073). Titipan kedaluwarsa sesudah MAX_AGE_MS: navigasi yang batal tidak membuat kunjungan
// /tanya berikutnya bertanya sendiri. Di server (isolate Workers dipakai bersama lintas permintaan)
// titipan tidak pernah disimpan maupun dibaca.

const MAX_AGE_MS = 10_000;

export interface HandOff {
  question: string;
  /** Sitekey Turnstile bila status Jawab meminta tantangan: /tanya membuka tantangan dulu. */
  sitekey: string | null;
}

let pending: (HandOff & { at: number }) | null = null;

const onServer = () => typeof window === "undefined";

export function handOffQuestion(question: string, sitekey: string | null, now = Date.now()): void {
  if (onServer()) return;
  pending = { question, sitekey, at: now };
}

/**
 * Titipan yang masih berlaku, tanpa mengambilnya (aman dipanggil berulang saat render). Umur hanya
 * diputuskan di sini: titipan yang sudah tampil sebagai giliran tetap dikirim oleh `takeHandOff`.
 */
export function peekHandOff(now = Date.now()): HandOff | null {
  if (onServer() || pending === null) return null;
  if (now - pending.at > MAX_AGE_MS) {
    pending = null;
    return null;
  }
  return { question: pending.question, sitekey: pending.sitekey };
}

/**
 * Ambil sekali, tanpa memeriksa umur lagi: pemanggilan berikutnya mengembalikan null (efek ganda
 * StrictMode = satu kiriman).
 */
export function takeHandOff(): HandOff | null {
  const taken = pending;
  pending = null;
  return taken === null ? null : { question: taken.question, sitekey: taken.sitekey };
}

/**
 * Nama transisi bersama (React `<ViewTransition>`): kotak cari Beranda ↔ gelembung pertanyaan
 * pertama di /tanya, supaya kotak "menjadi" gelembung saat berpindah halaman.
 */
export const HANDOFF_TRANSITION = "pertanyaan-beranda";
/** Kelas transisi pasangan itu (CSS `::view-transition-group(.pertanyaan)` di globals.css). */
export const HANDOFF_TRANSITION_CLASS = "pertanyaan";
