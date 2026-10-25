import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { alignmentFits, audioAlignment, digestScript, digestView } from "@surau/core";
import type { DigestScript, DigestView } from "@surau/core";
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";

import { parseLexicon } from "./lexicon.ts";
import { parseMp3, samplesToMs, silentFrames } from "./mp3.ts";
import type { Mp3Format } from "./mp3.ts";
import type { SynthesisRequest, TtsProvider } from "./provider.ts";
import { TtsError } from "./provider.ts";
import { ELEVENLABS_CAPABILITIES } from "./providers/elevenlabs.ts";
import {
  GAP_AFTER_MS,
  renderNode,
  requestTexts,
  speakableRequest,
  uncachedChars,
} from "./render.ts";
import type { RenderInput } from "./render.ts";
import { audioStore, listIntents, readReceipts, readRendered } from "./store.ts";
import type { AudioStore } from "./store.ts";

const FORMAT: Mp3Format = {
  version: 1,
  sampleRate: 44100,
  channels: 1,
  bitrate: 64,
  samplesPerFrame: 1152,
};

/** Durasi "ucapan" tiruan: 20 ms per karakter. */
const msFor = (text: string) => text.length * 20;

function fakeProvider(fail?: (call: number) => TtsError | null) {
  const calls: SynthesisRequest[] = [];
  const provider: TtsProvider = {
    capabilities: ELEVENLABS_CAPABILITIES,
    async synthesize(req) {
      calls.push(req);
      const error = fail?.(calls.length);
      if (error) throw error;
      const frames = silentFrames(FORMAT, msFor(req.text));
      const audio = new Uint8Array(frames.reduce((n, f) => n + f.length, 0));
      let at = 0;
      for (const f of frames) {
        audio.set(f, at);
        at += f.length;
      }
      // Waktu karakter tiruan (X18): rata 20 ms per karakter teks yang dikirim.
      const chars = req.text.split("");
      const alignment = req.timestamps
        ? {
            characters: chars,
            character_start_times_seconds: chars.map((_, i) => (i * 20) / 1000),
            character_end_times_seconds: chars.map((_, i) => ((i + 1) * 20) / 1000),
          }
        : null;
      return { audio, requestId: `req-${calls.length}`, characterCost: req.text.length, alignment };
    },
    quota: async () => null,
    voice: async () => null,
  };
  return { provider, calls };
}

function fixtureView(): DigestView {
  const point = (ord: number) => ({
    ord,
    kind: "idea",
    stance: "author",
    title: `Judul gagasan ${ord}`,
    body: `Isi gagasan ${ord} yang cukup panjang untuk dibacakan.`,
    review_status: "ai_generated",
    anchors: [
      {
        passage_id: 10000001,
        char_start: 0,
        char_end: 3,
        location: {
          juz: 1,
          page_no: 200,
          permalink: "/kitab/ihya/1/200#p1",
          label: "Ihya, j. 1, h. 200",
        },
      },
    ],
  });
  return digestView.parse({
    label: "ai_digest",
    section: { id: 100074, title_ar: "كتاب", level: 2, permalink: "/kitab/ihya/bab/100074" },
    source: {
      work: {
        slug: "ihya",
        title_ar: "إحياء",
        title_id: "Ihya' 'Ulum ad-Din",
        author: { name_ar: "الغزالي", name_id: "al-Ghazali", death_hijri: 505 },
        attribution_status: "authentic",
      },
      edition: { id: 1, slug: "dar-al-marifah", is_default: true, publisher: null, city: null },
      license: "CC BY-NC-SA 4.0",
      attribution: "OpenITI (uji)",
    },
    tier: "section",
    basis: "text",
    lang: "id",
    model: "model-uji",
    prompt_version: "digest-section@1",
    created_at: "2026-10-24",
    review_status: "ai_generated",
    opening: null,
    abstract: "Bagian ini membahas ilmu.",
    closing: null,
    points: [point(1), point(2), point(3)],
    quotes: [],
    questions: [],
    terms: [],
    reading_minutes: 1,
    audio: null,
    evidence: { ayat: [], hadith: [], quran: null },
    withheld_quotes: [],
  });
}

