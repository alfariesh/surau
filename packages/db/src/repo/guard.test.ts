// Tes pengaman biaya S20 di D1 lokal workerd: kuota atomik, reservasi bersamaan yang tidak bisa
// melewati plafon, komit idempoten, reservasi basi dibereskan, dan pembersihan fisik P-7.
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { ZodError } from "zod";

import { llmLedgerRow } from "../schema/app.ts";
import { getSettings } from "./app.ts";
import {
  EMPTY_LEDGER_USAGE,
  budgetPeriod,
  consumeQuota,
  expireStaleReservations,
  getBudget,
  lastPurgeDay,
  ledgerSummary,
  listRecentFeedback,
  markBudgetWarning,
  markPurged,
  purgeExpired,
  quotaDay,
  quotaStats,
  quotaUsed,
  reserveBudget,
  setBudgetCap,
  setFeedbackStatus,
  setQuotaLimits,
  setSetting,
  settleLedger,
  toMicro,
} from "./guard.ts";

const db = env.APP;
const hex = (c: string) => c.repeat(64);
const PERIOD = "2026-10";
const NOW = "2026-10-21T01:00:00.000Z";

beforeEach(async () => {
  await db.batch([
    db.prepare("DELETE FROM llm_ledger"),
    db.prepare("DELETE FROM llm_budget"),
    db.prepare("DELETE FROM quota_daily"),
  ]);
});

const ledger = async (id: string) =>
  llmLedgerRow.parse(await db.prepare("SELECT * FROM llm_ledger WHERE id = ?").bind(id).first());

describe("satuan", () => {
  test("toMicro membulatkan ke atas tanpa galat floating point", () => {
    expect(toMicro(0.002)).toBe(2000);
    expect(toMicro(0.0000001)).toBe(1);
    expect(toMicro(0)).toBe(0);
    expect(toMicro(20)).toBe(20_000_000);
    expect(() => toMicro(-1)).toThrow(RangeError);
    expect(() => toMicro(Number.NaN)).toThrow(RangeError);
  });

  test("periode = bulan UTC, hari kuota = tanggal UTC", () => {
    // 23.30 WIB tanggal 31 = 16.30 UTC tanggal 31; 07.30 WIB tanggal 1 = 00.30 UTC tanggal 1.
    expect(budgetPeriod(new Date("2026-10-31T23:59:59.999Z"))).toBe("2026-10");
    expect(budgetPeriod(new Date("2026-11-01T00:00:00.000Z"))).toBe("2026-11");
    expect(quotaDay(new Date("2026-10-21T23:59:59Z"))).toBe("2026-10-21");
  });
});

