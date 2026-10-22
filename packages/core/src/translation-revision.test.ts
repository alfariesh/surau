// Daftar editor, peran ruang tinjau, dan resolusi keadaan terjemahan dari riwayat revisi (X08).
import { describe, expect, test } from "vite-plus/test";
import type { TranslationRevisionRow } from "@surau/db";

import {
  canRevert,
  canUseTinjauRoom,
  parseTranslationEditors,
  previousState,
  stateOf,
  textSha256,
  translationRevisionInput,
} from "./translation-revision.ts";

const KEY = "a".repeat(64);
const OTHER = "b".repeat(64);
const ANAS = {
  key: KEY,
  name: "Anas",
  prefix: "Ust.",
  suffix: "Lc.",
  ustadz: true,
  mcp_name: true,
  also: ["jawaban", "takhrij"],
};

describe("parseTranslationEditors", () => {
  test("nama pendek, nama lengkap, peran, dan izin nama di MCP", () => {
    const editors = parseTranslationEditors(
      JSON.stringify([ANAS, { key: OTHER, name: "Salman", ustadz: false, mcp_name: false }]),
    );
    expect(editors.get(KEY)).toEqual({
      key: KEY,
      short: "Ust. Anas",
      full: "Ust. Anas Lc.",
      role: "ustadz",
      mcpName: true,
      also: ["jawaban", "takhrij"],
    });
    expect(editors.get(OTHER)).toMatchObject({ short: "Salman", full: "Salman", role: "editor" });
    // Nama biasa yang memuat potongan huruf serupa gelar tetap boleh.
    expect(
      parseTranslationEditors(
        JSON.stringify([{ key: OTHER, name: "Khalid Ustman", ustadz: false, mcp_name: false }]),
      ).size,
    ).toBe(1);
  });

  test("gagal tertutup: kosong, JSON rusak, entri tidak sah, kunci ganda", () => {
    for (const value of [
      undefined,
      "",
      "{",
      "{}",
      JSON.stringify([{ ...ANAS, key: "bukan-kunci" }]),
      JSON.stringify([{ ...ANAS, name: "أنس" }]),
      JSON.stringify([{ ...ANAS, extra: 1 }]),
      // Gelar ustadz hanya untuk akun ustadz, juga bila diselipkan di nama atau gelar belakang.
      JSON.stringify([{ ...ANAS, ustadz: false }]),
      JSON.stringify([{ key: OTHER, name: "Ust. Fulan", ustadz: false, mcp_name: false }]),
      JSON.stringify([
        { key: OTHER, name: "Fulan", suffix: "Kiai", ustadz: false, mcp_name: false },
      ]),
      // Nama melebihi batas kolom DB app.
      JSON.stringify([{ ...ANAS, name: "a".repeat(60), suffix: "b".repeat(60) }]),
      JSON.stringify([ANAS, ANAS]),
      // Satu entri rusak membatalkan semuanya (bukan sebagian).
      JSON.stringify([ANAS, { key: OTHER }]),
    ])
      expect(parseTranslationEditors(value).size).toBe(0);
  });
});

describe("canUseTinjauRoom", () => {
  const editors = parseTranslationEditors(
    JSON.stringify([
      { ...ANAS, also: ["jawaban"] },
      { key: OTHER, name: "Editor", ustadz: false, mcp_name: false },
    ]),
  );
  const tester = "c".repeat(64);
  test("terjemahan hanya untuk akun terdaftar", () => {
    expect(canUseTinjauRoom(KEY, "terjemahan", editors)).toBe(true);
    expect(canUseTinjauRoom(tester, "terjemahan", editors)).toBe(false);
  });
  test("editor terdaftar hanya membuka ruang lain yang tertulis; akun lain tetap akses lama", () => {
    expect(canUseTinjauRoom(KEY, "jawaban", editors)).toBe(true);
    expect(canUseTinjauRoom(KEY, "takhrij", editors)).toBe(false);
    expect(canUseTinjauRoom(OTHER, "jawaban", editors)).toBe(false);
    expect(canUseTinjauRoom(tester, "jawaban", editors)).toBe(true);
    expect(canUseTinjauRoom(tester, "takhrij", editors)).toBe(true);
  });
});

