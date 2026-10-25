import { describe, expect, test } from "vite-plus/test";

import { FIXTURE_BOOK, FIXTURE_SECTION } from "../../lib/reader/digest-fixture";
import { fixtureListen } from "../../lib/reader/digest-fixture-audio";
import { digestFollow } from "../../lib/reader/digest-follow";
import { activeIndex, flatSpans, targetAt } from "./follow-run";
import { followTargets, proseParagraphs, sayKey } from "./follow-targets";

describe("sorotan kalimat audio (X18)", () => {
  test("paragraf Prose: posisi awal tiap paragraf di teks asli (sesudah pangkas)", () => {
    const text = "  Satu. Dua.\n\n Tiga.\n \nEmpat.";
    const paras = proseParagraphs(text);
    expect(paras).toEqual([
      { text: "Satu. Dua.", at: 2 },
      { text: "Tiga.", at: 15 },
      { text: "Empat.", at: 23 },
    ]);
    for (const p of paras) expect(text.slice(p.at, p.at + p.text.length)).toBe(p.text);
  });

  test("target dari skrip: kunci data-say per field, kalimat buatan kode null", () => {
    expect(sayKey("point_body", 3)).toBe("point-body-3");
    expect(sayKey("quote", 2)).toBe("quote-2");
    expect(sayKey("abstract", null)).toBe("abstract");
    expect(
      followTargets({
        sources: [[null], [{ field: "point_title", ord: 1, start: 0, end: 5 }, null]],
      }),
    ).toEqual([null, { say: "point-title-1", start: 0, end: 5 }, null]);
  });

  test("fixture: target menunjuk teks yang tampil; jumlah = kalimat timestamps", async () => {
    for (const [digest, section] of [
      [FIXTURE_BOOK, false],
      [FIXTURE_SECTION, true],
    ] as const) {
      const { follow, alignment, track } = await fixtureListen(digest, section);
      expect(flatSpans(alignment)).toHaveLength(follow.targets.length);
      expect(follow.trackKey).toBe(track.key);
      const fields: Record<string, string | null | undefined> = {
        opening: digest.opening,
        abstract: digest.abstract,
        closing: digest.closing,
        ...Object.fromEntries(
          digest.points.flatMap((p) => [
            [`point-title-${p.ord}`, p.title],
            [`point-body-${p.ord}`, p.body],
          ]),
        ),
        ...Object.fromEntries(digest.quotes.map((q) => [`quote-${q.ord}`, q.translation?.text])),
      };
      const shown = follow.targets.flatMap((t) =>
        t === null ? [] : [fields[t.say]!.slice(t.start, t.end)],
      );
      expect(shown.length).toBeGreaterThan(3);
      for (const s of shown) expect(s.trim()).toBe(s);
      expect(shown).toContain(digest.points[0]!.title.trim());
      // Bab pemutar = awal kalimat pertama gagasan.
      expect(track.chapters.length).toBe(digest.points.length);
      expect(track.duration).toBeLessThanOrEqual(300);
    }
  });

  test("halaman nyata: tanpa alignment_key atau tanpa audio → tanpa sorotan", async () => {
    expect(await digestFollow(FIXTURE_BOOK, null)).toBeNull();
    const track = (await fixtureListen(FIXTURE_BOOK, false)).track;
    expect(await digestFollow(FIXTURE_BOOK, track)).toBeNull();
    const withAudio = {
      ...FIXTURE_BOOK,
      audio: {
        r2_key: "uji/id/1-0123456789ab.mp3",
        duration_ms: 1000,
        voice_kind: "ai" as const,
        voice_name: "N",
        provider: "elevenlabs",
        model: "eleven_v4",
        created_at: "2026-10-25",
        chapters: [],
        alignment_key: "uji/id/1-aaaaaaaaaaaa.align.json",
      },
    };
    const follow = await digestFollow(withAudio, { ...track, key: "uji/id/1-0123456789ab.mp3" });
    expect(follow).toMatchObject({
      trackKey: "uji/id/1-0123456789ab.mp3",
      src: "https://media.surau.org/uji/id/1-aaaaaaaaaaaa.align.json",
    });
  });

  test("objek timestamps: hanya format 1 yang utuh; kalimat aktif = terakhir yang sudah mulai", () => {
    expect(flatSpans({ format: 1, segments: [[[0, 10], null], [[20, 30]]] })).toEqual([
      [0, 10],
      null,
      [20, 30],
    ]);
    expect(flatSpans({ format: 2, segments: [] })).toBeNull();
    expect(flatSpans({ format: 1, segments: [[["a", 1]]] })).toBeNull();
    const spans = [[0, 10], null, [20, 30], [40, 50]] as const;
    expect(activeIndex(spans as never, -1)).toBe(-1);
    expect(activeIndex(spans as never, 5)).toBe(0);
    expect(activeIndex(spans as never, 15)).toBe(0); // jeda: sorotan bertahan
    expect(activeIndex(spans as never, 20)).toBe(2);
    expect(activeIndex(spans as never, 999)).toBe(3);
  });

  test("ketuk: posisi di field → kalimat yang memuatnya", () => {
    const targets = [
      null,
      { say: "abstract", start: 0, end: 10 },
      { say: "abstract", start: 11, end: 20 },
      { say: "point-body-1", start: 0, end: 8 },
    ];
    expect(targetAt(targets, "abstract", 12)).toBe(2);
    expect(targetAt(targets, "abstract", 10)).toBe(-1); // spasi antarkalimat
    expect(targetAt(targets, "point-body-1", 0)).toBe(3);
    expect(targetAt(targets, "quote-1", 0)).toBe(-1);
  });
});
