import { describe, expect, it } from "vite-plus/test";

import { displayText, isWeakHadith, kutipanQuery, parseSseFrame, readSse } from "./model";

const RESULT = {
  outcome: "answer",
  reason: null,
  text: "Jawaban.",
  blocks: [{ text: "Jawaban.", citations: [1] }],
  citations: [],
  hadith: [],
  search: [],
  model: "claude-haiku-5-5",
  prompt_version: "p",
  corpus_version: "c",
};

describe("SSE Jawab", () => {
  it("bingkai dikenali; heartbeat dan bingkai rusak diabaikan", () => {
    expect(parseSseFrame('event: stage\ndata: {"stage":"route"}')).toEqual({
      event: "stage",
      stage: "route",
    });
    expect(parseSseFrame(": hb")).toBeNull();
    expect(parseSseFrame("event: done\ndata: {rusak")).toBeNull();
    expect(parseSseFrame('event: done\ndata: {"result":{"outcome":"x"}}')).toBeNull();
    expect(
      parseSseFrame(`event: done\ndata: ${JSON.stringify({ result: RESULT, cached: true })}`),
    ).toEqual({
      event: "done",
      result: RESULT,
      cached: true,
    });
    expect(parseSseFrame("event: reset\ndata: {}")).toEqual({ event: "reset" });
  });

  it("readSse merakit bingkai yang terpotong di tengah chunk", async () => {
    const enc = new TextEncoder();
    const chunks = [
      'event: stage\ndata: {"sta',
      'ge":"answer"}\n\n: hb\n\nevent: done\ndata: ',
      `${JSON.stringify({ result: RESULT, cached: false })}\n\n`,
    ];
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        for (const x of chunks) c.enqueue(enc.encode(x));
        c.close();
      },
    });
    const seen: string[] = [];
    await readSse(body, (e) => seen.push(e.event));
    expect(seen).toEqual(["stage", "done"]);
  });
});

describe("tampilan", () => {
  it("penanda Markdown sederhana dibuang, isi tetap", () => {
    expect(displayText("**Menurut al-Ghazali**, sabar _wajib_ dijaga.\n## Catatan\nisi")).toBe(
      "Menurut al-Ghazali, sabar wajib dijaga.\nCatatan\nisi",
    );
  });

  it("status hadits lemah/palsu diberi tanda", () => {
    for (const s of ["sanadnya lemah", "dhaif jiddan", "maudhu'", "tidak ada asalnya", "batil"])
      expect(isWeakHadith(s), s).toBe(true);
    for (const s of ["sahih", "hasan", "diriwayatkan al-Bukhari"])
      expect(isWeakHadith(s), s).toBe(false);
  });

  it("kueri kutipan unik dan dibatasi 20", () => {
    const spans = Array.from({ length: 25 }, (_, i) => ({
      passage_id: 1,
      char_start: i,
      char_end: i + 1,
    }));
    expect(kutipanQuery([...spans, spans[0]!]).split(",")).toHaveLength(20);
  });
});
