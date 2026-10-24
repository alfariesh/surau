import { env } from "cloudflare:workers";
import { beforeEach, expect, test } from "vite-plus/test";
import { ZodError } from "zod";

import {
  countTranslationRevisionsSince,
  getActiveTranslationRevisions,
  getTranslationRevisionHistory,
  getTranslationRevisionsByIds,
  listActiveTranslationRevisions,
  listRecentTranslationRevisions,
  listTranslationRevisionAuthors,
  listTranslationRevisionsByAuthorSince,
  saveTranslationRevision,
  translationQueueSignals,
} from "./translation-revision.ts";
import { createFeedback, putAnswerCache } from "./app.ts";
import { insertAnswerLog } from "./review.ts";
import type { TranslationRevisionWrite } from "../schema/translation-revision.ts";

const db = env.APP;
const day = "2026-10-22T00:00:00.000Z";
const editor = "b".repeat(64);
const base: TranslationRevisionWrite = {
  passage_id: 1000002,
  lang: "id",
  kind: "revised",
  text: "Terjemahan perbaikan.",
  reason: "Istilah kurang tepat",
  restores_id: null,
  base_sha256: "a".repeat(64),
  draft_sha256: "a".repeat(64),
  source_sha256: "c".repeat(64),
  author_key: editor,
  author_name: "Ust. Uji Lc.",
  author_short: "Ust. Uji",
  author_role: "ustadz",
  author_public: 1,
  corpus_version: "fixture",
  created_at: "2026-10-22T01:00:00.000Z",
};
const opts = { expectedActiveId: null, dailyLimit: 200, dayStart: day };

beforeEach(async () => {
  await db.batch([
    db.prepare("DELETE FROM translation_revision"),
    db.prepare("DELETE FROM feedback"),
    db.prepare("DELETE FROM answer_log"),
    db.prepare("DELETE FROM answer_cache"),
  ]);
});

test("revisi berantai: yang baru menggantikan yang aktif, teks lama tidak ditimpa", async () => {
  const first = await saveTranslationRevision(db, base, opts);
  expect(first).toMatchObject({ ok: true });
  if (!first.ok) return;
  const second = await saveTranslationRevision(
    db,
    { ...base, text: "Perbaikan kedua.", base_sha256: "d".repeat(64) },
    { ...opts, expectedActiveId: first.id },
  );
  expect(second).toMatchObject({ ok: true });
  if (!second.ok) return;
  const history = await getTranslationRevisionHistory(db, base.passage_id);
  expect(history.map((r) => [r.id, r.status, r.text, r.supersedes_id])).toEqual([
    [second.id, "active", "Perbaikan kedua.", first.id],
    [first.id, "superseded", "Terjemahan perbaikan.", null],
  ]);
  expect((await getActiveTranslationRevisions(db, [base.passage_id, 7])).map((r) => r.id)).toEqual([
    second.id,
  ]);
  expect((await listActiveTranslationRevisions(db)).map((r) => r.id)).toEqual([second.id]);
  expect((await getTranslationRevisionsByIds(db, [first.id])).map((r) => r.text)).toEqual([
    "Terjemahan perbaikan.",
  ]);
});

test("konflik: revisi aktif sudah berubah sejak dibuka → tidak ada yang berubah", async () => {
  const first = await saveTranslationRevision(db, base, opts);
  if (!first.ok) throw new Error("gagal");
  // Tab lama masih mengira belum ada revisi aktif.
  expect(await saveTranslationRevision(db, base, opts)).toEqual({ ok: false, reason: "conflict" });
  // Tab lain mengira revisi aktif = ID yang tidak ada.
  expect(
    await saveTranslationRevision(db, base, { ...opts, expectedActiveId: first.id + 99 }),
  ).toEqual({ ok: false, reason: "conflict" });
  const history = await getTranslationRevisionHistory(db, base.passage_id);
  expect(history.map((r) => r.status)).toEqual(["active"]);
});

