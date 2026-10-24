// CLI audio "Dengarkan" (X17, ADR-097 butir 6, ADR-100). Dari root: `pnpm audio <perintah>`.
// Skrip dibangun dari Intisari di korpus staging (hanya SELECT, perlu `pnpm wrangler login`). Kunci
// ElevenLabs dibaca dari environment atau `.env` (T-29) hanya oleh perintah yang memanggil API;
// nilainya tidak pernah dicetak. Pembuatan audio BERBAYAR: hanya dengan izin pemilik di chat.
//   plan [--node a,b] [--voice ID] [--min-chars 900]   karakter per Intisari vs kuota (gratis)
//   sample --voice ID [--voice-name NAMA] [--confirm]  uji dengar lafal leksikon (berbayar, ±1–2 rb kar.)
//   submit --voice ID [--voice-name NAMA] --budget-chars N [--node a,b] [--min-chars 900] [--confirm]
//                         buat audio (berbayar; tanpa --confirm hanya rencana); niat dicatat sebelum
//                         setiap permintaan dan tanda terima sesudahnya (ADR-061)
//   upload [--confirm]    unggah berkas rakitan ke R2 surau-media (tidak pernah menimpa)
//   manifest              catat berkas yang sudah di R2 ke data/audio/<kitab>-audio.json
//   verify                HEAD + Range + sha256 setiap objek di manifest (gagal → kode 1)
//   status                niat yang belum selesai, cache, biaya aktual
//   release               lepas niat yang prosesnya sudah mati (cek riwayat ElevenLabs dulu)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { SCRIPT_LABEL, loadDigestScript } from "@surau/core";
import { AI_TEXT_LANG, listDigestHeaders, listTitleTranslations } from "@surau/db";
import type { D1Db } from "@surau/db";
import { z } from "zod";

import { openStagingCorpus } from "./corpus.ts";
import { lexiconSample, parseLexicon } from "./lexicon.ts";
import type { Lexicon } from "./lexicon.ts";
import { mergeTracks, readManifest, writeManifest } from "./manifest-file.ts";
import { parseMp3, samplesToMs } from "./mp3.ts";
import { ELEVENLABS_CAPABILITIES, ElevenLabs } from "./providers/elevenlabs.ts";
import { headObject, uploadObject, verifyObject } from "./r2.ts";
import { renderNode, uncachedChars } from "./render.ts";
import type { RenderInput } from "./render.ts";
import {
  appendReceipt,
  audioStore,
  billedChars,
  listIntents,
  listRendered,
  pidAlive,
  readReceipts,
  removeIntent,
  writeAtomic,
} from "./store.ts";
import { MEDIA, SITE_ORIGIN, SPOKEN_CHARS_PER_MINUTE, WORKS } from "./works.ts";
import type { AudioWork } from "./works.ts";

const repo = resolve(import.meta.dirname, "../../..");

/** `.env` repo ini, lalu `.env` checkout utama bila dijalankan dari worktree git. */
function envFiles(): string[] {
  const files = [join(repo, ".env")];
  try {
    const common = execFileSync(
      "git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      {
        cwd: repo,
        encoding: "utf8",
      },
    ).trim();
    files.push(join(dirname(common), ".env"));
  } catch {
    // Bukan repo git: cukup .env di root.
  }
  return [...new Set(files)];
}

function apiKey(): string {
  if (!process.env.ELEVENLABS_API_KEY) {
    for (const file of envFiles()) {
      if (existsSync(file)) {
        process.loadEnvFile(file);
        if (process.env.ELEVENLABS_API_KEY) break;
      }
    }
  }
  const key = process.env.ELEVENLABS_API_KEY;
  if (key === undefined || key.trim() === "") {
    throw new Error("Kunci ElevenLabs belum ada: kerjakan T-29 (ELEVENLABS_API_KEY di .env).");
  }
  return key;
}

const loadLexicon = (lang: string): Lexicon =>
  parseLexicon(readFileSync(join(repo, "data/lexicon", `${lang}.yaml`), "utf8"));

