// Koreksi terjemahan ujung-ke-ujung di atas SQLite (migrasi repo apa adanya) dengan korpus fixture
// BUATAN (bukan teks kitab; packages/db/test/fixture.ts) dan terjemahan buatan.
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { parseTranslationEditors, textSha256 } from "@surau/core";
import type { TranslationRevisionInput } from "@surau/core";
import type { D1Db } from "@surau/db";

import { ED, PASSAGES, seedCorpus } from "../../../../packages/db/test/fixture.ts";
import { migratedDb, sqliteD1 } from "../test-utils/sqlite-d1";
import {
  TR_DAILY_LIMIT,
  adminRevertAuthorSince,
  adminRevertRevision,
  adminTranslationOverview,
  resolvePassageRef,
  saveTranslationDecision,
  translationQueue,
  translationReviewItem,
} from "./translation-review";
import type { TrDeps } from "./translation-review";

const USTADZ = "a".repeat(64);
const EDITOR = "b".repeat(64);
const OWNER = "f".repeat(64);
const editors = parseTranslationEditors(
  JSON.stringify([
    { key: USTADZ, name: "Uji", prefix: "Ust.", suffix: "Lc.", ustadz: true, mcp_name: true },
    { key: EDITOR, name: "Editor Uji", ustadz: false, mcp_name: false },
  ]),
);
const ustadz = editors.get(USTADZ)!;
const editor = editors.get(EDITOR)!;

const TR = {
  body1: "Ini teks uji (١) di halaman pertama (٢).",
  body2: "Teks halaman kedua ⟦QS 1:2-3⟧.",
  foot1: "Catatan kaki uji pertama.",
};

let corpus: D1Db;
let app: D1Db;
let deps: TrDeps;

beforeEach(async () => {
  corpus = sqliteD1(migratedDb("corpus"));
  app = sqliteD1(migratedDb("app"));
  await seedCorpus(corpus);
  const insert = (id: number, text: string) =>
    corpus
      .prepare(
        "INSERT INTO translation (passage_id, lang, text, model, prompt_version, created_at) VALUES (?, 'id', ?, 'model-uji', 'p@1', '2026-10-17')",
      )
      .bind(id, text);
  await corpus.batch([
    insert(PASSAGES.body1, TR.body1),
    insert(PASSAGES.body2, TR.body2),
    insert(PASSAGES.foot1, TR.foot1),
    corpus.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('corpus_version', 'uji-v1')"),
  ]);
  deps = { corpus, app, identity: USTADZ, now: "2026-10-22T03:00:00.000Z", editionId: ED };
});

const at = (minute: number) => `2026-10-22T03:${String(minute).padStart(2, "0")}:00.000Z`;

type DecideInput = { passage_id?: number } & (
  | { action: "confirm"; reason: string }
  | { action: "revise"; text: string; reason: string }
  | { action: "revert"; reason: string }
);

async function decide(who: { deps?: Partial<TrDeps>; editor?: typeof ustadz }, input: DecideInput) {
  const d = { ...deps, ...who.deps };
  const passage_id = input.passage_id ?? PASSAGES.body1;
  const item = await translationReviewItem(d, passage_id);
  if (item === null) throw new Error("paragraf tidak ada");
  return saveTranslationDecision(d, who.editor ?? ustadz, {
    ...input,
    passage_id,
    base_sha256: item.base_sha256,
    active_id: item.active_id,
  } as TranslationRevisionInput);
}

describe("antrean", () => {
  test("semua belum ditinjau; laporan pembaca dulu, lalu badan urut kitab, catatan kaki terakhir", async () => {
    await app
      .prepare(
        "INSERT INTO feedback (kind, passage_id, message) VALUES ('translation', ?, 'keliru')",
      )
      .bind(PASSAGES.body2)
      .all();
    const queue = await translationQueue(deps, "todo", 0);
    expect(queue.counts).toEqual({ todo: 3, done: 0, stale: 0 });
    expect(queue.items.map((i) => [i.passage_id, i.reasons])).toEqual([
      [PASSAGES.body2, ["laporan"]],
      [PASSAGES.body1, []],
      [PASSAGES.foot1, ["catatan_kaki"]],
    ]);
    expect(queue.items[1]?.location).toBe("j. 1, h. 1 · p1");
    expect(queue.daily).toEqual({ used: 0, limit: TR_DAILY_LIMIT });
  });

  test("rujukan paragraf: ID, jangkar, atau tautan pembaca", () => {
    expect(resolvePassageRef("70000001")).toBe(70000001);
    expect(resolvePassageRef("p4", ED)).toBe(PASSAGES.body2);
    expect(resolvePassageRef("https://surau.org/kitab/ihya/1/200#p2824")).toBe(10002824);
    expect(resolvePassageRef("kitab")).toBeNull();
    expect(resolvePassageRef("p0")).toBeNull();
  });
});

