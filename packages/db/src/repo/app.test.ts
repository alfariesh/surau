import { env } from "cloudflare:workers";
import { describe, expect, onTestFinished, test } from "vite-plus/test";
import { ZodError } from "zod";

import { feedbackRow } from "../schema/app.ts";
import {
  createFeedback,
  getAnswerCache,
  getSettings,
  putAnswerCache,
  touchAnswerCache,
} from "./app.ts";

const db = env.APP;

describe("settings", () => {
  test("migrasi mengisi jawab_enabled = mati dan angka P-4 (S20)", async () => {
    expect(await getSettings(db)).toEqual({
      jawab_enabled: false,
      budget_monthly_usd: 20,
      quota_anon_daily: 10,
      quota_ip_daily: 30,
    });
  });

  test("sakelar dibaca sebagai boolean", async () => {
    onTestFinished(async () => {
      await db.prepare("UPDATE settings SET value = '0' WHERE key = 'jawab_enabled'").run();
    });
    await db.prepare("UPDATE settings SET value = '1' WHERE key = 'jawab_enabled'").run();
    expect((await getSettings(db)).jawab_enabled).toBe(true);
  });
});

describe("feedback", () => {
  test("createFeedback menyimpan laporan dengan status awal 'new'", async () => {
    const id = await createFeedback(db, {
      kind: "citation",
      passage_id: 70_000_001,
      path: "/kitab/ihya/1/200",
      message: "  Nomor halaman tidak cocok  ",
    });
    const row = feedbackRow.parse(
      await db.prepare("SELECT * FROM feedback WHERE id = ?").bind(id).first(),
    );
    expect(row).toMatchObject({
      kind: "citation",
      passage_id: 70_000_001,
      page_id: null,
      path: "/kitab/ihya/1/200",
      message: "Nomor halaman tidak cocok",
      status: "new",
      resolved_at: null,
    });
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  test("path dengan query string ditolak (pertanyaan pengguna tidak boleh tersimpan)", async () => {
    await expect(
      createFeedback(db, { kind: "other", path: "/cari?q=sabar", message: "x" }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  test("pesan kosong atau terlalu panjang ditolak", async () => {
    await expect(createFeedback(db, { kind: "other", message: "   " })).rejects.toBeInstanceOf(
      ZodError,
    );
    await expect(
      createFeedback(db, { kind: "other", message: "a".repeat(2001) }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  test("karakter kontrol (mis. NUL) ditolak Zod, bukan lolos ke CHECK D1", async () => {
    await expect(createFeedback(db, { kind: "other", message: "a\u0000b" })).rejects.toBeInstanceOf(
      ZodError,
    );
    await expect(
      createFeedback(db, { kind: "other", path: "/kitab/a b", message: "x" }),
    ).rejects.toBeInstanceOf(ZodError);
    // Baris baru dan tab di pesan tetap boleh.
    expect(
      await createFeedback(db, { kind: "other", message: "baris 1\nbaris\t2" }),
    ).toBeGreaterThan(0);
  });

  test("CHECK di DB menjaga hal yang sama bila Zod dilewati", async () => {
    await expect(
      db.prepare("INSERT INTO feedback (kind, path, message) VALUES ('other', '/a?b', 'x')").run(),
    ).rejects.toThrow(/CHECK/);
  });
});

describe("answer_cache", () => {
  const key = "a".repeat(64);
  const row = {
    key,
    corpus_version: "ihya-uji",
    prompt_version: "answer@1+answer-route@1",
    model: "claude-haiku-5-5",
    outcome: "answer" as const,
    result_json: JSON.stringify({ text: "Jawaban uji." }),
    created_at: "2026-10-20T00:00:00.000Z",
    expires_at: "2026-11-19T00:00:00.000Z",
  };

  test("simpan, baca sebelum kedaluwarsa, dan hitung pemakaian", async () => {
    onTestFinished(async () => {
      await db.prepare("DELETE FROM answer_cache").run();
    });
    await putAnswerCache(db, row);
    expect(await getAnswerCache(db, key, "2026-10-21T00:00:00.000Z")).toMatchObject({
      outcome: "answer",
      hits: 0,
    });
    await touchAnswerCache(db, key);
    expect((await getAnswerCache(db, key, "2026-10-21T00:00:00.000Z"))?.hits).toBe(1);
    expect(await getAnswerCache(db, key, "2026-11-20T00:00:00.000Z")).toBeNull();
    expect(await getAnswerCache(db, "b".repeat(64), "2026-10-21T00:00:00.000Z")).toBeNull();
  });

  test("kunci bukan hash atau hasil gagal tidak bisa disimpan", async () => {
    await expect(putAnswerCache(db, { ...row, key: "pendek" })).rejects.toBeInstanceOf(ZodError);
    await expect(
      putAnswerCache(db, { ...row, outcome: "fallback" as unknown as "answer" }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