test("batas harian per penulis: simpanan ke-(batas+1) ditolak tanpa mengubah revisi aktif", async () => {
  let active: number | null = null;
  for (let i = 0; i < 3; i++) {
    const saved = await saveTranslationRevision(
      db,
      { ...base, passage_id: 1000002 + (i === 2 ? 0 : i) },
      { ...opts, dailyLimit: 3, expectedActiveId: i === 2 ? active : null },
    );
    expect(saved.ok).toBe(true);
    if (saved.ok && i === 0) active = saved.id;
  }
  const history = await getTranslationRevisionHistory(db, 1000002);
  const current = history.find((r) => r.status === "active")!;
  expect(
    await saveTranslationRevision(db, base, {
      ...opts,
      dailyLimit: 3,
      expectedActiveId: current.id,
    }),
  ).toEqual({ ok: false, reason: "limit" });
  expect(
    await saveTranslationRevision(db, { ...base, passage_id: 1000009 }, { ...opts, dailyLimit: 3 }),
  ).toEqual({ ok: false, reason: "limit" });
  // Revisi aktif tetap ada (tidak tergantikan oleh simpanan yang ditolak).
  expect((await getActiveTranslationRevisions(db, [1000002])).map((r) => r.id)).toEqual([
    current.id,
  ]);
  expect(await countTranslationRevisionsSince(db, editor, day)).toBe(3);
  // Hari berikutnya hitungan mulai lagi; pembatalan pemilik tanpa batas.
  expect(await countTranslationRevisionsSince(db, editor, "2026-10-23T00:00:00.000Z")).toBe(0);
  expect(
    await saveTranslationRevision(
      db,
      {
        ...base,
        kind: "reverted",
        text: null,
        reason: "",
        author_role: "admin",
        author_key: "f".repeat(64),
      },
      { ...opts, dailyLimit: null, expectedActiveId: current.id },
    ),
  ).toMatchObject({ ok: true });
});

test("jenis dan isi dijaga Zod dan CHECK SQL", async () => {
  await expect(saveTranslationRevision(db, { ...base, text: null }, opts)).rejects.toThrow(
    ZodError,
  );
  await expect(saveTranslationRevision(db, { ...base, reason: " " }, opts)).rejects.toThrow(
    ZodError,
  );
  await expect(saveTranslationRevision(db, { ...base, kind: "confirmed" }, opts)).rejects.toThrow(
    ZodError,
  );
  await expect(
    saveTranslationRevision(db, { ...base, author_role: "admin" }, opts),
  ).rejects.toThrow(ZodError);
  await expect(
    saveTranslationRevision(db, { ...base, kind: "confirmed", text: null, restores_id: 3 }, opts),
  ).rejects.toThrow(ZodError);
  // CHECK SQL tetap menjaga bila skema Zod dilewati: perbaikan tanpa teks, dua revisi aktif.
  const insert = (kind: string, text: string | null) =>
    db
      .prepare(
        `INSERT INTO translation_revision (passage_id, lang, kind, text, reason, base_sha256,
           draft_sha256, source_sha256, author_key, author_name, author_short, author_role,
           author_public, status, corpus_version, created_at)
         VALUES (5, 'id', ?1, ?2, 'alasan', ?3, ?3, ?3, ?3, 'x', 'x', 'editor', 0, 'active', 'v', ?4)`,
      )
      .bind(kind, text, "a".repeat(64), day)
      .run();
  await expect(insert("revised", null)).rejects.toThrow(/CHECK/u);
  await insert("revised", "teks");
  await expect(insert("revised", "teks lain")).rejects.toThrow(/UNIQUE/u);
  // Pemicu DB: teks/penulis tidak bisa ditimpa; hanya active → superseded.
  await expect(
    db.prepare("UPDATE translation_revision SET text = 'ditimpa' WHERE passage_id = 5").run(),
  ).rejects.toThrow(/hanya bertambah/u);
  await expect(
    db
      .prepare(
        "UPDATE translation_revision SET status = 'superseded', author_name = 'lain' WHERE passage_id = 5",
      )
      .run(),
  ).rejects.toThrow(/hanya bertambah/u);
  await db
    .prepare("UPDATE translation_revision SET status = 'superseded' WHERE passage_id = 5")
    .run();
  await expect(
    db.prepare("UPDATE translation_revision SET status = 'active' WHERE passage_id = 5").run(),
  ).rejects.toThrow(/hanya bertambah/u);
});

test("revisi aktif paragraf lain tidak bisa dijadikan dasar; pembatalan pemilik di luar batas", async () => {
  const other = await saveTranslationRevision(db, { ...base, passage_id: 1000007 }, opts);
  if (!other.ok) throw new Error("gagal");
  // Paragraf target belum punya revisi aktif; ID revisi aktif paragraf lain ditolak.
  expect(await saveTranslationRevision(db, base, { ...opts, expectedActiveId: other.id })).toEqual({
    ok: false,
    reason: "conflict",
  });
  expect(await getActiveTranslationRevisions(db, [base.passage_id])).toEqual([]);
  // Pembatalan pemilik dengan kunci yang sama tidak menghabiskan batas editor.
  await saveTranslationRevision(
    db,
    {
      ...base,
      passage_id: 1000007,
      kind: "reverted",
      text: null,
      reason: "",
      author_role: "admin",
    },
    { ...opts, dailyLimit: null, expectedActiveId: other.id },
  );
  expect(await countTranslationRevisionsSince(db, editor, day)).toBe(1);
  expect(
    (await listTranslationRevisionsByAuthorSince(db, editor, day)).map((r) => r.author_role),
  ).toEqual(["ustadz"]);
});