describe("simpan, riwayat, dan batalkan", () => {
  test("butir: Arab dari DB, draf AI, boleh 'sudah benar'", async () => {
    const item = await translationReviewItem(deps, PASSAGES.body1);
    expect(item).toMatchObject({
      arabic: "هذا نص تجريبي (١) في الصفحة الأولى (٢)",
      draft: TR.body1,
      state: { kind: "ai", text: TR.body1, by: null, stale: null },
      base_sha256: await textSha256(TR.body1),
      active_id: null,
      can_confirm: true,
      can_revert: false,
      check: { ok: true },
    });
    expect(await translationReviewItem(deps, PASSAGES.body3)).toBeNull();
  });

  test("sudah benar → masuk 'sudah ditinjau'; sudah benar tidak berlaku lagi", async () => {
    expect(await decide({}, { action: "confirm", reason: "" })).toMatchObject({ ok: true });
    const item = await translationReviewItem(deps, PASSAGES.body1);
    expect(item?.state).toMatchObject({
      kind: "confirmed",
      by: { short: "Ust. Uji", full: "Ust. Uji Lc.", role: "ustadz" },
    });
    expect(item?.can_confirm).toBe(false);
    expect(await decide({}, { action: "confirm", reason: "" })).toEqual({
      ok: false,
      error: "not_allowed",
    });
    expect((await translationQueue(deps, "done", 0)).items.map((i) => i.passage_id)).toEqual([
      PASSAGES.body1,
    ]);
  });

  test("draf AI yang tidak lolos pemeriksaan tidak bisa dinyatakan benar", async () => {
    await corpus
      .prepare("UPDATE translation SET text = ? WHERE passage_id = ?")
      .bind(`${TR.body1} الصبر`, PASSAGES.body1)
      .all();
    const item = await translationReviewItem(deps, PASSAGES.body1);
    expect(item).toMatchObject({ can_confirm: false, check: { ok: false } });
    expect(await decide({}, { action: "confirm", reason: "" })).toMatchObject({
      ok: false,
      error: "invalid_text",
      issues: [{ code: "arabic_letters" }],
    });
    // Perbaikan tetap bisa (dan memang itu jalannya).
    expect(
      await decide({}, { action: "revise", text: TR.body1, reason: "huruf Arab" }),
    ).toMatchObject({ ok: true });
  });

  test("perbaikan divalidasi terhadap teks Arab di server", async () => {
    const bad = await decide(
      {},
      { action: "revise", text: "Teks tanpa ayat.", reason: "uji", passage_id: PASSAGES.body2 },
    );
    expect(bad).toMatchObject({
      ok: false,
      error: "invalid_text",
      issues: [{ code: "placeholder_missing", detail: "⟦QS 1:2-3⟧" }],
    });
    expect(
      await decide({}, { action: "revise", text: `${TR.body1} الصبر`, reason: "uji" }),
    ).toMatchObject({ error: "invalid_text", issues: [{ code: "arabic_letters" }] });
    expect(await decide({}, { action: "revise", text: TR.body1, reason: "uji" })).toEqual({
      ok: false,
      error: "unchanged",
    });
  });

  test("koreksi berantai, konflik versi, batalkan memulihkan teks + label", async () => {
    const first = await decide(
      {},
      { action: "revise", text: "Inilah teks uji (١) pada halaman pertama (٢).", reason: "kata" },
    );
    expect(first.ok).toBe(true);
    const stale = await translationReviewItem(deps, PASSAGES.body1);
    // Editor kedua memperbaiki di atas revisi pertama (bukan dari draf AI lama).
    const second = await decide(
      { editor, deps: { identity: EDITOR, now: at(5) } },
      { action: "revise", text: "Inilah teks uji (١) pada halaman satu (٢).", reason: "angka" },
    );
    expect(second.ok).toBe(true);
    // Tab lama (dasar = revisi pertama) ditolak 409.
    expect(
      await saveTranslationDecision(deps, ustadz, {
        action: "revise",
        passage_id: PASSAGES.body1,
        text: "Teks lain (١) (٢).",
        reason: "x",
        base_sha256: stale!.base_sha256,
        active_id: stale!.active_id,
      }),
    ).toEqual({ ok: false, error: "conflict" });
    let item = await translationReviewItem(deps, PASSAGES.body1);
    expect(item?.state).toMatchObject({
      kind: "revised",
      text: "Inilah teks uji (١) pada halaman satu (٢).",
      by: { short: "Editor Uji", role: "editor" },
    });
    expect(item?.revert_to).toMatchObject({ kind: "revised", by: { short: "Ust. Uji" } });
    // Batalkan oleh ustadz: kembali ke revisi pertama dengan LABEL penulis pertama, bukan pembatal.
    expect(await decide({ deps: { now: at(9) } }, { action: "revert", reason: "" })).toMatchObject({
      ok: true,
    });
    item = await translationReviewItem(deps, PASSAGES.body1);
    expect(item?.state).toMatchObject({
      kind: "revised",
      text: "Inilah teks uji (١) pada halaman pertama (٢).",
      by: { short: "Ust. Uji" },
    });
    // Batalkan lagi: kembali ke draf AI tanpa nama.
    expect(await decide({ deps: { now: at(10) } }, { action: "revert", reason: "" })).toMatchObject(
      { ok: true },
    );
    item = await translationReviewItem(deps, PASSAGES.body1);
    expect(item?.state).toMatchObject({ kind: "ai", text: TR.body1, by: null });
    // Riwayat utuh: tidak ada baris yang hilang atau tertimpa.
    expect(item?.history.map((h) => [h.kind, h.status])).toEqual([
      ["reverted", "active"],
      ["reverted", "superseded"],
      ["revised", "superseded"],
      ["revised", "superseded"],
    ]);
    expect(item?.history.at(-1)?.text).toBe("Inilah teks uji (١) pada halaman pertama (٢).");
    expect((await translationQueue(deps, "todo", 0)).counts.todo).toBe(3);
  });

  test("simpanan ke-201 seorang editor dalam sehari → limit", async () => {
    // 200 simpanan: sudah benar lalu batalkan bergantian pada satu paragraf.
    for (let i = 0; i < TR_DAILY_LIMIT; i++) {
      const saved = await decide(
        {},
        i % 2 === 0 ? { action: "confirm", reason: "" } : { action: "revert", reason: "" },
      );
      expect(saved.ok).toBe(true);
    }
    expect(await decide({}, { action: "confirm", reason: "" })).toEqual({
      ok: false,
      error: "limit",
    });
    // Editor lain tidak terkena batas editor ini; hari berikutnya mulai lagi.
    expect(
      await decide(
        { editor, deps: { identity: EDITOR } },
        { action: "confirm", reason: "", passage_id: PASSAGES.body2 },
      ),
    ).toMatchObject({ ok: true });
    expect(
      await decide(
        { deps: { now: "2026-10-23T00:00:01.000Z" } },
        { action: "confirm", reason: "" },
      ),
    ).toMatchObject({ ok: true });
  });

  test("teks Arab berubah sesudah ditinjau → 'perlu ditinjau ulang'", async () => {
    await decide({}, { action: "confirm", reason: "" });
    await corpus
      .prepare("UPDATE passage SET text_raw = ? WHERE id = ?")
      .bind("هذا نص تجريبي معدل (١) في الصفحة الأولى (٢)", PASSAGES.body1)
      .all();
    expect((await translationQueue(deps, "stale", 0)).items.map((i) => i.passage_id)).toEqual([
      PASSAGES.body1,
    ]);
    expect((await translationReviewItem(deps, PASSAGES.body1))?.state.stale).toBe("source");
  });
});

