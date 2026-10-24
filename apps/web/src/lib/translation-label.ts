// Label terjemahan bersama (X08 tahap 2, ADR-082) untuk pembaca, kartu /cari, dan kartu kutipan
// Maknaz: satu fungsi supaya ketiganya selalu sama. Asal AI tetap disebut ("Terjemahan AI · …")
// karena drafnya dari AI. Nama hanya dari daftar editor terdaftar yang dibawa korpus; tanpa izin
// nama, yang tampil peran ("ustadz"/"editor"). Tanpa tinjauan manusia = label AI biasa.
import type { HumanReview } from "@surau/core";

import { reader as t } from "../i18n/id/reader";

export interface TranslationLabel {
  kind: "ai" | "checked" | "corrected";
  /** Teks lencana, mis. "Terjemahan AI · dikoreksi Ust. Anas". */
  badge: string;
  /** Penjelasan (title, rincian saat lencana diketuk): nama lengkap + tanggal. */
  detail: string;
}

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

/**
 * `undefined` = data lama tanpa field `human_review` (respons cache sebelum X08, kartu kutipan
 * 5 menit): diperlakukan sebagai terjemahan AI biasa, tidak pernah melempar.
 */
export function translationLabel(review: HumanReview | null | undefined): TranslationLabel {
  if (review === null || review === undefined)
    return { kind: "ai", badge: t.aiTranslation, detail: t.aiTranslationHint };
  const role = t.trReviewer[review.reviewer_role];
  const short = review.reviewer_short ?? role;
  const full = review.reviewer_name ?? role;
  return review.revised
    ? {
        kind: "corrected",
        badge: t.trCorrected(short),
        detail: t.trCorrectedDetail(full, date(review.reviewed_at)),
      }
    : {
        kind: "checked",
        badge: t.trChecked(short),
        detail: t.trCheckedDetail(full, date(review.reviewed_at)),
      };
}
