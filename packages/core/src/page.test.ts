import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import {
  AI_SUMMARIES,
  AI_TRANSLATIONS,
  BODY_1,
  ED,
  FOOT_1,
  FOOT_2,
  PASSAGES,
  T_CHILD_A,
  T_ROOT,
  seedAiText,
  seedCore,
  seedHumanReview,
} from "../test/fixture.ts";
import { InvalidCitation, NotFound } from "./errors.ts";
import { readPage } from "./page.ts";
import { pageView } from "./schema.ts";

const db = env.CORPUS;

beforeAll(async () => {
  await seedCore(db);
});

describe("readPage", () => {
  test("badan + catatan kaki dengan text_raw persis dan penanda tertaut", async () => {
    const view = await readPage(db, ED, 1, 1);
    expect(pageView.parse(view)).toEqual(view);
    expect(view.body.map((p) => p.text_raw)).toEqual([BODY_1]);
    expect(view.footnotes.map((p) => p.text_raw)).toEqual([FOOT_1, FOOT_2]);
    const [body] = view.body;
    expect(body?.footnote_refs.map((r) => [r.marker, r.footnote_id])).toEqual([
      ["١", PASSAGES.foot1],
      ["٢", PASSAGES.foot2],
    ]);
    for (const r of body?.footnote_refs ?? []) {
      expect(BODY_1.slice(r.char_start, r.char_end)).toBe(`(${r.marker})`);
      expect(view.footnotes.some((f) => f.id === r.footnote_id)).toBe(true);
    }
    expect(view.footnotes.map((f) => f.footnote_refs)).toEqual([[], []]);
  });

  test("sitasi lengkap, jangkar paragraf, dan tanda perlu ditinjau", async () => {
    const view = await readPage(db, ED, 1, 1);
    expect(view.citation).toEqual({
      source: {
        work: {
          slug: "uji",
          title_ar: "كتاب تجريبي",
          title_id: "Kitab Uji",
          author: { name_ar: "مؤلف تجريبي", name_id: "Penulis Uji", death_hijri: 505 },
          attribution_status: "authentic",
        },
        edition: { id: ED, slug: "shamela", is_default: true, publisher: null, city: null },
        license: "CC BY-NC-SA 4.0",
        attribution: "Fixture buatan",
      },
      juz: 1,
      page_no: 1,
      permalink: "/kitab/uji/1/1",
      label: "Kitab Uji, j. 1, h. 1",
    });
    expect(view.body[0]).toMatchObject({
      id: PASSAGES.body1,
      anchor: "p1",
      kind: "body",
      ord: 1,
      location: { juz: 1, page_no: 1, permalink: "/kitab/uji/1/1#p1" },
    });
    expect(view.footnotes.map((f) => f.needs_review)).toEqual([
      [],
      ["footnote_orphan", "takhrij_unmatched"],
    ]);
  });

  test("halaman sebelum/sesudah melintasi juz; ujung edisi = null", async () => {
    const first = await readPage(db, ED, 1, 1);
    expect(first.prev).toBeNull();
    expect(first.next?.permalink).toBe("/kitab/uji/1/2");
    const j2 = await readPage(db, ED, 2, 1);
    expect(j2.prev?.label).toBe("Kitab Uji, j. 1, h. 2");
    expect(j2.next?.permalink).toBe("/kitab/uji/3/1");
    expect((await readPage(db, ED, 3, 13)).next).toBeNull();
  });

  test("source_url: halaman Shamela asal bila edisi Shamela dan ID halaman sumber diketahui", async () => {
    expect((await readPage(db, ED, 1, 1)).source_url).toBe("https://shamela.ws/book/0/101");
    // Halaman bagian panjang tidak punya source_page_id.
    expect((await readPage(db, ED, 3, 1)).source_url).toBeNull();
  });

  test("halaman tanpa catatan kaki: footnotes kosong", async () => {
    const view = await readPage(db, ED, 1, 2);
    expect(view.body.map((p) => p.text_raw)).toEqual(["نص الصفحة الثانية"]);
    expect(view.footnotes).toEqual([]);
  });

  test("NotFound untuk halaman atau edisi yang tidak ada", async () => {
    await expect(readPage(db, ED, 9, 1)).rejects.toBeInstanceOf(NotFound);
    await expect(readPage(db, ED, 1, 999)).rejects.toThrow("Page not found: juz 1, page 999");
    await expect(readPage(db, 999, 1, 1)).rejects.toThrow("Edition not found: 999");
  });

  test("InvalidCitation untuk angka salah bentuk, dengan pesan tanpa detail internal", async () => {
    for (const [juz, page] of [
      [0, 1],
      [-1, 1],
      [1.5, 1],
      [1, -2],
      [Number.NaN, 1],
    ] as const) {
      const err = await readPage(db, ED, juz, page).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(InvalidCitation);
      expect((err as InvalidCitation).code).toBe("invalid_citation");
      expect((err as Error).message).toMatch(/^Invalid (juz|page_no): /);
      expect((err as Error).message).not.toMatch(/SELECT|passage|D1/i);
    }
  });
});