test("daftar terbaru, per penulis, dan penulis yang pernah menyimpan", async () => {
  const a = await saveTranslationRevision(db, base, opts);
  const b = await saveTranslationRevision(
    db,
    { ...base, passage_id: 1000003, kind: "confirmed", text: null, reason: "" },
    opts,
  );
  const c = await saveTranslationRevision(
    db,
    {
      ...base,
      passage_id: 1000004,
      author_key: "e".repeat(64),
      author_name: "Editor Lain",
      author_short: "Editor Lain",
      author_role: "editor",
      author_public: 0,
      created_at: "2026-10-22T05:00:00.000Z",
    },
    opts,
  );
  if (!a.ok || !b.ok || !c.ok) throw new Error("gagal");
  expect((await listRecentTranslationRevisions(db, 2)).map((r) => r.id)).toEqual([c.id, b.id]);
  expect((await listRecentTranslationRevisions(db, 5, b.id)).map((r) => r.id)).toEqual([a.id]);
  expect((await listTranslationRevisionsByAuthorSince(db, editor, day)).map((r) => r.id)).toEqual([
    a.id,
    b.id,
  ]);
  expect(
    await listTranslationRevisionsByAuthorSince(db, editor, "2026-10-22T02:00:00.000Z"),
  ).toEqual([]);
  expect((await listTranslationRevisionAuthors(db)).map((r) => [r.author_name, r.n])).toEqual([
    ["Editor Lain", 1],
    ["Ust. Uji Lc.", 2],
  ]);
});

test("sinyal antrean: laporan terjemahan terbuka + kutipan Maknaz (publik, belum kedaluwarsa)", async () => {
  const now = "2026-10-22T00:00:00.000Z";
  const report = (kind: "translation" | "text", passage_id: number | null) =>
    createFeedback(db, {
      kind,
      passage_id,
      page_id: null,
      path: "/kitab/ihya/1/200",
      message: "Terjemahan keliru",
      corpus_version: "fixture",
    });
  await report("translation", 21);
  await report("translation", 21);
  await report("translation", 22);
  await report("translation", null);
  await report("text", 23);
  await db.prepare("UPDATE feedback SET status = 'fixed' WHERE passage_id = 22").run();
  const cites = (ids: number[]) =>
    JSON.stringify({
      citations: ids.map((id) => ({ passage_id: id, char_start: 0, char_end: 5 })),
    });
  const log = (
    id: string,
    model: string,
    ids: number[],
    priv: 0 | 1 = 0,
    expires = "2027-01-01T00:00:00.000Z",
  ) =>
    insertAnswerLog(db, {
      id,
      run_id: "uji",
      question_id: id.slice(-4),
      question_hash: "a".repeat(64),
      answer_hash: "b".repeat(64),
      corpus_version: "fixture",
      prompt_version: "p",
      model,
      private: priv,
      question_json: "{}",
      answer_json: cites(ids),
      created_at: "2026-10-01T00:00:00.000Z",
      expires_at: expires,
    });
  await log("uji_j001", "claude-haiku-5-5", [31, 32, 31]);
  await log("uji_j002", "claude-haiku-5-5", [31]);
  await log("uji_j003", "agent-draft", [33]);
  await log("uji_p001", "claude-haiku-5-5", [34], 1);
  await log("uji_j004", "claude-haiku-5-5", [35], 0, "2026-10-21T00:00:00.000Z");
  await putAnswerCache(db, {
    key: "d".repeat(64),
    corpus_version: "fixture",
    prompt_version: "p",
    model: "m",
    outcome: "answer",
    result_json: cites([32]),
    created_at: now,
    expires_at: "2026-11-21T00:00:00.000Z",
  });
  await db.prepare("UPDATE answer_cache SET hits = 2").run();
  const signals = await translationQueueSignals(db, now);
  expect(Object.fromEntries(signals.reports)).toEqual({ 21: 2 });
  expect(Object.fromEntries(signals.cited)).toEqual({ 31: 2, 32: 4 });
});
