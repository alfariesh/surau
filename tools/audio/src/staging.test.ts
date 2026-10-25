import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { audioObjectKey, audioTrackRowOf } from "@surau/core";
import type { AudioManifestTrack } from "@surau/core";
import { describe, expect, test } from "vite-plus/test";

import { ED, T_CHILD_A, T_CHILD_B, seedCore } from "../../../packages/core/test/fixture.ts";
import { sqliteD1 } from "../../ingest/src/sqlite-d1.ts";
import { replaceStagingAudio } from "./staging.ts";

const repo = join(import.meta.dirname, "../../..");
const AI = "'model-uji', 'intisari-bab@1', '2026-10-24'";

const row = (node: number, file: string) =>
  audioTrackRowOf({
    toc_node_id: node,
    lang: "id",
    voice_kind: "ai",
    r2_key: audioObjectKey("ihya", "id", node, file),
    sha256: file,
    bytes: 2048,
    duration_ms: 60_000,
    provider: "elevenlabs",
    voice_id: "suara-uji",
    voice_name: "Narator Uji",
    model: "eleven_v4",
    output_format: "mp3_44100_64",
    script_sha256: "0".repeat(64),
    script_version: 3,
    spoken_version: 1,
    lexicon_version: "0123456789ab",
    style: "polos",
    chapters: [{ point_ord: 1, start_ms: 8000 }],
    characters: 900,
    created_at: "2026-10-25T01:00:00.000Z",
  } satisfies AudioManifestTrack);

// Korpus BUATAN (fixture core, bukan teks kitab) dengan migrasi korpus yang sama dengan D1.
async function corpus() {
  const sqlite = new DatabaseSync(":memory:");
  const migrations = join(repo, "packages/db/migrations/corpus");
  for (const f of readdirSync(migrations)
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    sqlite.exec(readFileSync(join(migrations, f), "utf8"));
  }
  const db = sqliteD1(sqlite);
  await seedCore(db);
  for (const node of [T_CHILD_A, T_CHILD_B]) {
    sqlite
      .prepare(
        `INSERT INTO digest (toc_node_id, lang, tier, basis, opening, abstract, closing, source_sha256,
           model, prompt_version, created_at)
         VALUES (?, 'id', 'section', 'text', NULL, 'Bagian ini membahas niat.', NULL, ?, ${AI})`,
      )
      .run(node, "a".repeat(64));
  }
  const keys = () =>
    sqlite
      .prepare("SELECT r2_key FROM audio_track ORDER BY r2_key")
      .all()
      .map((r) => r.r2_key);
  return { db, keys };
}

describe("replaceStagingAudio (X17d)", () => {
  test("mengganti audio edisi itu saja; edisi lain tidak disentuh", async () => {
    const { db, keys } = await corpus();
    const a = row(T_CHILD_A, "a".repeat(64));
    const b = row(T_CHILD_B, "b".repeat(64));
    await replaceStagingAudio(db, ED, [a, b]);
    expect(keys()).toEqual([a.r2_key, b.r2_key].sort());
    await replaceStagingAudio(db, ED, [b]);
    expect(keys()).toEqual([b.r2_key]);
    await replaceStagingAudio(db, ED + 1, []);
    expect(keys()).toEqual([b.r2_key]);
  });
});