describe("readPage edisi non-default", () => {
  test("permalink memakai @<edisi>", async () => {
    await db
      .prepare(
        "INSERT INTO page (id, edition_id, seq, juz, page_no) VALUES (?, ?, 1, 1, 5) ON CONFLICT DO NOTHING",
      )
      .bind((ED + 1) * 100_000 + 1, ED + 1)
      .run();
    const view = await readPage(db, ED + 1, 1, 5);
    expect(view.citation.permalink).toBe("/kitab/uji@openiti/1/5");
    expect(view.citation.label).toBe("Kitab Uji (openiti), j. 1, h. 5");
    expect(view.citation.source.edition.is_default).toBe(false);
    expect(view.body).toEqual([]);
  });
});

describe("readPage: tinjauan manusia terjemahan (X08, skema 8)", () => {
  test("perbaikan ustadz: teks perbaikan + status + nama terdaftar, tanpa hash/email/draf", async () => {
    await seedAiText(db);
    await seedHumanReview(db, {
      passage_id: PASSAGES.body1,
      revised: true,
      text: "Kesabaran adalah cahaya [bagi] penuntut ilmu (١) dan adab (٢).",
    });
    const view = await readPage(db, ED, 1, 1);
    expect(pageView.parse(view)).toEqual(view);
    expect(view.body[0]?.translation).toMatchObject({
      label: "ai_translation",
      review_status: "ustadz_verified",
      model: "model-uji",
      text: "Kesabaran adalah cahaya [bagi] penuntut ilmu (١) dan adab (٢).",
      human_review: {
        revised: true,
        reviewed_at: "2026-10-22T03:00:00.000Z",
        reviewer_role: "ustadz",
        reviewer_name: "Ust. Uji Lc.",
        reviewer_short: "Ust. Uji",
      },
    });
    const json = JSON.stringify(view);
    expect(json).not.toContain(AI_TRANSLATIONS[PASSAGES.body1]);
    expect(json).not.toMatch(/author_key|ai_text|[\w.-]+@[\w-]+\.[a-z]/u);
    await seedAiText(db);
  });

  test("tanpa izin nama: peran saja; diperiksa editor = status reviewed", async () => {
    await seedAiText(db);
    await seedHumanReview(db, {
      passage_id: PASSAGES.body1,
      revised: false,
      role: "editor",
      shared: false,
    });
    const view = await readPage(db, ED, 1, 1);
    expect(view.body[0]?.translation).toMatchObject({
      review_status: "reviewed",
      text: AI_TRANSLATIONS[PASSAGES.body1],
      human_review: {
        revised: false,
        reviewer_role: "editor",
        reviewer_name: null,
        reviewer_short: null,
      },
    });
    await seedAiText(db);
  });

  test("korpus tanpa tinjauan manusia tidak pernah membaca translation_review", async () => {
    await seedAiText(db);
    const seen: string[] = [];
    const spy = {
      prepare: (q: string) => {
        seen.push(q);
        return db.prepare(q);
      },
      batch: (s: Parameters<typeof db.batch>[0]) => db.batch(s),
    };
    await readPage(spy as unknown as typeof db, ED, 1, 1);
    expect(seen.some((q) => q.includes("translation_review"))).toBe(false);
  });
});

describe("readPage: terjemahan dan ringkasan AI (S14)", () => {
  test("terjemahan per paragraf berlabel; ringkasan bagian yang mulai di halaman", async () => {
    await seedAiText(db);
    const view = await readPage(db, ED, 1, 1);
    expect(pageView.parse(view)).toEqual(view);
    expect(view.body[0]?.translation).toEqual({
      label: "ai_translation",
      lang: "id",
      model: "model-uji",
      prompt_version: "translate-passage@2",
      created_at: "2026-10-17",
      review_status: "ai_generated",
      human_review: null,
      text: AI_TRANSLATIONS[PASSAGES.body1],
    });
    expect(view.footnotes.map((f) => f.translation)).toEqual([null, null]);
    expect(view.summaries?.map((s) => [s.section.id, s.label, s.text])).toEqual([
      [T_ROOT, "ai_summary", AI_SUMMARIES[T_ROOT]],
    ]);
    expect(view.summaries?.[0]?.section.permalink).toBe(`/kitab/uji/bab/${T_ROOT}`);
    const p2 = await readPage(db, ED, 1, 2);
    expect(p2.summaries?.map((s) => s.section.id)).toEqual([T_CHILD_A]);
  });

  test("terjemahan dan ringkasan berstatus rejected tidak dikirim (ADR-044 §8)", async () => {
    await seedAiText(db);
    await db.batch([
      db
        .prepare("UPDATE translation SET review_status = 'rejected' WHERE passage_id = ?")
        .bind(PASSAGES.body1),
      db
        .prepare("UPDATE summary SET review_status = 'rejected' WHERE toc_node_id = ?")
        .bind(T_ROOT),
    ]);
    const view = await readPage(db, ED, 1, 1);
    expect(view.body[0]?.translation).toBeNull();
    expect(view.summaries).toEqual([]);
    await seedAiText(db);
  });
});