describe("/admin", () => {
  test("koreksi terbaru + diff kata; pemilik membatalkan satu revisi", async () => {
    await decide(
      {},
      { action: "revise", text: "Ini teks uji (١) di halaman satu (٢).", reason: "angka" },
    );
    const overview = await adminTranslationOverview(app, corpus);
    expect(overview.recent).toHaveLength(1);
    const row = overview.recent[0]!;
    expect(row).toMatchObject({
      kind: "revised",
      author: "Ust. Uji Lc.",
      reason: "angka",
      active: true,
      location: "j. 1, h. 1 · p1",
    });
    expect(row.diff?.filter((p) => p.op !== "same")).toEqual([
      { op: "del", text: "pertama" },
      { op: "add", text: "satu" },
    ]);
    expect(overview.authors.map((a) => [a.author_key, a.n])).toEqual([[USTADZ, 1]]);
    expect(
      await adminRevertRevision({ ...deps, identity: OWNER, now: at(20) }, row.id),
    ).toMatchObject({ ok: true });
    const item = await translationReviewItem(deps, PASSAGES.body1);
    expect(item?.state).toMatchObject({ kind: "ai", by: null });
    expect(item?.history[0]).toMatchObject({ kind: "reverted", author: "Pemilik (admin)" });
    // Revisi yang sudah tidak aktif tidak bisa dibatalkan lagi.
    expect(await adminRevertRevision({ ...deps, identity: OWNER }, row.id)).toEqual({
      ok: false,
      error: "conflict",
    });
  });

  test("batalkan semua koreksi satu editor sejak T; paragraf yang sesudahnya diubah orang lain dilewati", async () => {
    const asEditor = { editor, deps: { identity: EDITOR } };
    await decide(
      { ...asEditor, deps: { identity: EDITOR, now: at(1) } },
      { action: "confirm", reason: "" },
    );
    await decide(
      { ...asEditor, deps: { identity: EDITOR, now: at(2) } },
      {
        action: "revise",
        text: "Teks halaman kedua ⟦QS 1:2-3⟧ (rusak).",
        reason: "uji",
        passage_id: PASSAGES.body2,
      },
    );
    await decide(
      { ...asEditor, deps: { identity: EDITOR, now: at(3) } },
      {
        action: "revise",
        text: "Catatan kaki uji (rusak).",
        reason: "uji",
        passage_id: PASSAGES.foot1,
      },
    );
    // Ustadz sudah memperbaiki catatan kaki itu lagi sesudahnya: tidak disentuh.
    await decide(
      { deps: { now: at(4) } },
      {
        action: "revise",
        text: "Catatan kaki uji yang benar.",
        reason: "uji",
        passage_id: PASSAGES.foot1,
      },
    );
    const result = await adminRevertAuthorSince(
      { ...deps, identity: OWNER, now: at(30) },
      EDITOR,
      at(0),
    );
    expect(result).toEqual({ reverted: 2, skipped: 1, remaining: 0 });
    // Tekan lagi: yang sudah dibatalkan pemilik tidak dihitung "diubah editor lain".
    expect(
      await adminRevertAuthorSince({ ...deps, identity: OWNER, now: at(31) }, EDITOR, at(0)),
    ).toEqual({ reverted: 0, skipped: 1, remaining: 0 });
    for (const id of [PASSAGES.body1, PASSAGES.body2])
      expect((await translationReviewItem(deps, id))?.state.kind).toBe("ai");
    expect((await translationReviewItem(deps, PASSAGES.foot1))?.state).toMatchObject({
      kind: "revised",
      by: { short: "Ust. Uji" },
    });
  });

  test("batalkan massal melewati versi editor yang dipulihkan pembatalan orang lain", async () => {
    const x = { editor, deps: { identity: EDITOR } };
    // X R1 → Y R2 → Y batal (ke R1 milik X) → X R4.
    await decide(
      { ...x, deps: { identity: EDITOR, now: at(1) } },
      {
        action: "revise",
        text: "Ini teks uji (١) versi X satu (٢).",
        reason: "x1",
      },
    );
    await decide(
      { deps: { now: at(2) } },
      {
        action: "revise",
        text: "Ini teks uji (١) versi Y (٢).",
        reason: "y",
      },
    );
    await decide({ deps: { now: at(3) } }, { action: "revert", reason: "" });
    await decide(
      { ...x, deps: { identity: EDITOR, now: at(4) } },
      {
        action: "revise",
        text: "Ini teks uji (١) versi X dua (٢).",
        reason: "x2",
      },
    );
    expect(
      await adminRevertAuthorSince({ ...deps, identity: OWNER, now: at(30) }, EDITOR, at(0)),
    ).toMatchObject({ reverted: 1 });
    // Kembali ke sebelum versi X pertama = draf AI (bukan R1 milik X).
    expect((await translationReviewItem(deps, PASSAGES.body1))?.state).toMatchObject({
      kind: "ai",
      by: null,
    });
  });
});
