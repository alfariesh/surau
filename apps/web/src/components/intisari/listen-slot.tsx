import { PlayButton } from "../listen/play-button";
import type { ListenTrack } from "../listen/track";

// Tombol ▶ Dengarkan Intisari (slot X16, diisi X17): blok sendiri di bawah baris kepala (tombol +
// keterangan "Dibacakan suara AI" tidak boleh berada di dalam paragraf baris kepala). Data track
// dihitung rute halaman (`listenTrack`, segmen karya kanonis). Tanpa audio (`DigestView.audio`
// null) slot tidak merender apa pun: tombol yang belum bisa dipakai hanya membingungkan.
export function ListenSlot({ track }: { track: ListenTrack | null }) {
  if (track === null) return null;
  return (
    <div data-listen-slot="">
      <PlayButton track={track} />
    </div>
  );
}
