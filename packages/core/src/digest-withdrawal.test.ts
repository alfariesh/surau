import { describe, expect, test } from "vite-plus/test";

import raw from "../../../data/reviews/ihya-9472-intisari-tolak.json" with { type: "json" };
import {
  DIGEST_WITHDRAWAL_DIGEST,
  DIGEST_WITHDRAWALS,
  digestWithdrawalFile,
  withdrawalDigest,
  withdrawnOrds,
} from "./digest-withdrawal.ts";
import { searchCacheKey } from "./search.ts";
import { hasArabicLetters } from "./translation-text.ts";

describe("daftar tarik Intisari Ihya (ADR-127)", () => {
  test("berkas sah: dua gagasan Salah QA pilot X15b, korpus ihya-v9, audio ikut ditahan", () => {
    const file = digestWithdrawalFile.parse(raw);
    expect(file).toMatchObject({ format: 1, edition: 1, corpus: "ihya-v9" });
    expect(DIGEST_WITHDRAWALS.map((w) => [w.toc_node_id, w.ord, w.lang])).toEqual([
      [100007, 4, "id"],
      [100017, 2, "id"],
    ]);
    for (const w of DIGEST_WITHDRAWALS) {
      expect(w.audio_r2_key).toMatch(new RegExp(`^ihya/id/${w.toc_node_id}-[0-9a-f]{12}\\.mp3$`));
      // Tanpa teks kitab di git (aturan keras 3): alasan ditulis tanpa huruf Arab.
      expect(hasArabicLetters(w.reason)).toBe(false);
    }
    // Bagian lain Intisari yang sama dan induk yang bisa dibangun dari gagasan tertarik sudah diaudit.
    expect(file.self_checked.map((p) => p.toc_node_id)).toEqual([100007, 100017]);
    expect(file.parents_checked.map((p) => p.toc_node_id)).toEqual([100004, 100003]);
  });

  test("withdrawnOrds: hanya node, bahasa, dan versi Intisari yang sama", () => {
    const at = "2026-10-24T17:14:06.389358+00:00";
    expect([...withdrawnOrds(100007, "id", at)]).toEqual([4]);
    expect(withdrawnOrds(100007, "id", "2026-11-01T00:00:00Z").size).toBe(0);
    expect(withdrawnOrds(100007, "en", at).size).toBe(0);
    expect(withdrawnOrds(100004, "id", at).size).toBe(0);
    expect(withdrawnOrds(100007, "id", at, []).size).toBe(0);
  });

  test("sidik daftar tarik ikut kunci cache Cari: penarikan baru = kunci baru", () => {
    expect(DIGEST_WITHDRAWAL_DIGEST).toBe(withdrawalDigest(DIGEST_WITHDRAWALS));
    expect(withdrawalDigest(DIGEST_WITHDRAWALS.slice(1))).not.toBe(DIGEST_WITHDRAWAL_DIGEST);
    expect(withdrawalDigest([])).not.toBe(DIGEST_WITHDRAWAL_DIGEST);
    const key = JSON.parse(searchCacheKey("sabar") ?? "null") as { v: unknown[] };
    expect(key.v).toContain(DIGEST_WITHDRAWAL_DIGEST);
  });
});
