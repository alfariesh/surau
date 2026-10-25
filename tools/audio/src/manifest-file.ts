// Berkas metadata audio ter-commit `data/audio/<kitab>-audio.json` (X17): dibaca/ditulis alat audio,
// dibaca ingest. Urutan track tetap (node, waktu dibuat) supaya diff git mudah dibaca.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { audioManifest, emptyAudioManifest } from "@surau/core";
import type { AudioManifest, AudioManifestTrack } from "@surau/core";

import { writeAtomic } from "./store.ts";
import { MEDIA } from "./works.ts";
import type { AudioWork } from "./works.ts";

export function readManifest(repo: string, work: AudioWork): AudioManifest {
  const path = join(repo, work.manifest);
  if (!existsSync(path))
    return emptyAudioManifest(work.slug, work.editionId, MEDIA.origin, MEDIA.bucket);
  const manifest = audioManifest.parse(JSON.parse(readFileSync(path, "utf8")));
  if (manifest.work !== work.slug || manifest.edition_id !== work.editionId) {
    throw new Error(
      `${work.manifest} milik ${manifest.work}/${manifest.edition_id}, bukan ${work.slug}`,
    );
  }
  return manifest;
}

export const sortTracks = (tracks: readonly AudioManifestTrack[]): AudioManifestTrack[] =>
  [...tracks].sort(
    (a, b) => a.toc_node_id - b.toc_node_id || a.created_at.localeCompare(b.created_at),
  );

export function writeManifest(repo: string, work: AudioWork, manifest: AudioManifest): void {
  const valid = audioManifest.parse({ ...manifest, tracks: sortTracks(manifest.tracks) });
  writeAtomic(join(repo, work.manifest), `${JSON.stringify(valid, null, 2)}\n`);
}

/**
 * Tambahkan track yang kuncinya belum ada; track lama tidak diubah (riwayat untuk rollback korpus),
 * kecuali rujukan timestamps-nya (X18): audio yang sama mendapat timestamps sesudah dicatat.
 */
export function mergeTracks(
  manifest: AudioManifest,
  tracks: readonly AudioManifestTrack[],
): { manifest: AudioManifest; added: string[]; aligned: string[] } {
  const incoming = new Map(tracks.map((t) => [t.r2_key, t]));
  const aligned: string[] = [];
  const kept = manifest.tracks.map((t) => {
    const next = incoming.get(t.r2_key)?.alignment ?? null;
    if (next === null || next.r2_key === t.alignment?.r2_key) return t;
    aligned.push(t.r2_key);
    return { ...t, alignment: next };
  });
  const known = new Set(manifest.tracks.map((t) => t.r2_key));
  const fresh = tracks.filter((t) => !known.has(t.r2_key));
  return {
    manifest: { ...manifest, tracks: sortTracks([...kept, ...fresh]) },
    added: fresh.map((t) => t.r2_key),
    aligned,
  };
}
