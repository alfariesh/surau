import { CORPUS_SCHEMA_VERSION } from "@surau/db";
import { describe, expect, test } from "vite-plus/test";

import { decidePromote, loadSmokeFailures, rollbackSchemaProblem } from "./promote-plan.ts";
import type { PromoteArgs, PromoteState } from "./promote-plan.ts";

const STAGING = "id-staging";
const args = (over: Partial<PromoteArgs> = {}): PromoteArgs => ({
  version: "ihya-v7",
  confirm: false,
  switchOnly: false,
  reload: false,
  ...over,
});
const state = (over: Partial<PromoteState> = {}): PromoteState => ({
  existing: undefined,
  stagingId: STAGING,
  isProtected: () => false,
  ...over,
});
const db = (uuid: string) => ({ uuid, name: "surau-corpus-ihya-v7" });

describe("decidePromote (#78)", () => {
  test("versi salah bentuk → usage", () => {
    for (const version of ["", "ihya", "Ihya-v1", "ihya-v", "ihya-v1; rm", "7-v1"]) {
      expect(decidePromote(args({ version }), state()).kind, version).toBe("usage");
    }
  });

  test("korpus staging tidak pernah jadi produksi, juga lewat --switch-only", () => {
    for (const over of [{}, { switchOnly: true }, { confirm: true, reload: true }]) {
      const plan = decidePromote(args(over), state({ existing: db(STAGING) }));
      expect(plan).toMatchObject({ kind: "refuse", message: expect.stringMatching(/staging/) });
    }
  });

  test("--switch-only: DB harus sudah ada; korpus terlindungi BOLEH (itulah rollback)", () => {
    expect(decidePromote(args({ switchOnly: true }), state())).toMatchObject({
      kind: "refuse",
      message: expect.stringMatching(/tidak ada di akun/),
    });
    const plan = decidePromote(
      args({ switchOnly: true }),
      state({ existing: db("id-lama"), isProtected: () => true }),
    );
    expect(plan).toEqual({ kind: "switch", name: "surau-corpus-ihya-v7", db: db("id-lama") });
  });

  test("DB yang pernah melayani produksi tidak boleh dimuat ulang, walau --reload --confirm", () => {
    const plan = decidePromote(
      args({ reload: true, confirm: true }),
      state({ existing: db("id-prod"), isProtected: (b) => b.id === "id-prod" }),
    );
    expect(plan).toMatchObject({ kind: "refuse", message: expect.stringMatching(/ihya-v8/) });
  });

  test("DB sudah ada tanpa --reload ditolak; dengan --reload dimuat ulang tanpa membuat baru", () => {
    expect(decidePromote(args({ confirm: true }), state({ existing: db("id-x") }))).toMatchObject({
      kind: "refuse",
      message: expect.stringMatching(/--reload/),
    });
    expect(
      decidePromote(args({ confirm: true, reload: true }), state({ existing: db("id-x") })),
    ).toEqual({ kind: "load", name: "surau-corpus-ihya-v7", create: false });
  });

  test("tanpa --confirm hanya rencana; dengan --confirm muat (buat DB bila belum ada)", () => {
    expect(decidePromote(args(), state())).toEqual({
      kind: "preview",
      name: "surau-corpus-ihya-v7",
      create: true,
    });
    expect(decidePromote(args({ confirm: true }), state())).toEqual({
      kind: "load",
      name: "surau-corpus-ihya-v7",
      create: true,
    });
  });
});

describe("pemeriksaan smoke", () => {
  test("rollback: skema lebih lama boleh, lebih baru atau tak terbaca ditolak", () => {
    expect(rollbackSchemaProblem("1")).toBeNull();
    expect(rollbackSchemaProblem(String(CORPUS_SCHEMA_VERSION))).toBeNull();
    expect(rollbackSchemaProblem(String(CORPUS_SCHEMA_VERSION + 1))).toMatch(/kode mendukung/);
    expect(rollbackSchemaProblem(undefined)).toMatch(/–/);
    expect(rollbackSchemaProblem("x")).not.toBeNull();
  });

  test("muat versi baru: batasan skema juga kegagalan", () => {
    expect(loadSmokeFailures({ problems: [], limitations: [] })).toEqual([]);
    expect(loadSmokeFailures({ problems: ["a"], limitations: ["b"] })).toEqual(["a", "b"]);
  });
});