describe("translationRevisionInput", () => {
  const target = { passage_id: 5, base_sha256: "d".repeat(64), active_id: null };
  test("perbaikan wajib berisi teks dan alasan; tanpa huruf Arab di alasan", () => {
    expect(
      translationRevisionInput.safeParse({ action: "revise", ...target, text: "x", reason: "y" })
        .success,
    ).toBe(true);
    for (const bad of [
      { action: "revise", ...target, text: "x", reason: " " },
      { action: "revise", ...target, text: "", reason: "y" },
      { action: "revise", ...target, text: "x", reason: "الصبر" },
      { action: "confirm", ...target, reason: "", text: "x" },
      { action: "confirm", ...target, reason: "", extra: 1 },
      { action: "hapus", ...target, reason: "" },
    ])
      expect(translationRevisionInput.safeParse(bad).success).toBe(false);
    expect(
      translationRevisionInput.safeParse({ action: "revert", ...target, reason: "" }).success,
    ).toBe(true);
  });
});

describe("stateOf / previousState", () => {
  const row = (over: Partial<TranslationRevisionRow>): TranslationRevisionRow => ({
    id: 1,
    passage_id: 5,
    lang: "id",
    kind: "revised",
    text: "Teks A",
    reason: "alasan",
    restores_id: null,
    supersedes_id: null,
    base_sha256: "1".repeat(64),
    draft_sha256: "1".repeat(64),
    source_sha256: "2".repeat(64),
    author_key: KEY,
    author_name: "Ust. A Lc.",
    author_short: "Ust. A",
    author_role: "ustadz",
    author_public: 1,
    status: "active",
    corpus_version: "v",
    created_at: "2026-10-22T00:00:00.000Z",
    ...over,
  });
  const corpus = {
    text: "Draf AI",
    draft: "Draf AI",
    draftSha256: "1".repeat(64),
    sourceSha256: "2".repeat(64),
    reviewed: false,
  };
  const a = row({ id: 1, status: "superseded" });
  const b = row({ id: 2, text: "Teks B", author_short: "Ust. B", supersedes_id: 1 });
  const undoB = row({ id: 3, kind: "reverted", text: null, restores_id: 1, supersedes_id: 2 });
  const undoA = row({ id: 4, kind: "reverted", text: null, restores_id: null, supersedes_id: 1 });
  const byId = new Map([a, b, undoB, undoA].map((r) => [r.id, r]));

  test("tanpa revisi = draf AI; revisi = teks + sumber label", () => {
    expect(stateOf(null, byId, corpus)).toEqual({
      kind: "ai",
      text: "Draf AI",
      source: null,
      stale: null,
    });
    expect(stateOf(b, byId, corpus)).toMatchObject({ kind: "revised", text: "Teks B", source: b });
  });

  test("batalkan memulihkan teks DAN label keadaan sebelumnya; kembali ke AI = tanpa nama", () => {
    expect(previousState(b, byId, corpus)).toMatchObject({
      kind: "revised",
      text: "Teks A",
      source: a,
    });
    // Baris pembatalan tidak pernah menjadi sumber label: yang tampil revisi A (Ust. A).
    expect(stateOf(undoB, byId, corpus)).toMatchObject({ kind: "revised", source: a });
    expect(stateOf(undoA, byId, corpus)).toEqual({
      kind: "ai",
      text: "Draf AI",
      source: null,
      stale: null,
    });
    expect(previousState(a, byId, corpus).kind).toBe("ai");
    // Batalkan lagi sesudah pembatalan mundur satu versi (ke draf AI), bukan mengulang Teks B.
    expect(previousState(undoB, byId, corpus).kind).toBe("ai");
    expect(canRevert(undoB, byId)).toBe(true);
    expect(canRevert(undoA, byId)).toBe(false);
    expect(canRevert(null, byId)).toBe(false);
  });

  test("usang: teks Arab berubah, atau draf AI yang dinyatakan benar sudah diganti", () => {
    expect(stateOf(b, byId, { ...corpus, sourceSha256: "9".repeat(64) }).stale).toBe("source");
    const confirmed = row({ id: 9, kind: "confirmed", text: null });
    expect(stateOf(confirmed, byId, corpus)).toMatchObject({ kind: "confirmed", stale: null });
    expect(stateOf(confirmed, byId, { ...corpus, draftSha256: "8".repeat(64) }).stale).toBe(
      "draft",
    );
    // Perbaikan manusia tetap berlaku walau draf AI di sekitarnya berubah.
    expect(stateOf(b, byId, { ...corpus, draftSha256: "8".repeat(64) }).stale).toBeNull();
  });

  test("korpus yang sudah memuat tinjauan tanpa revisi di DB app", () => {
    expect(stateOf(null, byId, { ...corpus, text: "Teks korpus", reviewed: true })).toMatchObject({
      kind: "corpus",
      text: "Teks korpus",
    });
  });
});

test("textSha256 = SHA-256 heksadesimal UTF-8", async () => {
  expect(await textSha256("abc")).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