describe("kuota harian", () => {
  const day = "2026-10-21";
  const subjects = { anon: hex("a"), ip: hex("b") };

  test("anon dan IP naik bersama sampai batas anon, lalu ditolak tanpa mengubah apa pun", async () => {
    for (let i = 1; i <= 3; i++) {
      expect(await consumeQuota(db, day, subjects, { anon: 3, ip: 10 })).toEqual({
        ok: true,
        anon: i,
        ip: i,
      });
    }
    expect(await consumeQuota(db, day, subjects, { anon: 3, ip: 10 })).toEqual({
      ok: false,
      scope: "anon",
      anon: 3,
      ip: 3,
    });
    expect(await quotaUsed(db, day, subjects)).toEqual({ anon: 3, ip: 3 });
  });

  test("IP penuh menolak anon-id baru tanpa memakai kuota anon-nya", async () => {
    await consumeQuota(db, day, { anon: hex("c"), ip: subjects.ip }, { anon: 10, ip: 1 });
    expect(await consumeQuota(db, day, subjects, { anon: 10, ip: 1 })).toEqual({
      ok: false,
      scope: "ip",
      anon: 0,
      ip: 1,
    });
    expect(await quotaUsed(db, day, subjects)).toEqual({ anon: 0, ip: 1 });
  });

  test("hari baru = hitungan baru; batas 0 = tertutup", async () => {
    await consumeQuota(db, day, subjects, { anon: 1, ip: 1 });
    expect((await consumeQuota(db, "2026-10-22", subjects, { anon: 1, ip: 1 })).ok).toBe(true);
    expect(
      (await consumeQuota(db, day, { anon: hex("d"), ip: hex("e") }, { anon: 0, ip: 5 })).ok,
    ).toBe(false);
  });

  test("permintaan bersamaan tidak melewati batas", async () => {
    const results = await Promise.all(
      Array.from({ length: 12 }, () => consumeQuota(db, day, subjects, { anon: 5, ip: 50 })),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(5);
    expect(await quotaUsed(db, day, subjects)).toEqual({ anon: 5, ip: 5 });
  });

  test("statistik admin hanya agregat", async () => {
    await consumeQuota(db, day, subjects, { anon: 1, ip: 5 });
    await consumeQuota(db, day, { anon: hex("f"), ip: subjects.ip }, { anon: 1, ip: 5 });
    expect(await quotaStats(db, day, { anon: 1, ip: 5 })).toEqual({
      anon: { subjects: 2, exhausted: 2, used: 2 },
      ip: { subjects: 1, exhausted: 0, used: 2 },
    });
  });
});

describe("anggaran dan ledger", () => {
  const reserve = (id: string, amountMicro: number, capMicro = 10_000, kind = "jawab" as const) =>
    reserveBudget(db, { id, kind, period: PERIOD, capMicro, amountMicro, now: NOW });
  const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

  test("reservasi membuat periode, lalu menolak bila plafon terlewati", async () => {
    expect(await reserve(uuid(1), 6000)).toBe(true);
    expect(await getBudget(db, PERIOD)).toMatchObject({
      cap_micro: 10_000,
      spent_micro: 0,
      reserved_micro: 6000,
    });
    expect(await reserve(uuid(2), 5000)).toBe(false);
    expect(await reserve(uuid(3), 4000)).toBe(true);
    expect((await getBudget(db, PERIOD))?.reserved_micro).toBe(10_000);
    const rows = await db.prepare("SELECT id FROM llm_ledger ORDER BY id").all();
    expect(rows.results).toEqual([{ id: uuid(1) }, { id: uuid(3) }]);
  });

  test("reservasi bersamaan tidak pernah melewati plafon", async () => {
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, i) => reserve(uuid(100 + i), 700, 10_000)),
    );
    // 14 × 700 = 9.800 ≤ 10.000 < 15 × 700.
    expect(results.filter(Boolean)).toHaveLength(14);
    const b = await getBudget(db, PERIOD);
    expect(b?.reserved_micro).toBe(9800);
    expect(b!.spent_micro + b!.reserved_micro).toBeLessThanOrEqual(b!.cap_micro);
  });

  test("komit memindahkan reservasi ke biaya aktual, sekali saja", async () => {
    await reserve(uuid(1), 6000);
    const settle = () =>
      settleLedger(db, {
        id: uuid(1),
        outcome: "answer",
        reason: null,
        model: "claude-haiku-5-5",
        costMicro: 2600,
        estimated: false,
        usage: { ...EMPTY_LEDGER_USAGE, requests: 2, input_tokens: 21_000, output_tokens: 900 },
        now: "2026-10-21T01:00:09.000Z",
      });
    expect(await settle()).toBe(true);
    expect(await settle()).toBe(false);
    expect(await getBudget(db, PERIOD)).toMatchObject({ spent_micro: 2600, reserved_micro: 0 });
    expect(await ledger(uuid(1))).toMatchObject({
      status: "committed",
      outcome: "answer",
      cost_micro: 2600,
      estimated: 0,
      requests: 2,
      input_tokens: 21_000,
    });
    // Sisa anggaran kembali bisa dipakai.
    expect(await reserve(uuid(2), 7400)).toBe(true);
    expect(await reserve(uuid(3), 1)).toBe(false);
  });

  test("anggaran habis: reservasi ditolak sampai periode baru", async () => {
    await reserve(uuid(1), 10_000);
    await settleLedger(db, {
      id: uuid(1),
      outcome: "answer",
      reason: null,
      model: "claude-haiku-5-5",
      costMicro: 10_000,
      estimated: false,
      usage: EMPTY_LEDGER_USAGE,
      now: NOW,
    });
    expect(await reserve(uuid(2), 1)).toBe(false);
    expect(
      await reserveBudget(db, {
        id: uuid(3),
        kind: "jawab",
        period: "2026-11",
        capMicro: 10_000,
        amountMicro: 1,
        now: "2026-11-01T00:00:01.000Z",
      }),
    ).toBe(true);
  });

  test("reservasi basi dihitung terpakai (konservatif) dan tidak lagi tereservasi", async () => {
    await reserve(uuid(1), 3000);
    await reserveBudget(db, {
      id: uuid(2),
      kind: "retry",
      period: PERIOD,
      capMicro: 10_000,
      amountMicro: 2000,
      now: "2026-10-21T01:20:00.000Z",
    });
    const n = await expireStaleReservations(
      db,
      "2026-10-21T01:10:00.000Z",
      "2026-10-21T01:20:30.000Z",
    );
    expect(n).toBe(1);
    expect(await getBudget(db, PERIOD)).toMatchObject({ spent_micro: 3000, reserved_micro: 2000 });
    expect(await ledger(uuid(1))).toMatchObject({
      status: "expired",
      cost_micro: 3000,
      estimated: 1,
    });
    // Komit terlambat dari worker yang ternyata masih hidup tidak menghitung dua kali.
    expect(
      await settleLedger(db, {
        id: uuid(1),
        outcome: "answer",
        reason: null,
        model: null,
        costMicro: 100,
        estimated: false,
        usage: EMPTY_LEDGER_USAGE,
        now: NOW,
      }),
    ).toBe(false);
    expect((await getBudget(db, PERIOD))?.spent_micro).toBe(3000);
  });

  test("peringatan 80% sekali per periode", async () => {
    await reserve(uuid(1), 7000);
    expect(await markBudgetWarning(db, PERIOD, NOW)).toBeNull();
    await reserve(uuid(2), 1000);
    expect((await markBudgetWarning(db, PERIOD, NOW))?.warned_at).toBe(NOW);
    expect(await markBudgetWarning(db, PERIOD, NOW)).toBeNull();
  });

  test("ringkasan ledger per jenis dan hasil", async () => {
    await reserve(uuid(1), 3000);
    await reserve(uuid(2), 3000);
    await settleLedger(db, {
      id: uuid(1),
      outcome: "answer",
      reason: null,
      model: "claude-haiku-5-5",
      costMicro: 2500,
      estimated: false,
      usage: EMPTY_LEDGER_USAGE,
      now: NOW,
    });
    expect(await ledgerSummary(db, PERIOD)).toEqual([
      {
        kind: "jawab",
        outcome: null,
        status: "reserved",
        calls: 1,
        cost_micro: 3000,
        estimated: 0,
      },
      {
        kind: "jawab",
        outcome: "answer",
        status: "committed",
        calls: 1,
        cost_micro: 2500,
        estimated: 0,
      },
    ]);
  });

  test("ubah plafon: pengaturan + periode berjalan", async () => {
    await reserve(uuid(1), 9000);
    expect(await markBudgetWarning(db, PERIOD, NOW)).not.toBeNull();
    await setBudgetCap(db, 1, PERIOD, NOW);
    expect((await getSettings(db)).budget_monthly_usd).toBe(1);
    expect(await getBudget(db, PERIOD)).toMatchObject({ cap_micro: 1_000_000, warned_at: null });
    await setBudgetCap(db, 20, PERIOD, NOW);
    await expect(setBudgetCap(db, -1, PERIOD, NOW)).rejects.toBeInstanceOf(ZodError);
  });
});