let dir: string;
let store: AudioStore;
let script: DigestScript;
let input: RenderInput;
const clock = () => new Date("2026-10-25T01:00:00.000Z");

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "surau-audio-"));
  store = audioStore(dir);
  const view = fixtureView();
  script = await digestScript(view);
  input = {
    view,
    script,
    title: "Kitab Ilmu",
    voice: { id: "suara-uji", name: "Narator Uji" },
    lexicon: parseLexicon(
      "format: 1\nlang: id\nentries:\n  - { term: ilmu, ipa: ˈilmu, status: active }\n",
    ),
    work: { slug: "ihya", title: "Ihya' 'Ulum ad-Din" },
    siteOrigin: "https://surau.org",
  };
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("renderNode", () => {
  test("timestamps (X18): kalimat per segmen, digeser ke awal potongannya; tanpa --timestamps tidak ada", async () => {
    const plain = await renderNode(
      store,
      fakeProvider().provider,
      input,
      { remaining: 1e5 },
      clock,
    );
    expect(plain.status === "rendered" && plain.rendered.track.alignment).toBeNull();

    const dir2 = mkdtempSync(join(tmpdir(), "surau-audio-"));
    try {
      const store2 = audioStore(dir2);
      const { provider, calls } = fakeProvider();
      const out = await renderNode(
        store2,
        provider,
        { ...input, timestamps: true },
        { remaining: 1e5 },
        clock,
      );
      expect(calls.every((c) => c.timestamps === true)).toBe(true);
      if (out.status !== "rendered") throw new Error(out.status);
      const t = out.rendered.track;
      expect(t.alignment).toMatchObject({ method: "tts_timestamps" });
      expect(t.alignment!.r2_key).toBe(
        `ihya/id/100074-${t.alignment!.sha256.slice(0, 12)}.align.json`,
      );
      const json = readFileSync(join(store2.root, out.rendered.alignment_file!), "utf8");
      expect(Buffer.byteLength(json)).toBe(t.alignment!.bytes);
      const a = audioAlignment.parse(JSON.parse(json));
      expect(a).toMatchObject({ audio_sha256: t.sha256, script_sha256: script.sha256 });
      expect(alignmentFits(a, script)).toBe(true);
      // Kalimat pertama tiap gagasan ("Gagasan …") mulai tepat di awal babnya.
      const points = script.segments.flatMap((s, i) => (s.kind === "point" ? [i] : []));
      expect(points.map((i) => a.segments[i]![0]![0])).toEqual(t.chapters.map((c) => c.start_ms));
      // Kalimat kedua mulai sesudah kalimat pertama + spasi (20 ms per karakter).
      const first = script.segments[points[0]!]!.sentences[0]!;
      expect(a.segments[points[0]!]![1]![0]).toBe(
        t.chapters[0]!.start_ms + (first.length + 1) * 20,
      );
      expect(a.segments.flat().every((s) => s !== null)).toBe(true);
    } finally {
      rmSync(dir2, { recursive: true, force: true });
    }
  });

  test("bab = gagasan; awal bab = jumlah durasi segmen sebelumnya + jeda", async () => {
    const { provider, calls } = fakeProvider();
    const out = await renderNode(store, provider, input, { remaining: 100_000 }, clock);
    expect(out.status).toBe("rendered");
    if (out.status !== "rendered") return;
    const t = out.rendered.track;
    // Satu permintaan per segmen (label, pembuka, 3 gagasan, penutup); leksikon sudah diterapkan.
    expect(calls).toHaveLength(script.segments.length);
    expect(calls[1]!.text).toBe("Bagian ini membahas /ˈilmu/.");
    // Hitung ulang dari durasi tiap segmen (bingkai tiruan) dan jeda per jenis segmen.
    let samples = 0;
    const expected: { point_ord: number; start_ms: number }[] = [];
    for (const [i, seg] of script.segments.entries()) {
      if (seg.kind === "point")
        expected.push({ point_ord: seg.point_ord!, start_ms: samplesToMs(samples, 44100) });
      const text = calls[i]!.text;
      samples += silentFrames(FORMAT, msFor(text)).length * 1152;
      if (i < script.segments.length - 1)
        samples += silentFrames(FORMAT, GAP_AFTER_MS[seg.kind]).length * 1152;
    }
    expect(t.chapters).toEqual(expected);
    expect(t.duration_ms).toBe(samplesToMs(samples, 44100));
    // Stitching: id permintaan sebelumnya (≤ 3, kronologis).
    expect(calls[4]!.previousRequestIds).toEqual(["req-2", "req-3", "req-4"]);
    // Berkas: ID3 di depan, MP3 sah, kunci = sidik isi; metadata lolos skema manifest.
    const bytes = new Uint8Array(readFileSync(join(store.root, out.rendered.file)));
    expect(String.fromCharCode(...bytes.subarray(0, 3))).toBe("ID3");
    expect(samplesToMs(parseMp3(bytes).samples, 44100)).toBe(t.duration_ms);
    expect(t.r2_key).toBe(`ihya/id/100074-${t.sha256.slice(0, 12)}.mp3`);
    expect(t).toMatchObject({ voice_kind: "ai", model: "eleven_v4", script_sha256: script.sha256 });
    expect(t.characters).toBe(calls.reduce((n, c) => n + c.text.length, 0));
    expect(readReceipts(store)).toHaveLength(calls.length);
    expect(listIntents(store)).toEqual([]);
  });

  test("cache per sidik: rakitan sama dipakai ulang tanpa biaya; leksikon baru hanya menagih segmen yang berubah", async () => {
    const first = fakeProvider();
    await renderNode(store, first.provider, input, { remaining: 100_000 }, clock);
    const again = fakeProvider();
    const reused = await renderNode(store, again.provider, input, { remaining: 100_000 }, clock);
    expect(reused).toMatchObject({ status: "reused", billed: 0 });
    expect(again.calls).toHaveLength(0);

    const lexicon = parseLexicon(
      "format: 1\nlang: id\nentries:\n  - { term: Bagian, alias: Bahagian, status: active }\n",
    );
    const changed = { ...input, lexicon };
    expect(uncachedChars(store, changed, ELEVENLABS_CAPABILITIES)).toBe(
      "Bahagian ini membahas ilmu.".length,
    );
    const third = fakeProvider();
    const out = await renderNode(store, third.provider, changed, { remaining: 100_000 }, clock);
    expect(out.status).toBe("rendered");
    expect(third.calls.map((c) => c.text)).toEqual(["Bahagian ini membahas ilmu."]);
    expect(readRendered(store, 100074)?.track.lexicon_version).toBe(lexicon.version);
  });

  test("pagu habis: berhenti sebelum permintaan berikutnya, segmen yang sudah jadi tetap di cache", async () => {
    const { provider, calls } = fakeProvider();
    const budget = { remaining: script.segments[0]!.sentences.join(" ").length + 5 };
    const out = await renderNode(store, provider, input, budget, clock);
    expect(out.status).toBe("budget");
    expect(calls).toHaveLength(1);
    expect(readRendered(store, 100074)).toBeNull();
  });

  test("tanda niat dilepas bila galat pasti belum tertagih, dibiarkan bila mungkin tertagih", async () => {
    const refused = fakeProvider(
      () => new TtsError("kredit habis", 402, "insufficient_credits", false, "no"),
    );
    await expect(
      renderNode(store, refused.provider, input, { remaining: 100_000 }, clock),
    ).rejects.toThrow(TtsError);
    expect(listIntents(store)).toEqual([]);
    const lost = fakeProvider((n) =>
      n === 2 ? new TtsError("putus", null, "network", false, "unknown") : null,
    );
    await expect(
      renderNode(store, lost.provider, input, { remaining: 100_000 }, clock),
    ).rejects.toThrow(/putus/u);
    const open = listIntents(store);
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ node_id: 100074, segment: 1, pid: process.pid });
  });
});

