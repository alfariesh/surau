import type { D1Db } from "@surau/db";
import { normalizeArabic, stemText } from "@surau/text";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, onTestFinished, test } from "vite-plus/test";
import { z } from "zod";

import { ED, LONG_PAGES, PASSAGES, seedCore, seedSearchIndex } from "../test/fixture.ts";
import { InvalidQuery, NotFound, Unavailable } from "./errors.ts";
import { SEARCH_QUERY_MAX, searchView } from "./schema.ts";
import type { SearchView } from "./schema.ts";
import { searchText } from "./search.ts";

const db = env.CORPUS;

beforeAll(async () => {
  await seedCore(db);
  // "جمله" (kalimat contoh bagian panjang, 48 paragraf) dicatat sebagai kata sangat umum.
  await seedSearchIndex(db, ["جمله"]);
});

/** text_raw langsung dari DB untuk paragraf hasil (pembanding sorotan dan potongan). */
async function rawOf(view: SearchView): Promise<Map<number, string>> {
  const ids = view.results.flatMap((p) => p.hits.map((h) => h.id));
  const out = new Map<number, string>();
  for (const id of ids) {
    const row = await db.prepare("SELECT text_raw FROM passage WHERE id = ?").bind(id).first();
    out.set(id, z.object({ text_raw: z.string() }).parse(row).text_raw);
  }
  return out;
}

const stems = (s: string): string[] => stemText(normalizeArabic(s).text).split(" ");