describe("pengaturan dan laporan", () => {
  test("setQuotaLimits menulis kedua kuota dalam satu transaksi (nilai salah = tidak ada yang berubah)", async () => {
    await setQuotaLimits(db, { anon: 4, ip: 12 }, NOW);
    expect(await getSettings(db)).toMatchObject({ quota_anon_daily: 4, quota_ip_daily: 12 });
    await expect(setQuotaLimits(db, { anon: 5, ip: -1 }, NOW)).rejects.toBeInstanceOf(ZodError);
    expect(await getSettings(db)).toMatchObject({ quota_anon_daily: 4, quota_ip_daily: 12 });
    await setQuotaLimits(db, { anon: 10, ip: 30 }, NOW);
  });

  test("penanda hapus fisik harian", async () => {
    await markPurged(db, "2026-10-21", NOW);
    expect(await lastPurgeDay(db)).toBe("2026-10-21");
    await markPurged(db, "", NOW);
    expect(await lastPurgeDay(db)).toBe("");
  });

  test("setSetting memvalidasi nilai per kunci", async () => {
    await setSetting(db, "quota_anon_daily", "7", NOW);
    expect((await getSettings(db)).quota_anon_daily).toBe(7);
    await setSetting(db, "quota_anon_daily", "10", NOW);
    await expect(setSetting(db, "quota_anon_daily", "-1", NOW)).rejects.toBeInstanceOf(ZodError);
    await expect(setSetting(db, "jawab_enabled", "ya", NOW)).rejects.toBeInstanceOf(ZodError);
  });

  test("status laporan: resolved_at hanya saat selesai", async () => {
    const { results } = await db
      .prepare("INSERT INTO feedback (kind, message) VALUES ('other', 'uji admin') RETURNING id")
      .all();
    const id = (results[0] as { id: number }).id;
    expect(await setFeedbackStatus(db, id, "fixed", NOW)).toBe(true);
    expect((await listRecentFeedback(db, 5)).find((f) => f.id === id)).toMatchObject({
      status: "fixed",
      resolved_at: NOW,
    });
    expect(await setFeedbackStatus(db, id, "triaged", NOW)).toBe(true);
    expect((await listRecentFeedback(db, 5)).find((f) => f.id === id)?.resolved_at).toBeNull();
    expect(await setFeedbackStatus(db, 999_999, "fixed", NOW)).toBe(false);
  });
});

