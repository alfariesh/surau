import { ayahPlaceholderPattern, maskAyat, translationSegments } from "@surau/core";
import type { AyahRef, FootnoteRef, QuranView } from "@surau/core";

import { shortAyahLabel } from "../../lib/reader/ayah";
import type { TranslationSegmentView } from "../../lib/reader/page-model";
import { Segments } from "../reader/passage-translation";

// Pratinjau terjemahan di /tinjau/terjemahan (X08): segmen sama persis dengan pembaca (placeholder
// ayat → terjemahan Kemenag verbatim dari DB, kutipan "…" bergaya, penanda catatan kaki). Tidak
// memakai kelas `.passage-translation` pembaca, supaya pilihan "sembunyikan terjemahan" atau
// "dilipat" milik pembaca tidak ikut menyembunyikan pratinjau.

export function previewSegments(
  text: string,
  passage: { arabic: string; ayah_refs: readonly AyahRef[]; footnote_refs: readonly FootnoteRef[] },
  quran: QuranView | null,
): TranslationSegmentView[] {
  const { slots } = maskAyat(passage.arabic, passage.ayah_refs, passage.footnote_refs);
  return translationSegments(text, slots, quran).map((seg): TranslationSegmentView => {
    if (seg.kind !== "invalid") return seg;
    const m = ayahPlaceholderPattern("").exec(seg.placeholder);
    const label =
      m === null
        ? seg.placeholder
        : shortAyahLabel({
            surah: Number(m[1]),
            ayah_from: Number(m[2]),
            ayah_to: Number(m[3] ?? m[2]),
          });
    return { ...seg, label };
  });
}

export function TranslationPreview({
  text,
  passage,
  quran,
  lang = "id",
}: {
  text: string;
  passage: { arabic: string; ayah_refs: readonly AyahRef[]; footnote_refs: readonly FootnoteRef[] };
  quran: QuranView | null;
  /** Bahasa teks revisi; tabel `translation_revision` saat ini hanya menerima "id" (ADR-081, ADR-092). */
  lang?: string;
}) {
  return (
    <div className="translation-preview" lang={lang}>
      <Segments
        footAnchor={{}}
        translation={{ segments: previewSegments(text, passage, quran), bold: null, lang }}
      />
    </div>
  );
}
