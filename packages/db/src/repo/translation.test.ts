import { env } from "cloudflare:workers";
import type { D1Db } from "../d1.ts";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import {
  ED,
  P1,
  P2,
  PASSAGES,
  T_CHILD_A,
  T_CHILD_B,
  T_ROOT,
  seedCorpus,
} from "../../test/fixture.ts";
import { getSummariesStartingOn, getTranslations, listTitleTranslations } from "./translation.ts";

const db = env.CORPUS;

// Teks AI BUATAN (bukan terjemahan kitab).
beforeAll(async () => {
  await seedCorpus(db);
  const ai = (table: string, key: string) =>
    `INSERT INTO ${table} (${key}, lang, text, model, prompt_version, created_at) VALUES (?, ?, ?, 'model-uji', 'p@1', '2026-10-17')`;
  await db.batch([
    db.prepare(ai("translation", "passage_id")).bind(PASSAGES.body2, "id", "Terjemahan dua."),
    db.prepare(ai("translation", "passage_id")).bind(PASSAGES.body1, "id", "Terjemahan satu."),
    db.prepare(ai("translation", "passage_id")).bind(PASSAGES.body1, "en", "Translation one."),
    db.prepare(ai("summary", "toc_node_id")).bind(T_CHILD_B, "id", "Ringkasan pasal pertama."),
    db.prepare(ai("summary", "toc_node_id")).bind(T_ROOT, "id", "Ringkasan bab."),
    db.prepare(ai("summary", "toc_node_id")).bind(T_ROOT, "en", "Chapter summary."),
    db.prepare(ai("summary", "toc_node_id")).bind(T_CHILD_A, "id", "Ringkasan pasal kedua."),
    db.prepare(ai("toc_title_translation", "toc_node_id")).bind(T_CHILD_A, "id", "Pasal Kedua"),
    db.prepare(ai("toc_title_translation", "toc_node_id")).bind(T_ROOT, "id", "Bab Uji"),
    db.prepare(ai("toc_title_translation", "toc_node_id")).bind(T_ROOT, "en", "Test Chapter"),
    db
      .prepare(
        "INSERT INTO subheading_translation (passage_id, lang, text, source_sha256, model, prompt_version, created_at) VALUES (?, 'id', 'Penjelasan uji', ?, 'model-uji', 'p@1', '2026-10-17')",
      )
      .bind(PASSAGES.body2, "a".repeat(64)),
  ]);
});

describe("getTranslations", () => {
  test("satu bahasa, urut passage_id, tanpa duplikat; kosong bila tanpa ID", async () => {
    const rows = await getTranslations(
      db,
      [PASSAGES.body2, PASSAGES.body1, PASSAGES.body1, PASSAGES.foot1],
      "id",
    );
    expect(rows.map((r) => [r.passage_id, r.text])).toEqual([
      [PASSAGES.body1, "Terjemahan satu."],
      [PASSAGES.body2, "Terjemahan dua."],
    ]);
    expect(rows[0]).toMatchObject({ model: "model-uji", review_status: "ai_generated" });
    expect(await getTranslations(db, [], "id")).toEqual([]);
  });

  test("lebih dari 99 ID dipecah per kueri", async () => {
    const ids = [PASSAGES.body1, ...Array.from({ length: 150 }, (_, i) => 900_000 + i)];
    expect((await getTranslations(db, ids, "id")).map((r) => r.passage_id)).toEqual([
      PASSAGES.body1,
    ]);
  });
});

describe("getSummariesStartingOn", () => {
  test("bagian yang mulai di halaman itu, induk dulu, beserta judulnya", async () => {
    const rows = await getSummariesStartingOn(db, P1, "id");
    expect(rows.map((r) => [r.toc_node_id, r.level, r.title_ar, r.text])).toEqual([
      [T_ROOT, 1, "باب تجريبي", "Ringkasan bab."],
      [T_CHILD_B, 2, "فصل أول", "Ringkasan pasal pertama."],
    ]);
    expect((await getSummariesStartingOn(db, P2, "en")).length).toBe(0);
    expect((await getSummariesStartingOn(db, P2, "id")).map((r) => r.toc_node_id)).toEqual([
      T_CHILD_A,
    ]);
  });
});

describe("listTitleTranslations", () => {
  test("judul node + subjudul satu bahasa dan edisi, urut ID", async () => {
    const t = await listTitleTranslations(db, ED, "id");
    expect(t?.toc.map((r) => [r.toc_node_id, r.text])).toEqual([
      [T_ROOT, "Bab Uji"],
      [T_CHILD_A, "Pasal Kedua"],
    ]);
    expect(t?.sub.map((r) => [r.passage_id, r.text, r.model, r.source_sha256])).toEqual([
      [PASSAGES.body2, "Penjelasan uji", "model-uji", "a".repeat(64)],
    ]);
    expect(await listTitleTranslations(db, ED + 1, "id")).toEqual({ toc: [], sub: [] });
  });

  test("korpus lama (skema < 7) → null; galat lain di korpus baru diteruskan", async () => {
    const fake = (schema: number): D1Db => ({
      prepare(sql: string) {
        const stmt = {
          bind: () => stmt,
          all: async () => {
            if (sql.includes("FROM meta"))
              return { results: [{ key: "schema_version", value: String(schema) }] };
            throw new Error("D1_ERROR: no such table: toc_title_translation");
          },
          first: async () => null,
        };
        return stmt;
      },
      batch: async () => {
        throw new Error("D1_ERROR: no such table: toc_title_translation");
      },
    });
    expect(await listTitleTranslations(fake(6), ED, "id")).toBeNull();
    await expect(listTitleTranslations(fake(7), ED, "id")).rejects.toThrow(/no such table/);
  });
});
