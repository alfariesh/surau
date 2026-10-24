import { digestView } from "@surau/core";
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";

import {
  LISTEN_KEY,
  LISTEN_MAX_POSITIONS,
  clearCurrent,
  parseListen,
  readListen,
  savePosition,
  saveRate,
  savedPosition,
} from "./store";
import { chapterAt, chapterTarget, formatClock, listenTrack } from "./track";

const KEY = "ihya/id/100074-0123456789ab.mp3";

function view(audio: boolean) {
  const loc = {
    juz: 1,
    page_no: 200,
    permalink: "/kitab/ihya/1/200#p1",
    label: "Ihya, j. 1, h. 200",
  };
  const point = (ord: number) => ({
    ord,
    kind: "idea",
    stance: "author",
    title: `Judul ${ord}`,
    body: "Isi.",
    review_status: "ai_generated",
    anchors: [{ passage_id: 10000001, char_start: 0, char_end: 3, location: loc }],
  });
  return digestView.parse({
    label: "ai_digest",
    section: { id: 100074, title_ar: "كتاب", level: 2, permalink: "/kitab/ihya/bab/100074" },
    source: {
      work: {
        slug: "ihya",
        title_ar: "إحياء",
        title_id: "Ihya' 'Ulum ad-Din",
        author: null,
        attribution_status: "authentic",
      },
      edition: { id: 1, slug: "dar-al-marifah", is_default: true, publisher: null, city: null },
      license: "CC BY-NC-SA 4.0",
      attribution: "uji",
    },
    tier: "section",
    basis: "text",
    lang: "id",
    model: "m",
    prompt_version: "p",
    created_at: "2026-10-24",
    review_status: "ai_generated",
    opening: null,
    abstract: "Abstrak.",
    closing: null,
    points: [point(1), point(3)],
    quotes: [],
    questions: [],
    terms: [],
    reading_minutes: 1,
    audio: audio
      ? {
          r2_key: KEY,
          duration_ms: 125_000,
          voice_kind: "ai",
          voice_name: "Narator",
          provider: "elevenlabs",
          model: "eleven_v4",
          created_at: "2026-10-25",
          chapters: [
            { point_ord: 1, start_ms: 10_000 },
            { point_ord: 3, start_ms: 60_000 },
          ],
        }
      : null,
    evidence: { ayat: [], hadith: [], quran: null },
    withheld_quotes: [],
  });
}

describe("listenTrack", () => {
  test("dari DigestView.audio: URL media, detik, bab berjudul gagasan; tanpa audio → null", () => {
    expect(
      listenTrack(view(false), { work: "ihya", title: "Kitab Ilmu", titleLang: "id", href: "/x" }),
    ).toBeNull();
    expect(
      listenTrack(view(true), { work: "ihya", title: "Kitab Ilmu", titleLang: "id", href: "/x" }),
    ).toEqual({
      id: "ihya/100074",
      key: KEY,
      src: `https://media.surau.org/${KEY}`,
      title: "Kitab Ilmu",
      titleLang: "id",
      workTitle: "Ihya' 'Ulum ad-Din",
      href: "/x",
      duration: 125,
      voice: { kind: "ai", name: "Narator" },
      chapters: [
        { point_ord: 1, start: 10, title: "Judul 1" },
        { point_ord: 3, start: 60, title: "Judul 3" },
      ],
    });
  });

  test("bab aktif dan tujuan lompat bab (pola tombol musik)", () => {
    const track = { chapters: [{ start: 10 }, { start: 60 }] } as Parameters<typeof chapterAt>[0];
    expect(chapterAt(track, 0)).toBe(-1);
    expect(chapterAt(track, 9.9)).toBe(0); // toleransi 0,25 dtk di batas bab
    expect(chapterAt(track, 61)).toBe(1);
    expect(chapterTarget(track, 0, 1)).toBe(10);
    expect(chapterTarget(track, 61, 1)).toBeNull();
    expect(chapterTarget(track, 20, -1)).toBe(10); // > 3 dtk ke dalam bab: ke awal bab ini
    expect(chapterTarget(track, 11, -1)).toBe(0); // awal bab pertama: ke pembuka
    expect(chapterTarget(track, 62, -1)).toBe(10);
    expect(chapterTarget(track, 2, -1)).toBe(0);
  });

  test("format jam", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65.9)).toBe("1:05");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-3)).toBe("0:00");
  });
});

describe("posisi dengar (localStorage surau:listen:v1)", () => {
  let data: Map<string, string>;
  beforeEach(() => {
    data = new Map();
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
    Object.assign(globalThis, { window: { localStorage: storage } });
  });
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  test("simpan dan baca posisi; audio yang dibuat ulang (kunci lain) mulai dari awal", () => {
    const track = { id: "ihya/100074", key: KEY };
    expect(savedPosition(track)).toBe(0);
    savePosition(track, 42.5, 1000);
    expect(savedPosition(track)).toBe(42.5);
    expect(readListen().current).toBe("ihya/100074");
    expect(savedPosition({ ...track, key: "ihya/id/100074-ffffffffffff.mp3" })).toBe(0);
    saveRate(1.5);
    clearCurrent();
    expect(readListen()).toMatchObject({ rate: 1.5, current: null });
    expect(savedPosition(track)).toBe(42.5);
  });

  test("paling banyak 50 posisi; yang terlama dibuang", () => {
    for (let i = 0; i <= LISTEN_MAX_POSITIONS; i++) {
      savePosition(
        { id: `ihya/${100000 + i}`, key: `ihya/id/${100000 + i}-0123456789ab.mp3` },
        1,
        i,
      );
    }
    const positions = readListen().positions;
    expect(Object.keys(positions)).toHaveLength(LISTEN_MAX_POSITIONS);
    expect(positions["ihya/100000"]).toBeUndefined();
  });

  test("data rusak, kecepatan tak dikenal, atau entri tak sah diabaikan; penyimpanan diblokir tidak galat", () => {
    expect(parseListen("{rusak")).toEqual({ rate: 1, current: null, positions: {} });
    expect(
      parseListen(
        JSON.stringify({
          rate: 3,
          current: "../x",
          positions: {
            "ihya/1": { key: "bukan-kunci", t: 5, at: 1 },
            "ihya/2": { key: KEY, t: -1, at: 1 },
          },
        }),
      ),
    ).toEqual({ rate: 1, current: null, positions: {} });
    data.set(LISTEN_KEY, JSON.stringify({ rate: 0.75, current: "ihya/9", positions: {} }));
    expect(readListen()).toMatchObject({ rate: 0.75, current: "ihya/9" });
    Object.assign(globalThis, {
      window: {
        localStorage: {
          getItem: () => {
            throw new Error("diblokir");
          },
          setItem: () => {
            throw new Error("diblokir");
          },
        },
      },
    });
    expect(readListen()).toEqual({ rate: 1, current: null, positions: {} });
    expect(() => savePosition({ id: "ihya/1", key: KEY }, 1)).not.toThrow();
  });
});
