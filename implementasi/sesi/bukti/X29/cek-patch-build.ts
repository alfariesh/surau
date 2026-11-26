// Bukti X29 / T-35: entri patch ayat menjadi rujukan di build, teks bertanda berisi placeholder,
// dan paragraf terkena tidak lagi membawa terjemahan Indonesia lama. Hanya membaca SQLite build.
//   node tools/ingest/src/_cek-patch-build.ts   (salinan arsip: implementasi/sesi/bukti/X29/cek-patch-build.ts)
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { maskAyat } from "@surau/core";
import { parse } from "yaml";

const patch = parse(readFileSync("data/patches/ihya-9472-ayat.yaml", "utf8"));
const entries: any[] = patch.entries ?? Object.values(patch).find(Array.isArray);
const db = new DatabaseSync("data/build/surau-corpus-ihya-v9.sqlite", { readOnly: true });
const pids = [...new Set(entries.map((e) => e.passage_id))];
let placeholders = 0, covered = 0, withOldId = 0;
for (const pid of pids) {
  const p = db.prepare("SELECT text_raw FROM passage WHERE id=?").get(pid) as any;
  const refs = db.prepare("SELECT * FROM passage_ayah_ref WHERE passage_id=?").all(pid) as any[];
  const fn = db.prepare("SELECT * FROM footnote_ref WHERE passage_id=?").all(pid) as any[];
  placeholders += (maskAyat(p.text_raw, refs, fn).text.match(/⟦QS /g) ?? []).length;
  const want = entries.filter((e) => e.passage_id === pid);
  if (want.every((e) => refs.some((r) => r.char_start === e.char_start && r.char_end === e.char_end && r.surah === e.surah && r.ayah_from === e.ayah_from))) covered++;
  if (db.prepare("SELECT 1 FROM translation WHERE passage_id=? AND lang='id'").get(pid)) withOldId++;
}
const meta = db.prepare("SELECT value FROM meta WHERE key='built_at'").get() as any;
console.log(JSON.stringify({ built_at: meta.value, entries: entries.length, passages: pids.length, passagesAllEntriesAsRefs: covered, placeholdersInMaskedText: placeholders, affectedWithIdTranslation: withOldId }, null, 1));
