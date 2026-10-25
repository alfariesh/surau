// Baris `audio_track` korpus staging (X17d): supaya Preview menampilkan tombol Dengarkan sebelum
// korpus berikutnya dibangun. Isinya sama dengan yang akan dimuat ingest (`selectAudioTracksIn` atas
// manifest ter-commit), jadi build berikutnya tidak mengubah apa pun. Hanya staging: korpus produksi
// berganti lewat `corpus:promote`, tidak pernah ditulis alat ini.
import type { AudioTrackRow, D1Db } from "@surau/db";

/**
 * Ganti `audio_track` satu edisi di staging dengan `rows` dalam satu batch (transaksi D1). Audio
 * edisi lain tidak disentuh.
 */
export async function replaceStagingAudio(
  db: D1Db,
  editionId: number,
  rows: readonly AudioTrackRow[],
): Promise<void> {
  const statements = [
    db
      .prepare(
        "DELETE FROM audio_track WHERE toc_node_id IN (SELECT id FROM toc_node WHERE edition_id = ?1)",
      )
      .bind(editionId),
  ];
  for (const row of rows) {
    const columns = Object.keys(row);
    statements.push(
      db
        .prepare(
          `INSERT INTO audio_track (${columns.join(", ")}) VALUES (${columns.map((_, i) => `?${i + 1}`).join(", ")})`,
        )
        .bind(...Object.values(row)),
    );
  }
  await db.batch(statements);
}
