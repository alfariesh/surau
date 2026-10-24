import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { audioObjectKey, emptyAudioManifest, loadDigestScript } from "@surau/core";
import type { AudioManifestTrack } from "@surau/core";
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";

import { PASSAGES, T_CHILD_A, T_CHILD_B, seedCore } from "../../../packages/core/test/fixture.ts";
import { audioReport, selectBuildAudio } from "./audio.ts";
import { sqliteD1 } from "./sqlite-d1.ts";

const repo = join(import.meta.dirname, "../../..");
const AI = "'model-uji', 'intisari-bab@1', '2026-10-24'";

let dir: string;
let dbPath: string;
let manifestPath: string;
let scriptSha: string;

const track = (node: number, file: string, script: string): AudioManifestTrack => ({
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
  script_sha256: script,
  script_version: 1,
  spoken_version: 1,
  lexicon_version: "0123456789ab",
  chapters: [{ point_ord: 1, start_ms: 8000 }],
  characters: 900,
  created_at: "2026-10-25T01:00:00.000Z",
});

// Korpus BUATAN (fixture packages/db + core, bukan teks kitab) dibangun dengan migrasi korpus yang
// sama dengan D1, lalu satu Intisari bab di T_CHILD_A.
beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "surau-ingest-audio-"));
  dbPath = join(dir, "korpus.sqlite");
  manifestPath = join(dir, "audio.json");
  const sqlite = new DatabaseSync(dbPath);
  const migrations = join(repo, "packages/db/migrations/corpus");
  for (const f of readdirSync(migrations)
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    sqlite.exec(readFileSync(join(migrations, f), "utf8"));
  }
  const db = sqliteD1(sqlite);
  await seedCore(db);
  await db.batch([
    db
      .prepare(
        `INSERT INTO digest (toc_node_id, lang, tier, basis, opening, abstract, closing, source_sha256,
           model, prompt_version, created_at)
         VALUES (?, 'id', 'section', 'text', NULL, 'Bagian ini membahas niat.', NULL, ?, ${AI})`,
      )
      .bind(T_CHILD_A, "a".repeat(64)),
    db
      .prepare(
        `INSERT INTO digest_point (toc_node_id, lang, ord, kind, stance, title, body)
         VALUES (?, 'id', 1, 'idea', 'author', 'Al-Ghazali menimbang niat', 'Niat menentukan nilai amal.')`,
      )
      .bind(T_CHILD_A),
    db
      .prepare(
        `INSERT INTO digest_anchor (toc_node_id, lang, point_ord, seq, passage_id, char_start, char_end)
         VALUES (?, 'id', 1, 1, ?, 0, 3)`,
      )
      .bind(T_CHILD_A, PASSAGES.body1),
  ]);
  scriptSha = (await loadDigestScript(db, T_CHILD_A))!.script.sha256;
  sqlite.close();
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("selectBuildAudio (X17)", () => {
  test("hanya track yang sha skripnya sama dengan Intisari build ini yang dimuat", async () => {
    writeFileSync(
      manifestPath,
      JSON.stringify({
        ...emptyAudioManifest("ihya", 1, "https://media.surau.org", "surau-media"),
        tracks: [
          track(T_CHILD_A, "a".repeat(64), scriptSha),
          track(T_CHILD_A, "b".repeat(64), "0".repeat(64)),
          track(T_CHILD_B, "c".repeat(64), scriptSha),
          track(9_999_999, "d".repeat(64), scriptSha),
        ],
      }),
    );
    const selection = await selectBuildAudio(dbPath, manifestPath);
    expect(selection.rows.map((r) => [r.toc_node_id, r.r2_key])).toEqual([
      [T_CHILD_A, audioObjectKey("ihya", "id", T_CHILD_A, "a".repeat(64))],
    ]);
    expect(selection.rows[0]).toMatchObject({ script_sha256: scriptSha, mime: "audio/mpeg" });
    expect(selection.dropped.map((d) => d.reason)).toEqual([
      "stale_script",
      "no_digest",
      "no_digest",
    ]);
    expect(audioReport(selection)).toBe(
      "Audio: 1 track dimuat; gugur: skrip berubah 1, tanpa Intisari 2, digantikan 0",
    );
  });

  test("tanpa manifest atau manifest kosong: tanpa audio", async () => {
    expect(await selectBuildAudio(dbPath, join(dir, "tidak-ada.json"))).toEqual({
      rows: [],
      dropped: [],
    });
    writeFileSync(
      manifestPath,
      JSON.stringify(emptyAudioManifest("ihya", 1, "https://media.surau.org", "surau-media")),
    );
    expect(await selectBuildAudio(dbPath, manifestPath)).toEqual({ rows: [], dropped: [] });
  });
});
