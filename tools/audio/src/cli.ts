// CLI audio "Dengarkan" (X17, ADR-097 butir 6, ADR-100). Dari root: `pnpm audio <perintah>`.
// Skrip dibangun dari Intisari di korpus staging (hanya SELECT, perlu `pnpm wrangler login`). Kunci
// ElevenLabs dibaca dari environment atau `.env` (T-29) hanya oleh perintah yang memanggil API;
// nilainya tidak pernah dicetak. Pembuatan audio BERBAYAR: hanya dengan izin pemilik di chat.
//   plan [--node a,b] [--voice ID] [--min-chars 900]   karakter per Intisari vs kuota (gratis)
//   sample --voice ID [--demo-gaya] [--confirm]  uji dengar lafal leksikon, atau A/B gaya narator
//                         polos vs khidmat (berbayar, ±1–2 rb karakter)
//   (plan/submit) --gaya polos|khidmat   gaya narator (tag audio daftar tetap, ADR-101; bawaan polos)
//   submit --voice ID [--voice-name NAMA] --budget-chars N [--node a,b] [--min-chars 900] [--confirm]
//                         buat audio (berbayar; tanpa --confirm hanya rencana); niat dicatat sebelum
//                         setiap permintaan dan tanda terima sesudahnya (ADR-061)
//                         --timestamps: minta waktu per karakter (sorotan kalimat, X18)
//   align [--node a,b] [--budget-minutes N --confirm]  timestamps per kalimat lewat forced alignment untuk berkas rakitan
//                         yang belum punya (juga audio yang sudah diunggah); berbayar per durasi
//   align-test --voice ID [--confirm]  uji kecil berbayar (±300 karakter): with-timestamps v4 vs
//                         forced alignment atas MP3 yang sama (X18, ADR-104)
//   upload [--confirm]    unggah berkas rakitan (+ timestamps) ke R2 surau-media (tidak pernah menimpa)
//   manifest              catat berkas yang sudah di R2 ke data/audio/<kitab>-audio.json
//   verify                HEAD + Range + sha256 setiap objek di manifest (gagal → kode 1)
//   staging [--confirm]   muat track manifest yang skripnya cocok ke audio_track korpus staging
//                         (Preview menampilkan Dengarkan sebelum korpus berikutnya dibangun)
//   status                niat yang belum selesai, cache, biaya aktual
//   release               lepas niat yang prosesnya sudah mati (cek riwayat ElevenLabs dulu)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  ALIGNMENT_MIME,
  AUDIO_ALIGNMENT_FORMAT,
  ScriptError,
  alignmentJson,
  alignmentObjectKey,
  audioReport,
  loadDigestScript,
  selectAudioTracksIn,
} from "@surau/core";
import type { AudioAlignment, DigestScript } from "@surau/core";
import { AI_TEXT_LANG, listDigestHeaders, listTitleTranslations } from "@surau/db";
import type { D1Db } from "@surau/db";
import { z } from "zod";

import { charTokens, layoutSentences, monotonic, sentenceTimes } from "./align.ts";
import { openStagingCorpus } from "./corpus.ts";
import { applyLexicon, lexiconSample, parseLexicon } from "./lexicon.ts";
import type { Lexicon } from "./lexicon.ts";
import { mergeTracks, readManifest, writeManifest } from "./manifest-file.ts";
import { parseMp3, samplesToMs } from "./mp3.ts";
import { ELEVENLABS_CAPABILITIES, ElevenLabs } from "./providers/elevenlabs.ts";
import { headObject, uploadObject, verifyObject } from "./r2.ts";
import { renderNode, speakableRequest, uncachedChars } from "./render.ts";
import { replaceStagingAudio } from "./staging.ts";
import { TtsError } from "./provider.ts";
import type { RenderInput } from "./render.ts";
import {
  appendAlignReceipt,
  appendReceipt,
  audioStore,
  billedChars,
  listIntents,
  listRendered,
  pidAlive,
  readAlignReceipts,
  readReceipts,
  removeIntent,
  sha256Hex,
  writeAtomic,
  writeIntent,
  writeRenderedMeta,
} from "./store.ts";
import { STYLES, styleDemo } from "./style.ts";
import type { NarratorStyle } from "./style.ts";
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
  opts: {
    nodes: number[] | undefined;
    minChars: number;
    voice: { id: string; name: string };
    timestamps?: boolean;
    style: NarratorStyle;
  },
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
    let loaded: Awaited<ReturnType<typeof loadDigestScript>>;
    try {
      loaded = await loadDigestScript(db, h.toc_node_id, lang);
    } catch (error) {
      // Satu Intisari bermasalah (mis. skrip memuat yang tidak boleh dibacakan) tidak menghentikan
      // yang lain: dilaporkan dan dilewati.
      if (!(error instanceof ScriptError || error instanceof RangeError)) throw error;
      console.log(`  lewati ${h.toc_node_id}: ${error.message}`);
      continue;
    }
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
        style: opts.style,
        work: { slug: work.slug, title: view.source.work.title_id ?? work.title },
        siteOrigin: SITE_ORIGIN,
        timestamps: opts.timestamps ?? false,
      },
    });
  }
  return out;
}

