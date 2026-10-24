import type { DigestAudioView } from "@surau/core";

import { intisari as intisariText } from "../../i18n/id/intisari";

const t = intisariText;

// Slot tombol ▶ Dengarkan (X16 menyiapkan, X17 mengisi dengan `PlayButton` dari `components/listen`
// beserta data `…/intisari/dengar.json`). Tanpa audio (`DigestView.audio` null, semua Intisari
// sampai X17 memuat `audio_track`) slot tidak merender apa pun: tombol yang belum bisa dipakai
// hanya membingungkan. Bila audio sudah ada, sementara hanya durasinya yang tampil (sebaris di
// baris kepala, jadi `span` bertoken, bukan Typography yang merender paragraf).
export function ListenSlot({ nodeId, audio }: { nodeId: number; audio: DigestAudioView | null }) {
  if (audio === null) return null;
  const minutes = Math.max(1, Math.round(audio.duration_ms / 60_000));
  return (
    <span className="text-muted text-sm" data-listen-node={nodeId}>
      {t.listenTime(minutes)}
    </span>
  );
}
