// String pemutar "Dengarkan" (X17, docs/05 §12): label suara AI tampil di tombol, pemutar, dan
// layar kunci (Media Session), sama dengan kalimat label di awal audio dan metadata berkasnya.
import { formatClock } from "../../components/listen/track";

const decimal = (n: number) => String(n).replace(".", ",");

export const listen = {
  play: "Dengarkan",
  resume: "Lanjutkan",
  pause: "Jeda",
  minutes: (n: number) => `${n} menit`,
  aiVoice: "Dibacakan suara AI",
  voiceOf: (kind: "ai" | "human", name: string) =>
    kind === "ai" ? `Dibacakan suara AI (${name})` : `Dibacakan ${name}`,
  player: "Pemutar Intisari",
  back15: "Mundur 15 detik",
  forward15: "Maju 15 detik",
  previous: "Gagasan sebelumnya",
  next: "Gagasan berikutnya",
  speed: (rate: number) => `Kecepatan ${decimal(rate)}×`,
  speedShort: (rate: number) => `${decimal(rate)}×`,
  close: "Tutup pemutar",
  progress: "Posisi dengar",
  progressText: (time: number, duration: number) =>
    `${formatClock(time)} dari ${formatClock(duration)}`,
  intro: "Pembuka",
  chapter: (i: number, n: number) => `Gagasan ${i} dari ${n}`,
  error: "Audio tidak bisa diputar. Periksa sambungan, lalu coba lagi.",
  mediaArtist: "Suara AI · Surau",
  mediaArtistHuman: (name: string) => `${name} · Surau`,
  open: "Buka Intisari",
  devTitle: "Uji pemutar Dengarkan",
  devLead:
    "Halaman uji (tidak diindeks) dengan audio sunyi buatan untuk tes pemutar: putar, jeda, kecepatan, bab, dan lanjut posisi.",
  devOther: "Pindah halaman (pemutar tetap berjalan)",
} as const;