/**
 * Teks forced alignment sebuah skrip: kalimat seperti yang DIUCAPKAN (alias leksikon diterapkan;
 * lafal IPA tidak, karena kata yang sama tetap terucap), dipisah spasi, beserta rentang kalimatnya.
 */
function alignText(script: DigestScript, lexicon: Lexicon) {
  const spoken = script.segments.flatMap((seg) =>
    seg.sentences.map((s) =>
      applyLexicon(s, lexicon, (e) => e.status === "active" && e.alias !== undefined),
    ),
  );
  return layoutSentences(spoken);
}

/** Bentuk ulang waktu kalimat datar menjadi per segmen skrip, urut waktu (objek menolak yang mundur). */
function bySegment(
  script: DigestScript,
  flat: readonly ([number, number] | null)[],
): AudioAlignment["segments"] {
  const ordered = monotonic(flat);
  let k = 0;
  return script.segments.map((seg) => seg.sentences.map(() => ordered[k++] ?? null));
}

const mapped = (segments: AudioAlignment["segments"]) => {
  const all = segments.flat();
  return `${all.filter((s) => s !== null).length}/${all.length}`;
};

/** Teks uji `align-test` (±300 karakter, tanpa huruf Arab): tiga kalimat bergaya Intisari. */
const ALIGN_TEST_TEXT = [
  "Dari kitab Ihya Ulumuddin karya al-Ghazali.",
  "Gagasan pertama. Menurut al-Ghazali, niat yang lurus membuat amal sehari-hari bernilai ibadah, sedangkan riya merusaknya dari dalam.",
  "Karena itu ia menganjurkan muhasabah setiap malam: menghitung amal hari itu sebelum tidur, lalu memperbaiki niat untuk esok hari.",
];