describe("renderNode: keluaran rusak dan teks akhir", () => {
  test("respons 200 yang bukan MP3: biaya tetap tercatat, tidak masuk cache, niat dilepas", async () => {
    const provider: TtsProvider = {
      ...fakeProvider().provider,
      synthesize: async () => ({
        audio: Uint8Array.of(1, 2, 3),
        requestId: "req-x",
        characterCost: 42,
      }),
    };
    await expect(renderNode(store, provider, input, { remaining: 100_000 }, clock)).rejects.toThrow(
      /bukan MP3/u,
    );
    expect(readReceipts(store)).toMatchObject([{ character_cost: 42, request_id: "req-x" }]);
    expect(listIntents(store)).toEqual([]);
    expect(existsSync(join(store.root, "rejected"))).toBe(true);
    expect(readRendered(store, 100074)).toBeNull();
  });

  test("teks yang dikirim diperiksa ulang sesudah leksikon", () => {
    expect(speakableRequest("Ikhlas /ixˈlas/.")).toBe("Ikhlas /ixˈlas/.");
    expect(() => speakableRequest("[whispers] halo")).toThrow(/tidak boleh dibacakan/u);
    expect(() => speakableRequest("niat نية")).toThrow(/tidak boleh dibacakan/u);
  });
});

describe("requestTexts", () => {
  test("kalimat dikelompokkan ≤ batas; satu kalimat terlalu panjang ditolak", () => {
    expect(requestTexts(["aa.", "bb.", "cc."], 7)).toEqual(["aa. bb.", "cc."]);
    expect(requestTexts([], 10)).toEqual([]);
    expect(() => requestTexts(["a".repeat(11)], 10)).toThrow(RangeError);
  });
});
