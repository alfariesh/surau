// X13 (ADR-093): peringkat makna (cosine, 200 teratas) per soal Jawab atas vektor embed.mjs.
// Pakai: node rank.mjs <folder-vektor> <soal.jsonl> <keluaran.jsonl> [mix|ar] [--privat] [--korpus korpus.jsonl]
// Dengan --korpus (ekspor {id, kind, …}), baris juga memuat `footnote_ids`: 50 catatan kaki teratas
// (daftar makna takhrij, dipakai pipeline hanya untuk soal yang ditandai routing sebagai soal hadits).
// Bawaan hanya soal publik (j…). --privat menyertakan holdout (p…) untuk run holdout berbayar atas
// izin pemilik; teks soal tidak dicetak dan keluarannya hanya ID (aturan holdout ADR-045).
import { env, pipeline } from "@huggingface/transformers";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const withPrivate = args.includes("--privat");
const k = args.indexOf("--korpus");
const korpus = k >= 0 ? args[k + 1] : null;
const [dir, soal, out, variant = "mix"] = args.filter(
  (a, i) => a !== "--privat" && (k < 0 || (i !== k && i !== k + 1)),
);
env.cacheDir = join(dir, "hf-cache");
const ids = JSON.parse(readFileSync(join(dir, `vec-${variant}.ids.json`), "utf8"));
const buf = readFileSync(join(dir, `vec-${variant}.f32`));
const vec = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
const dim = 1024;
const footIdx = korpus
  ? (() => {
      const kind = new Map(
        readFileSync(korpus, "utf8")
          .trim()
          .split("\n")
          .map((l) => JSON.parse(l))
          .map((r) => [r.id, r.kind]),
      );
      return ids.map((id, i) => (kind.get(id) === "foot" ? i : -1)).filter((i) => i >= 0);
    })()
  : null;
const pattern = withPrivate ? /^[jp]\d{3}$/ : /^j\d{3}$/;
const qs = readFileSync(soal, "utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l))
  .filter((q) => pattern.test(q.id));
const fe = await pipeline("feature-extraction", "Xenova/bge-m3", { dtype: "q8" });
const lines = [];
for (const q of qs) {
  const e = (await fe([q.pertanyaan], { pooling: "cls", normalize: true })).data;
  const scores = new Float32Array(ids.length);
  for (let i = 0; i < ids.length; i++) {
    let s = 0;
    for (let d = 0; d < dim; d++) s += vec[i * dim + d] * e[d];
    scores[i] = s;
  }
  const top = [...scores.keys()].sort((a, b) => scores[b] - scores[a]).slice(0, 200);
  const row = { id: q.id, passage_ids: top.map((i) => ids[i]) };
  if (footIdx)
    row.footnote_ids = [...footIdx]
      .sort((a, b) => scores[b] - scores[a])
      .slice(0, 50)
      .map((i) => ids[i]);
  lines.push(JSON.stringify(row));
}
writeFileSync(out, lines.join("\n") + "\n", { mode: 0o600 });
console.log("peringkat", lines.length);