const nodeList = z
  .string()
  .transform((s) => s.split(",").map((n) => z.coerce.number().int().positive().parse(n.trim())));

interface Candidate {
  input: RenderInput;
  chars: number;
}

/** Intisari di staging yang akan dibacakan (skrip sudah dibangun), urut node. */
async function candidates(
  db: D1Db,
  work: AudioWork,
  opts: { nodes: number[] | undefined; minChars: number; voice: { id: string; name: string } },
): Promise<Candidate[]> {
  const lang = AI_TEXT_LANG;
  const headers = await listDigestHeaders(db, work.editionId, lang);
  const titles = await listTitleTranslations(db, work.editionId, lang);
  const titleOf = new Map(
    (titles?.toc ?? [])
      .filter((t) => t.review_status !== "rejected")
      .map((t) => [t.toc_node_id, t.text]),
  );
  const lexicon = loadLexicon(lang);
  const wanted = opts.nodes === undefined ? null : new Set(opts.nodes);
  const out: Candidate[] = [];
  for (const h of headers) {
    if (wanted !== null && !wanted.has(h.toc_node_id)) continue;
    const loaded = await loadDigestScript(db, h.toc_node_id, lang);
    if (loaded === null) continue;
    const { view, script } = loaded;
    // Ambang durasi dengar hanya untuk pemilihan massal; node yang disebut eksplisit selalu ikut.
    if (wanted === null && script.chars < opts.minChars) continue;
    out.push({
      chars: script.chars,
      input: {
        view,
        script,
        title: titleOf.get(h.toc_node_id) ?? `Bagian ${h.toc_node_id}`,
        voice: opts.voice,
        lexicon,
        work: { slug: work.slug, title: view.source.work.title_id ?? work.title },
        siteOrigin: SITE_ORIGIN,
      },
    });
  }
  return out;
}

function guardIntents(): void {
  const store = audioStore(repo);
  const open = listIntents(store);
  if (open.length === 0) return;
  const alive = open.filter((i) => pidAlive(i.pid));
  if (alive.length > 0) {
    throw new Error(`submit lain masih berjalan (PID ${alive.map((i) => i.pid).join(", ")}).`);
  }
  throw new Error(
    `${open.length} permintaan terputus dan MUNGKIN sudah tertagih (${open.map((i) => `node ${i.node_id} segmen ${i.segment}`).join("; ")}). ` +
      "Cek Speech History ElevenLabs, lalu `pnpm audio release` untuk melepas tandanya.",
  );
}

const minutes = (chars: number) => (chars / SPOKEN_CHARS_PER_MINUTE).toFixed(1);

