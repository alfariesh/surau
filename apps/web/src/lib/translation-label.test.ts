// Label terjemahan bersama (X08, ADR-082): pembaca, kartu Cari, dan kartu kutipan Maknaz.
import { describe, expect, test } from "vite-plus/test";

import { translationLabel } from "./translation-label";

const base = {
  revised: true,
  reviewed_at: "2026-10-22T03:00:00.000Z",
  reviewer_role: "ustadz" as const,
  reviewer_name: "Ust. Uji Lc.",
  reviewer_short: "Ust. Uji",
};

describe("translationLabel", () => {
  test("tanpa tinjauan, juga respons cache lama tanpa field: label AI biasa", () => {
    expect(translationLabel(null)).toMatchObject({ kind: "ai", badge: "Terjemahan AI" });
    expect(translationLabel(undefined)).toMatchObject({ kind: "ai", badge: "Terjemahan AI" });
  });
  test("dikoreksi / diperiksa dengan nama pendek di lencana, nama lengkap + tanggal di rincian", () => {
    expect(translationLabel(base)).toEqual({
      kind: "corrected",
      badge: "Terjemahan AI · dikoreksi Ust. Uji",
      detail:
        "Terjemahan AI ini dikoreksi Ust. Uji Lc. pada 22 Oktober 2026. Kata dalam kurung siku [ … ] adalah tambahan penerjemah.",
    });
    expect(translationLabel({ ...base, revised: false }).badge).toBe(
      "Terjemahan AI · diperiksa Ust. Uji",
    );
  });
  test("tanpa izin nama: peran saja, tidak pernah gelar", () => {
    const label = translationLabel({
      ...base,
      reviewer_role: "editor",
      reviewer_name: null,
      reviewer_short: null,
    });
    expect(label.badge).toBe("Terjemahan AI · dikoreksi editor");
    expect(label.detail).not.toMatch(/Ust/u);
  });
});
