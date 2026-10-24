// Pemuat `audio_track` (X17, ADR-097 butir 6, ADR-100): baris audio korpus berasal dari metadata
// ter-commit `data/audio/<kitab>-audio.json`, dan hanya dimuat bila sha skripnya sama dengan skrip
// yang dibangun ulang dari Intisari di build ini. Skrip dibangun dengan `loadDigestScript` (core) atas
// .sqlite hasil build, yaitu fungsi yang sama dengan yang dipakai alat audio saat membuat audio, jadi
// gagasan yang ditolak, kutipan yang ditahan, atau Intisari yang berubah otomatis menggugurkan audionya.
import { existsSync, readFileSync } from "node:fs";

import {
  NotFound,
  ScriptError,
  audioManifest,
  loadDigestScript,
  selectAudioTracks,
} from "@surau/core";
import type { AudioSelection } from "@surau/core";

import { sqliteD1 } from "./sqlite-d1.ts";
import { openReadOnly } from "./sqlite.ts";

/** Pilih baris `audio_track` untuk build di `sqlitePath`; manifest tidak ada = tanpa audio. */
export async function selectBuildAudio(
  sqlitePath: string,
  manifestPath: string,
): Promise<AudioSelection> {
  if (!existsSync(manifestPath)) return { rows: [], dropped: [] };
  const manifest = audioManifest.parse(JSON.parse(readFileSync(manifestPath, "utf8")));
  if (manifest.tracks.length === 0) return { rows: [], dropped: [] };
  const sqlite = openReadOnly(sqlitePath);
  try {
    const db = sqliteD1(sqlite);
    const scripts = new Map<string, string>();
    const failed = new Set<string>();
    const wanted = new Set(manifest.tracks.map((t) => `${t.toc_node_id}:${t.lang}`));
    for (const key of wanted) {
      const [node, lang] = key.split(":") as [string, string];
      try {
        const loaded = await loadDigestScript(db, Number(node), lang);
        if (loaded !== null) scripts.set(key, loaded.script.sha256);
      } catch (error) {
        // Node yang tidak ada lagi di build ini, atau skripnya tidak bisa dibangun: audionya gugur
        // (dilaporkan), bukan menggagalkan build.
        if (error instanceof ScriptError || error instanceof RangeError) failed.add(key);
        else if (!(error instanceof NotFound)) throw error;
      }
    }
    return selectAudioTracks(manifest, scripts, failed);
  } finally {
    sqlite.close();
  }
}

/** Ringkasan untuk keluaran CLI ingest. */
export function audioReport(selection: AudioSelection): string {
  const count = (reason: string) => selection.dropped.filter((d) => d.reason === reason).length;
  return (
    `Audio: ${selection.rows.length} track dimuat; gugur: skrip berubah ${count("stale_script")}, ` +
    `tanpa Intisari ${count("no_digest")}, skrip gagal ${count("script_error")}, ` +
    `digantikan ${count("superseded")}`
  );
}