async function main(argv: string[]): Promise<number> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      work: { type: "string", default: "ihya" },
      node: { type: "string" },
      voice: { type: "string" },
      "voice-name": { type: "string" },
      "min-chars": { type: "string", default: String(SPOKEN_CHARS_PER_MINUTE) },
      "budget-chars": { type: "string" },
      confirm: { type: "boolean", default: false },
    },
  });
  const work = WORKS[values.work];
  if (work === undefined) throw new Error(`Karya tidak dikenal: ${values.work}`);
  const store = audioStore(repo);
  const nodes = values.node === undefined ? undefined : nodeList.parse(values.node);
  const minChars = z.coerce.number().int().nonnegative().parse(values["min-chars"]);
  const command = positionals[0];

  switch (command) {
    case "plan":
    case "submit": {
      if (command === "submit") guardIntents();
      const paid = command === "submit" && values.confirm;
      const voiceId = values.voice;
      if (command === "submit" && voiceId === undefined) {
        throw new Error("--voice <voice_id> wajib (suara pilihan T-31).");
      }
      let provider: ElevenLabs | null = null;
      try {
        provider = new ElevenLabs({ apiKey: apiKey() });
      } catch (error) {
        if (paid) throw error;
        console.log(error instanceof Error ? error.message : String(error));
      }
      const voiceName =
        values["voice-name"] ??
        (provider !== null && voiceId !== undefined
          ? (await provider.voice(voiceId))?.name
          : undefined);
      if (paid && voiceName === undefined) {
        throw new Error("Nama suara tidak terbaca dengan kunci ini: isi --voice-name <nama>.");
      }
      const corpus = await openStagingCorpus(repo);
      try {
        const list = await candidates(corpus.db, work, {
          nodes,
          minChars,
          voice: { id: voiceId ?? "", name: voiceName ?? "?" },
        });
        let total = 0;
        let pending = 0;
        console.log(`Korpus: ${corpus.source}. Intisari terpilih: ${list.length}.`);
        for (const c of list) {
          const todo =
            voiceId === undefined
              ? c.chars
              : uncachedChars(store, c.input, ELEVENLABS_CAPABILITIES);
          total += c.chars;
          pending += todo;
          console.log(
            `  ${c.input.script.node_id} ${c.input.view.tier.padEnd(7)} ${String(c.chars).padStart(6)} kar ±${minutes(c.chars)} mnt  belum: ${String(todo).padStart(6)}  ${c.input.title}`,
          );
        }
        console.log(
          `Jumlah: ${total} karakter (±${minutes(total)} menit); belum dibuat: ${pending} karakter.`,
        );
        console.log(
          `Biaya v4 ±US$${((pending / 1000) * 0.08).toFixed(2)} (US$0,08/1.000 karakter).`,
        );
        const spent = billedChars(readReceipts(store));
        console.log(`Sudah tertagih sejauh ini (tanda terima): ${spent} karakter.`);
        let quotaLeft: number | null = null;
        if (provider !== null) {
          const quota = await provider.quota();
          if (quota === null) {
            console.log(
              "Kuota akun tidak terbaca dengan kunci ini (izin user_read); pakai --budget-chars.",
            );
          } else {
            quotaLeft = quota.limit - quota.used;
            console.log(
              `Kuota ElevenLabs: ${quota.used}/${quota.limit} terpakai, sisa ${quotaLeft} (reset ${quota.resetsAt ?? "?"}).`,
            );
          }
        }
        if (!paid) {
          console.log("Tidak ada permintaan berbayar yang dikirim (tanpa --confirm).");
          return 0;
        }
        const budgetArg = values["budget-chars"];
        if (budgetArg === undefined) throw new Error("--confirm wajib bersama --budget-chars <n>.");
        const budget = { remaining: z.coerce.number().int().positive().parse(budgetArg) };
        if (quotaLeft !== null && quotaLeft < budget.remaining) budget.remaining = quotaLeft;
        let billed = 0;
        for (const c of list) {
          const outcome = await renderNode(store, provider!, c.input, budget);
          billed += outcome.billed;
          if (outcome.status === "budget") {
            console.log(
              `Berhenti: pagu tersisa ${budget.remaining} < ${outcome.needed} karakter (node ${c.input.script.node_id}).`,
            );
            break;
          }
          const t = outcome.rendered.track;
          console.log(
            `  ${outcome.status === "reused" ? "ada" : "dibuat"} ${t.r2_key} ${(t.duration_ms / 60_000).toFixed(1)} mnt, ${t.chapters.length} bab`,
          );
        }
        console.log(`Tertagih putaran ini: ${billed} karakter.`);
        return 0;
      } finally {
        await corpus.dispose();
      }
    }
    case "sample": {
      if (values.voice === undefined) throw new Error("--voice <voice_id> wajib.");
      const lexicon = loadLexicon(AI_TEXT_LANG);
      const text = lexiconSample(
        lexicon,
        `${SCRIPT_LABEL} Contoh lafal: bawaan, lalu dengan leksikon.`,
      );
      console.log(
        `Sampel leksikon ${lexicon.version}: ${text.length} karakter (±US$${((text.length / 1000) * 0.08).toFixed(2)}).`,
      );
      if (!values.confirm) {
        console.log(text);
        console.log("Tidak dikirim (tanpa --confirm).");
        return 0;
      }
      guardIntents();
      const provider = new ElevenLabs({ apiKey: apiKey() });
      const result = await provider.synthesize({
        text,
        voiceId: values.voice,
        languageCode: AI_TEXT_LANG,
        previousRequestIds: [],
      });
      const stream = parseMp3(result.audio);
      const at = new Date().toISOString();
      const file = join(
        store.root,
        "samples",
        `${at.slice(0, 16).replace(/[-:]/gu, "")}-${values.voice}.mp3`,
      );
      writeAtomic(file, result.audio);
      appendReceipt(store, {
        key: `sample-${lexicon.version}`,
        node_id: 0,
        provider: ELEVENLABS_CAPABILITIES.provider,
        model: ELEVENLABS_CAPABILITIES.model,
        voice_id: values.voice,
        chars: text.length,
        character_cost: result.characterCost,
        request_id: result.requestId,
        at,
      });
      console.log(
        `Sampel: ${file} (${(samplesToMs(stream.samples, stream.format.sampleRate) / 1000).toFixed(1)} dtk, tertagih ${result.characterCost ?? text.length}).`,
      );
      return 0;
    }
    case "upload": {
      const rendered = listRendered(store);
      for (const r of rendered) {
        const result = await uploadObject({
          target: MEDIA,
          key: r.track.r2_key,
          file: join(store.root, r.file),
          bytes: r.track.bytes,
          repo,
          confirm: values.confirm,
        });
        console.log(`  ${result.padEnd(8)} ${r.track.r2_key}`);
      }
      if (!values.confirm)
        console.log("Tanpa --confirm: hanya diperiksa, tidak ada yang diunggah.");
      return 0;
    }
    case "manifest": {
      const uploaded = [];
      for (const r of listRendered(store)) {
        const head = await headObject(fetch, MEDIA.origin, r.track.r2_key, true);
        if (head.status === 200 && head.bytes === r.track.bytes) uploaded.push(r.track);
        else console.log(`  belum di R2: ${r.track.r2_key} (HEAD ${head.status})`);
      }
      const { manifest, added } = mergeTracks(readManifest(repo, work), uploaded);
      writeManifest(repo, work, manifest);
      console.log(`${work.manifest}: ${added.length} track baru, ${manifest.tracks.length} total.`);
      return 0;
    }
    case "verify": {
      const manifest = readManifest(repo, work);
      let failed = 0;
      for (const t of manifest.tracks) {
        const r = await verifyObject(fetch, manifest.media_origin, t);
        if (!r.ok) failed++;
        console.log(
          `  ${r.ok ? "lolos" : "GAGAL"} ${r.key}${r.problems.length > 0 ? ` (${r.problems.join("; ")})` : ""}`,
        );
      }
      console.log(
        `${manifest.tracks.length - failed}/${manifest.tracks.length} objek lolos (HEAD + Range + sha256).`,
      );
      return failed === 0 ? 0 : 1;
    }
    case "status": {
      const intents = listIntents(store);
      for (const i of intents) {
        console.log(
          `  niat ${pidAlive(i.pid) ? "berjalan" : "TERPUTUS"}: node ${i.node_id} segmen ${i.segment} (${i.chars} kar, ${i.started_at})`,
        );
      }
      const receipts = readReceipts(store);
      console.log(
        `Tanda terima: ${receipts.length} permintaan, ${billedChars(receipts)} karakter tertagih (±US$${((billedChars(receipts) / 1000) * 0.08).toFixed(2)}).`,
      );
      console.log(
        `Berkas rakitan: ${listRendered(store).length}. Track di manifest: ${readManifest(repo, work).tracks.length}.`,
      );
      return 0;
    }
    case "release": {
      for (const i of listIntents(store)) {
        if (pidAlive(i.pid)) {
          console.log(`  dibiarkan (proses ${i.pid} masih hidup): ${i.key}`);
          continue;
        }
        removeIntent(store, i.key);
        console.log(
          `  dilepas: node ${i.node_id} segmen ${i.segment} (mungkin sudah tertagih ${i.chars} karakter)`,
        );
      }
      return 0;
    }
    default:
      console.error(
        "Perintah: plan | sample | submit | upload | manifest | verify | status | release",
      );
      return 2;
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
