import { ScriptError, digestScript } from "@surau/core";
import type { DigestView } from "@surau/core";

import { followSrc, followTargets } from "../../components/listen/follow-targets";
import type { FollowData } from "../../components/listen/follow-targets";
import type { ListenTrack } from "../../components/listen/track";

/**
 * Data sorotan kalimat halaman Intisari (X18, ADR-104): target kalimat dari skrip audio yang sama
 * dengan yang dibacakan (`digestScript`, deterministik; ingest hanya memuat audio yang sha skripnya
 * cocok) + objek timestamps-nya. null bila audio tanpa timestamps atau skrip gagal dibangun.
 */
export async function digestFollow(
  digest: DigestView,
  track: ListenTrack | null,
  mediaOrigin?: string,
): Promise<FollowData | null> {
  const key = digest.audio?.alignment_key ?? null;
  if (track === null || key === null) return null;
  try {
    const script = await digestScript(digest);
    return {
      trackKey: track.key,
      scriptSha: script.sha256,
      src: followSrc(key, mediaOrigin),
      targets: followTargets(script),
    };
  } catch (error) {
    // Skrip yang ditolak tidak punya audio yang cocok (ingest menggugurkannya): tanpa sorotan.
    if (error instanceof ScriptError) return null;
    throw error;
  }
}