describe("searchText", () => {
  test("frasa: halaman berperingkat, semua paragraf cocok, sitasi dan permalink", async () => {
    const view = await searchText(db, "حَاشِيَةٌ تجريبية");
    expect(searchView.parse(view)).toEqual(view);
    expect(view).toMatchObject({
      terms: ["حاشيه", "تجريبيه"],
      ranked: true,
      warning: null,
      common_terms: [],
      edition_id: null,
      // Halaman 1 (dua catatan kaki) + LONG_PAGES halaman bagian panjang; "حاشية يتيمة تجريبية"
      // dan "حاشية في صفحة" bukan frasa itu.
      total_pages: 1 + LONG_PAGES,
      total_hits: 2 + LONG_PAGES,
      limit: 20,
      offset: 0,
    });
    const first = view.results.find((p) => p.citation.juz === 1);
    expect(first).toMatchObject({
      hit_count: 2,
      citation: { page_no: 1, permalink: "/kitab/uji/1/1" },
    });
    expect(first?.hits.map((h) => h.id)).toEqual([PASSAGES.foot1, PASSAGES.foot2]);
    expect(first?.hits[0]).toMatchObject({
      kind: "foot",
      location: { permalink: `/kitab/uji/1/1#p${PASSAGES.foot1 % 10_000_000}` },
      section: { title_ar: "فصل أول", level: 2 },
    });
    // Skor: makin besar makin cocok, halaman terurut menurun.
    const scores = view.results.map((p) => p.score ?? 0);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scores.every((s) => s > 0)).toBe(true);
  });

  test("sorotan dan potongan selalu substring persis text_raw dari DB", async () => {
    for (const q of ["حاشية تجريبية", "الصفحة", "نص", "صفحة بلا متن"]) {
      const view = await searchText(db, q);
      const raw = await rawOf(view);
      const want = stems(q);
      expect(view.results.length, q).toBeGreaterThan(0);
      for (const hit of view.results.flatMap((p) => p.hits)) {
        const text = raw.get(hit.id) ?? "";
        expect(hit.snippet.text).toBe(text.slice(hit.snippet.char_start, hit.snippet.char_end));
        expect(hit.highlights.length, `${q} → ${hit.id}`).toBeGreaterThan(0);
        for (const h of hit.highlights) {
          const found = stems(text.slice(h.char_start, h.char_end));
          expect(
            want.every((w) => found.includes(w)),
            `${q}: ${found.join(" ")}`,
          ).toBe(true);
        }
        const [h0] = hit.highlights;
        expect(hit.snippet.char_start).toBeLessThanOrEqual(h0?.char_start ?? 0);
        expect(hit.snippet.char_end).toBeGreaterThanOrEqual(h0?.char_end ?? 0);
      }
    }
  });

  test("limit dan offset per halaman; total tetap; lewat akhir → kosong, total null", async () => {
    const page1 = await searchText(db, "حاشية تجريبية", { limit: 5 });
    expect(page1.results).toHaveLength(5);
    expect(page1.total_pages).toBe(1 + LONG_PAGES);
    const page3 = await searchText(db, "حاشية تجريبية", { limit: 5, offset: 10 });
    expect(page3.results).toHaveLength(3);
    const all = [...page1.results, ...page3.results].map((p) => p.citation.permalink);
    expect(new Set(all).size).toBe(8);
    const past = await searchText(db, "حاشية تجريبية", { limit: 5, offset: 20 });
    expect([past.results, past.total_pages, past.total_hits]).toEqual([[], null, null]);
    const none = await searchText(db, "صبر");
    expect([none.results, none.total_pages, none.total_hits]).toEqual([[], 0, 0]);
  });

  test("filter edisi: edisi tanpa paragraf → kosong; edisi tidak ada → NotFound", async () => {
    const own = await searchText(db, "نص", { edition_id: ED });
    expect(own.results.length).toBeGreaterThan(0);
    expect(own.edition_id).toBe(ED);
    const other = await searchText(db, "نص", { edition_id: ED + 1 });
    expect([other.results, other.total_pages]).toEqual([[], 0]);
    await expect(searchText(db, "نص", { edition_id: 999 })).rejects.toBeInstanceOf(NotFound);
    // Di atas batas formula ID (899.999): masukan salah bentuk (400), bukan galat internal (500).
    await expect(searchText(db, "نص", { edition_id: 900_000 })).rejects.toBeInstanceOf(
      InvalidQuery,
    );
  });

  test("hanya kata sangat umum → peringatan, tanpa peringkat, paragraf pertama urutan kitab", async () => {
    const view = await searchText(db, "الجملة", { limit: 3 });
    expect(searchView.parse(view)).toEqual(view);
    expect(view).toMatchObject({
      ranked: false,
      warning: "common_terms",
      common_terms: [{ term: "جمله", passage_count: LONG_PAGES * 4 }],
      total_pages: null,
      total_hits: null,
    });
    const hits = view.results.flatMap((p) => p.hits);
    expect(hits).toHaveLength(3);
    expect(hits.map((h) => h.id)).toEqual(hits.map((h) => h.id).sort((a, b) => a - b));
    expect(hits.every((h) => h.score === null && h.highlights.length > 0)).toBe(true);
    expect((await searchText(db, "الجملة", { offset: 1 })).results).toEqual([]);
    // Satu kata tidak umum di frasa → diranking seperti biasa.
    const mixed = await searchText(db, "جملة تجريبية");
    expect([mixed.ranked, mixed.warning, mixed.common_terms]).toEqual([
      true,
      null,
      [{ term: "جمله", passage_count: LONG_PAGES * 4 }],
    ]);
  });

  test("kueri kosong setelah normalisasi → hasil kosong tanpa menyentuh DB", async () => {
    const failing = {
      prepare: () => {
        throw new Error("DB tidak boleh dipanggil");
      },
      batch: () => Promise.reject(new Error("DB tidak boleh dipanggil")),
    } as unknown as D1Db;
    const view = await searchText(failing, "،؟ (١) ـــ");
    expect(view).toMatchObject({ terms: [], results: [], total_pages: 0, ranked: true });
  });

  test("masukan salah bentuk → InvalidQuery", async () => {
    await expect(searchText(db, "")).rejects.toBeInstanceOf(InvalidQuery);
    await expect(searchText(db, "ص".repeat(SEARCH_QUERY_MAX + 1))).rejects.toBeInstanceOf(
      InvalidQuery,
    );
    await expect(searchText(db, Array(33).fill("علم").join(" "))).rejects.toBeInstanceOf(
      InvalidQuery,
    );
    await expect(searchText(db, "نص", { limit: 0 })).rejects.toBeInstanceOf(InvalidQuery);
    await expect(searchText(db, "نص", { limit: 51 })).rejects.toThrow(/limit/);
  });

  test("expand menerima bentuk bersufiks (awalan stem); tanpa expand tidak", async () => {
    // "حاشي" hanya muncul sebagai حاشية (= حاشيه setelah normalisasi).
    const plain = await searchText(db, "حاشي");
    const expanded = await searchText(db, "حاشي", { expand: true });
    expect(plain.total_hits).toBe(0);
    expect(expanded.total_hits).toBeGreaterThan(0);
    expect(expanded.ranked).toBe(true);
  });

  test("awalan expand yang mengenai kata umum dijaga, bukan diranking penuh", async () => {
    // "جمل" + expand = "جمل"* mengenai "جمله" (kata umum fixture), seperti الل + expand → الله.
    const view = await searchText(db, "جمل", { expand: true, limit: 2 });
    expect(view).toMatchObject({
      ranked: false,
      warning: "common_terms",
      common_terms: [{ term: "جمله", passage_count: LONG_PAGES * 4 }],
      total_pages: null,
    });
    expect(view.results.flatMap((p) => p.hits)).toHaveLength(2);
  });

  test("korpus tanpa indeks pencarian atau NORM_VERSION lain → Unavailable", async () => {
    onTestFinished(async () => {
      await seedSearchIndex(db, ["جمله"]);
      await db.prepare("UPDATE meta SET value = '6' WHERE key = 'schema_version'").run();
    });
    await db.prepare("UPDATE meta SET value = '999' WHERE key = 'norm_version'").run();
    await expect(searchText(db, "نص")).rejects.toBeInstanceOf(Unavailable);
    await db.prepare("UPDATE meta SET value = '3' WHERE key = 'schema_version'").run();
    await expect(searchText(db, "نص")).rejects.toThrow(/not available/);
  });
});
