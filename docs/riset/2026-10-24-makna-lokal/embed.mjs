// X13 (ADR-093): embedding lokal bge-m3 (ONNX q8) atas ekspor korpus, di luar pipeline dan di luar CI.
// Pakai: node embed.mjs <korpus.jsonl> <folder-keluaran> [mix|ar]
// korpus.jsonl = baris {id, ar, tr} (Arab mentah, terjemahan AI atau null) dari korpus staging.
import { env, pipeline } from "@huggingface/transformers";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [, , korpus, outDir, variant = "mix"] = process.argv;
env.cacheDir = join(outDir, "hf-cache");
const rows = readFileSync(korpus, "utf8").trim().split("\n").map((l) => JSON.parse(l));
// mix = terjemahan AI bila ada (pertanyaan berbahasa Indonesia), selain itu Arab (catatan kaki takhrij).
const pick = (r) => (variant === "ar" ? r.ar : (r.tr ?? r.ar));
const items = rows.map((r, i) => ({ i, text: pick(r).slice(0, 2000) }));
items.sort((a, b) => a.text.length - b.text.length); // batch sepanjang mirip = padding kecil
const fe = await pipeline("feature-extraction", "Xenova/bge-m3", { dtype: "q8" });
const dim = 1024;
const out = new Float32Array(items.length * dim);
const t0 = Date.now();
for (let s = 0; s < items.length; s += 8) {
  const batch = items.slice(s, s + 8);
  const t = await fe(
    batch.map((x) => x.text),
    { pooling: "cls", normalize: true, truncation: true, max_length: 512 },
  );
  batch.forEach((x, k) => out.set(t.data.subarray(k * dim, (k + 1) * dim), x.i * dim));
  if ((s / 8) % 50 === 0) process.stderr.write(`${s + batch.length}/${items.length}\n`);
}
writeFileSync(join(outDir, `vec-${variant}.f32`), Buffer.from(out.buffer));
writeFileSync(join(outDir, `vec-${variant}.ids.json`), JSON.stringify(rows.map((r) => r.id)));
console.log("selesai", items.length, `${((Date.now() - t0) / 1000).toFixed(0)} dtk`);