const delta = (a: [number, number] | null, b: [number, number] | null): string =>
  a === null || b === null ? "–" : `${b[0] - a[0]} / ${b[1] - a[1]} ms`;

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
      "budget-minutes": { type: "string" },
      timestamps: { type: "boolean", default: false },
      gaya: { type: "string", default: "polos" },
      "demo-gaya": { type: "boolean", default: false },
      confirm: { type: "boolean", default: false },
    },
  });
  const work = WORKS[values.work];
  if (work === undefined) throw new Error(`Karya tidak dikenal: ${values.work}`);
  const store = audioStore(repo);
  const nodes = values.node === undefined ? undefined : nodeList.parse(values.node);
  const minChars = z.coerce.number().int().nonnegative().parse(values["min-chars"]);
  const command = positionals[0];
  const style = STYLES[values.gaya];
  if (style === undefined) {
    throw new Error(`Gaya tidak dikenal: ${values.gaya} (pilih ${Object.keys(STYLES).join(", ")})`);
  }

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
          timestamps: values.timestamps,
          style,
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
            `  ${outcome.status === "reused" ? "ada" : "dibuat"} ${t.r2_key} ${(t.duration_ms / 60_000).toFixed(1)} mnt, ${t.chapters.length} bab, timestamps ${t.alignment === null ? "belum (pnpm audio align)" : t.alignment.method}`,
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
      // --demo-gaya: uji dengar A/B gaya narator (ADR-101); bawaan: uji lafal leksikon (T-31).
      const text = values["demo-gaya"]
        ? styleDemo("Contoh gaya narator.")
        : lexiconSample(lexicon, "Contoh lafal: bawaan, lalu dengan leksikon.");
      console.log(
        `Sampel ${values["demo-gaya"] ? "gaya narator" : `leksikon ${lexicon.version}`}: ${text.length} karakter (±US$${((text.length / 1000) * 0.08).toFixed(2)}).`,
      );
      if (!values.confirm) {
        console.log(text);
        console.log("Tidak dikirim (tanpa --confirm).");
        return 0;
      }
      guardIntents();
      speakableRequest(text);
      const provider = new ElevenLabs({ apiKey: apiKey() });
      const key = `sample-${sha256Hex(`${values.voice}\n${text}`).slice(0, 16)}`;
      // Niat sebelum permintaan berbayar, tanda terima sesudahnya (ADR-061), sama dengan `submit`.
      writeIntent(store, {
        key,
        node_id: 0,
        segment: 0,
        chars: text.length,
        pid: process.pid,
        started_at: new Date().toISOString(),
      });
      let result;
      try {
        result = await provider.synthesize({
          text,
          voiceId: values.voice,
          languageCode: AI_TEXT_LANG,
          previousRequestIds: [],
        });
      } catch (error) {
        if (error instanceof TtsError && error.charged === "no") removeIntent(store, key);
        throw error;
      }
      const at = new Date().toISOString();
      appendReceipt(store, {
        key,
        node_id: 0,
        provider: ELEVENLABS_CAPABILITIES.provider,
        model: ELEVENLABS_CAPABILITIES.model,
        voice_id: values.voice,
        chars: text.length,
        character_cost: result.characterCost,
        request_id: result.requestId,
        at,
      });
      // Nama memuat jenis + sidik permintaan; bila tetap bentrok, diberi nomor. Audio yang sudah
      // dibayar selalu disimpan dan tidak pernah menimpa sampel lain.
      const kind = values["demo-gaya"] ? "gaya" : "lafal";
      const base = join(
        store.root,
        "samples",
        `${at.slice(0, 16).replace(/[-:]/gu, "")}-${kind}-${key}`,
      );
      let file = `${base}.mp3`;
      for (let n = 2; existsSync(file); n++) file = `${base}-${n}.mp3`;
      writeAtomic(file, result.audio);
      removeIntent(store, key);
      let seconds = "?";
      try {
        const stream = parseMp3(result.audio);
        seconds = (samplesToMs(stream.samples, stream.format.sampleRate) / 1000).toFixed(1);
      } catch {
        // Sampel tetap tersimpan untuk didengar walau tidak bisa diurai penyambung.
      }
      console.log(
        `Sampel: ${file} (${seconds} dtk, tertagih ${result.characterCost ?? text.length}).`,
      );
      return 0;
    }
    case "align": {
      const lexicon = loadLexicon(AI_TEXT_LANG);
      const todo = listRendered(store).filter(
        (r) =>
          r.track.alignment === null &&
          (nodes === undefined || nodes.includes(r.track.toc_node_id)),
      );
      const ms = todo.reduce((n, r) => n + r.track.duration_ms, 0);
      console.log(
        `Berkas rakitan tanpa timestamps: ${todo.length} (${(ms / 60_000).toFixed(1)} menit audio; forced alignment ditagih per durasi, lihat ADR-104).`,
      );
      if (todo.length === 0) return 0;
      if (!values.confirm) {
        console.log("Tidak ada permintaan berbayar yang dikirim (tanpa --confirm).");
        return 0;
      }
      const budgetArg = values["budget-minutes"];
      if (budgetArg === undefined)
        throw new Error("--confirm wajib bersama --budget-minutes <n> (menit audio).");
      let budgetMs = z.coerce.number().positive().parse(budgetArg) * 60_000;
      const provider = new ElevenLabs({ apiKey: apiKey() });
      const corpus = await openStagingCorpus(repo);
      try {
        for (const r of todo) {
          const node = r.track.toc_node_id;
          const loaded = await loadDigestScript(corpus.db, node, r.track.lang);
          // Hanya skrip yang SAMA dengan yang dibacakan: kalimat ke-j harus kalimat yang terucap.
          if (loaded === null || loaded.script.sha256 !== r.track.script_sha256) {
            console.log(`  lewati ${node}: skrip di staging tidak sama dengan audio ini`);
            continue;
          }
          if (r.track.duration_ms > budgetMs) {
            console.log(
              `Berhenti: pagu tersisa ${(budgetMs / 60_000).toFixed(1)} menit (node ${node}).`,
            );
            break;
          }
          budgetMs -= r.track.duration_ms;
          const { script } = loaded;
          const { text, ranges } = alignText(script, lexicon);
          const audio = new Uint8Array(readFileSync(join(store.root, r.file)));
          const result = await provider.align(audio, text);
          appendAlignReceipt(store, {
            node_id: node,
            audio_sha256: r.track.sha256,
            audio_ms: r.track.duration_ms,
            chars: text.length,
            aligner: provider.alignerName,
            at: new Date().toISOString(),
          });
          const segments = bySegment(script, sentenceTimes(text, ranges, result.words));
          const json = alignmentJson({
            format: AUDIO_ALIGNMENT_FORMAT,
            audio_sha256: r.track.sha256,
            script_sha256: script.sha256,
            method: "forced_alignment",
            segments,
          });
          const sha = sha256Hex(json);
          const key = alignmentObjectKey(work.slug, r.track.lang, node, sha);
          const file = `out/${key.split("/").at(-1)}`;
          writeAtomic(join(store.root, file), json);
          writeRenderedMeta(store, {
            ...r,
            alignment_file: file,
            track: {
              ...r.track,
              alignment: {
                r2_key: key,
                sha256: sha,
                bytes: Buffer.byteLength(json),
                method: "forced_alignment",
              },
            },
          });
          console.log(
            `  ${node}: ${mapped(segments)} kalimat terpetakan, loss ${result.loss ?? "?"} → ${key}`,
          );
        }
      } finally {
        await corpus.dispose();
      }
      console.log("Berikutnya: pnpm audio upload --confirm, lalu pnpm audio manifest.");
      return 0;
    }
    case "align-test": {
      if (values.voice === undefined) throw new Error("--voice <voice_id> wajib.");
      const sentences = ALIGN_TEST_TEXT;
      const { text, ranges } = layoutSentences(sentences);
      speakableRequest(text);
      console.log(
        `Uji sorotan: ${text.length} karakter TTS (±US$${((text.length / 1000) * 0.08).toFixed(3)}) + forced alignment atas MP3-nya (±${Math.ceil(text.length / 15)} dtk audio).`,
      );
      if (!values.confirm) {
        console.log(text);
        console.log("Tidak dikirim (tanpa --confirm).");
        return 0;
      }
      guardIntents();
      const provider = new ElevenLabs({ apiKey: apiKey() });
      const key = `align-test-${sha256Hex(`${values.voice}\n${text}`).slice(0, 16)}`;
      writeIntent(store, {
        key,
        node_id: 0,
        segment: 0,
        chars: text.length,
        pid: process.pid,
        started_at: new Date().toISOString(),
      });
      let result;
      try {
        result = await provider.synthesize({
          text,
          voiceId: values.voice,
          languageCode: AI_TEXT_LANG,
          previousRequestIds: [],
          timestamps: true,
        });
      } catch (error) {
        if (error instanceof TtsError && error.charged === "no") removeIntent(store, key);
        throw error;
      }
      const at = new Date().toISOString();
      appendReceipt(store, {
        key,
        node_id: 0,
        provider: ELEVENLABS_CAPABILITIES.provider,
        model: ELEVENLABS_CAPABILITIES.model,
        voice_id: values.voice,
        chars: text.length,
        character_cost: result.characterCost,
        request_id: result.requestId,
        at,
      });
      const stamp = at.slice(0, 16).replace(/[-:]/gu, "");
      const dir = join(store.root, "align-test");
      writeAtomic(join(dir, `${stamp}-${values.voice}.mp3`), result.audio);
      removeIntent(store, key);
      const stream = parseMp3(result.audio);
      const audioMs = samplesToMs(stream.samples, stream.format.sampleRate);
      const tts = result.alignment
        ? sentenceTimes(text, ranges, charTokens(result.alignment))
        : null;
      const fa = await provider.align(result.audio, text);
      appendAlignReceipt(store, {
        node_id: 0,
        audio_sha256: sha256Hex(result.audio),
        audio_ms: audioMs,
        chars: text.length,
        aligner: provider.alignerName,
        at: new Date().toISOString(),
      });
      const forced = sentenceTimes(text, ranges, fa.words);
      const report = {
        at,
        voice: values.voice,
        model: ELEVENLABS_CAPABILITIES.model,
        chars: text.length,
        character_cost: result.characterCost,
        audio_ms: audioMs,
        tts_alignment: result.alignment === null || result.alignment === undefined ? null : "ada",
        sentences: sentences.map((s, i) => ({
          text: s,
          tts: tts?.[i] ?? null,
          forced: forced[i] ?? null,
        })),
        forced_loss: fa.loss,
        forced_words: fa.words.length,
      };
      writeAtomic(
        join(dir, `${stamp}-${values.voice}.json`),
        `${JSON.stringify(report, null, 2)}\n`,
      );
      console.log(
        `Audio ${(audioMs / 1000).toFixed(1)} dtk, tertagih ${result.characterCost ?? text.length} karakter.`,
      );
      console.log(
        `with-timestamps ${ELEVENLABS_CAPABILITIES.model}: ${report.tts_alignment === null ? "alignment NULL (tidak didukung)" : "alignment ada"}; forced alignment: ${fa.words.length} kata, loss ${fa.loss ?? "?"}.`,
      );
      for (const [i, s] of report.sentences.entries()) {
        console.log(
          `  ${i + 1}. tts ${JSON.stringify(s.tts)}  forced ${JSON.stringify(s.forced)}  selisih ${delta(s.tts, s.forced)}`,
        );
      }
      console.log(`Laporan: ${join(dir, `${stamp}-${values.voice}.json`)}`);
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
        const a = r.track.alignment;
        if (a !== null && r.alignment_file !== null) {
          const done = await uploadObject({
            target: MEDIA,
            key: a.r2_key,
            file: join(store.root, r.alignment_file),
            bytes: a.bytes,
            repo,
            confirm: values.confirm,
            contentType: ALIGNMENT_MIME,
          });
          console.log(`  ${done.padEnd(8)} ${a.r2_key}`);
        }
      }
      if (!values.confirm)
        console.log("Tanpa --confirm: hanya diperiksa, tidak ada yang diunggah.");
      return 0;
    }
    case "manifest": {
      const uploaded = [];
      for (const r of listRendered(store)) {
        const head = await headObject(fetch, MEDIA.origin, r.track.r2_key, true);
        if (head.status !== 200 || head.bytes !== r.track.bytes) {
          console.log(`  belum di R2: ${r.track.r2_key} (HEAD ${head.status})`);
          continue;
        }
        // Timestamps hanya dicatat bila objeknya sudah terbaca (halaman memintanya langsung).
        const a = r.track.alignment;
        const aHead = a === null ? null : await headObject(fetch, MEDIA.origin, a.r2_key, true);
        if (a !== null && (aHead?.status !== 200 || aHead.bytes !== a.bytes)) {
          console.log(`  timestamps belum di R2: ${a.r2_key} (HEAD ${aHead?.status})`);
          uploaded.push({ ...r.track, alignment: null });
        } else {
          uploaded.push(r.track);
        }
      }
      const { manifest, added, aligned } = mergeTracks(readManifest(repo, work), uploaded);
      writeManifest(repo, work, manifest);
      console.log(
        `${work.manifest}: ${added.length} track baru, ${aligned.length} mendapat timestamps, ${manifest.tracks.length} total.`,
      );
      return 0;
    }
    case "verify": {
      const manifest = readManifest(repo, work);
      let failed = 0;
      const objects = manifest.tracks.flatMap((t) =>
        t.alignment === null ? [t] : [t, t.alignment],
      );
      for (const t of objects) {
        const r = await verifyObject(fetch, manifest.media_origin, t);
        if (!r.ok) failed++;
        console.log(
          `  ${r.ok ? "lolos" : "GAGAL"} ${r.key}${r.problems.length > 0 ? ` (${r.problems.join("; ")})` : ""}`,
        );
      }
      console.log(
        `${objects.length - failed}/${objects.length} objek lolos (HEAD + Range/CORS + sha256).`,
      );
      return failed === 0 ? 0 : 1;
    }
    case "staging": {
      const corpus = await openStagingCorpus(repo);
      try {
        const manifest = readManifest(repo, work);
        const selection = await selectAudioTracksIn(corpus.db, manifest);
        console.log(audioReport(selection));
        for (const d of selection.dropped) console.log(`  gugur (${d.reason}): ${d.r2_key}`);
        if (!values.confirm) {
          console.log("Tanpa --confirm: hanya diperiksa, staging tidak diubah.");
          return 0;
        }
        await replaceStagingAudio(corpus.db, manifest.edition_id, selection.rows);
        console.log(
          `audio_track staging diganti: ${selection.rows.length} baris (${corpus.source}).`,
        );
        return 0;
      } finally {
        await corpus.dispose();
      }
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
      const aligns = readAlignReceipts(store);
      console.log(
        `Forced alignment: ${aligns.length} permintaan, ${(aligns.reduce((n, a) => n + a.audio_ms, 0) / 60_000).toFixed(1)} menit audio.`,
      );
      const rendered = listRendered(store);
      console.log(
        `Berkas rakitan: ${rendered.length} (bertimestamps ${rendered.filter((r) => r.track.alignment !== null).length}). Track di manifest: ${readManifest(repo, work).tracks.length}.`,
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
        "Perintah: plan | sample | submit | align | align-test | upload | manifest | verify | staging | status | release",
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