const left0 = async (sql: string) => (await db.prepare(sql).all()).results;

describe("pembersihan fisik (P-7)", () => {
  test("hanya data yang lewat masa simpan yang dihapus", async () => {
    const at = new Date("2026-10-21T00:05:00.000Z");
    await db.batch([
      db
        .prepare(
          `INSERT INTO answer_cache (key, corpus_version, prompt_version, model, outcome, result_json, created_at, expires_at)
         VALUES (?1, 'v', 'p', 'm', 'answer', '{}', '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z'),
                (?2, 'v', 'p', 'm', 'answer', '{}', '2026-10-20T00:00:00Z', '2026-11-19T00:00:00Z')`,
        )
        .bind(hex("1"), hex("2")),
      db
        .prepare(
          `INSERT INTO quota_daily (day, scope, subject, used) VALUES
         ('2026-10-13', 'anon', ?1, 1), ('2026-10-14', 'anon', ?1, 1), ('2026-10-21', 'ip', ?1, 1)`,
        )
        .bind(hex("3")),
      db.prepare(
        `INSERT INTO feedback (kind, message, status, resolved_at) VALUES
         ('other', 'lama selesai', 'fixed', '2025-10-01T00:00:00Z'),
         ('other', 'lama belum ditangani', 'new', NULL),
         ('other', 'baru selesai', 'rejected', '2026-10-01T00:00:00Z')`,
      ),
      db
        .prepare(
          `INSERT INTO llm_budget (period, cap_micro, updated_at) VALUES ('2024-09', 1, ?1), ('2026-10', 1, ?1)`,
        )
        .bind(NOW),
      db.prepare(
        `INSERT INTO llm_ledger (id, kind, period, created_at, settled_at, status, reserved_micro, cost_micro)
         VALUES ('00000000-0000-4000-8000-000000000001', 'jawab', '2024-09', '2024-09-01T00:00:00Z', '2024-09-01T00:00:01Z', 'committed', 1, 1),
                ('00000000-0000-4000-8000-000000000002', 'jawab', '2026-10', '2026-10-01T00:00:00Z', '2026-10-01T00:00:01Z', 'committed', 1, 1)`,
      ),
    ]);
    const log = (id: string, expires: string) =>
      db
        .prepare(
          `INSERT INTO answer_log (id, run_id, question_id, question_hash, answer_hash, corpus_version,
             prompt_version, model, private, question_json, answer_json, created_at, expires_at)
           VALUES (?1, 'purge', ?1, ?2, ?2, 'v', 'p', 'm', 0, '{}', '{}', '2025-01-01T00:00:00Z', ?3)`,
        )
        .bind(id, hex("9"), expires);
    await db.batch([
      log("purge-lama", "2026-10-01T00:00:00Z"),
      log("purge-baru", "2027-10-01T00:00:00Z"),
      db
        .prepare(
          `INSERT INTO review (answer_id, reviewer_key, reviewer_name, verdict, language_score, reason, updated_at)
           VALUES ('purge-lama', ?1, 'Uji', 'benar', 5, 'uji', '2026-01-01T00:00:00Z')`,
        )
        .bind(hex("8")),
    ]);
    const purged = await purgeExpired(db, at);
    expect(purged).toMatchObject({
      answer_cache: 1,
      answer_log: 1,
      review: 1,
      quota_daily: 1,
      feedback: 1,
      llm_ledger: 1,
    });
    expect(await left0("SELECT id FROM answer_log WHERE run_id = 'purge'")).toEqual([
      { id: "purge-baru" },
    ]);
    const left = async (sql: string) => (await db.prepare(sql).all()).results;
    expect(await left("SELECT key FROM answer_cache")).toEqual([{ key: hex("2") }]);
    expect(await left("SELECT day FROM quota_daily ORDER BY day")).toEqual([
      { day: "2026-10-14" },
      { day: "2026-10-21" },
    ]);
    expect(
      await left(
        "SELECT message FROM feedback WHERE message IN ('lama selesai', 'lama belum ditangani', 'baru selesai') ORDER BY message",
      ),
    ).toEqual([{ message: "baru selesai" }, { message: "lama belum ditangani" }]);
    expect(await left("SELECT period FROM llm_ledger")).toEqual([{ period: "2026-10" }]);
  });
});
