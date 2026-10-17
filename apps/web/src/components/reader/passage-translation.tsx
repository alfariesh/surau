import type { Passage, QuranView } from "@surau/core";
import type { ReactNode } from "react";

import { ayahPlaceholderPattern, maskAyat, translationSegments } from "@surau/core";
import { FOOTNOTE_MARKER_SOURCE } from "@surau/text";

import { id } from "../../i18n/id";
import { shortAyahLabel } from "../../lib/reader/ayah";

const t = id.reader;

// Terjemahan AI satu paragraf (S13 dibuat, S14 tampil). Selalu berlabel "Terjemahan AI"
// (teks-arab.md aturan 8). Placeholder ayat ⟦QS s:a⟧ dirender dari terjemahan Kemenag VERBATIM
// (`translationSegments`, PageView.quran) dengan labelnya sendiri, bukan sebagai teks model; bila
// terjemahan ayatnya tidak ada, hanya rujukannya yang tampil. Penanda catatan kaki (١) di
// terjemahan menaut ke catatan kaki Arab halaman ini. Bagian AI diberi `data-ai-text` (sorotan
// kata yang dicari di klien).

const MARKER = new RegExp(FOOTNOTE_MARKER_SOURCE, "g");

function withMarkers(text: string, footAnchor: ReadonlyMap<string, string>): ReactNode[] {
  const out: ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(MARKER)) {
    const anchor = footAnchor.get(m[1] ?? "");
    if (anchor === undefined) continue;
    if (m.index > at) out.push(text.slice(at, m.index));
    out.push(
      <a key={m.index} className="link translation-marker" href={`#${anchor}`}>
        {m[0]}
      </a>,
    );
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

export function PassageTranslation({
  passage,
  quran,
  footAnchor,
}: {
  passage: Passage;
  quran: QuranView | null;
  /** Digit penanda (١) → jangkar catatan kaki di halaman ini. */
  footAnchor: ReadonlyMap<string, string>;
}) {
  const tr = passage.translation;
  if (tr === null || tr === undefined || tr.review_status === "rejected") return null;
  const { slots } = maskAyat(passage.text_raw, passage.ayah_refs, passage.footnote_refs);
  const segments = translationSegments(tr.text, slots, quran);
  return (
    <div className="passage-translation" lang="id">
      <p className="text-muted mb-1 text-xs font-medium" title={t.aiTranslationHint}>
        {t.aiTranslation}
        <span className="sr-only">: {t.aiTranslationHint}</span>
      </p>
      <p className="text-foreground text-[0.95rem] leading-relaxed">
        {segments.map((s, i) => {
          if (s.kind === "ai") {
            return (
              <span key={i} data-ai-text="">
                {withMarkers(s.text, footAnchor)}
              </span>
            );
          }
          if (s.kind === "invalid") {
            const m = ayahPlaceholderPattern("").exec(s.placeholder);
            const label =
              m === null
                ? s.placeholder
                : shortAyahLabel({
                    surah: Number(m[1]),
                    ayah_from: Number(m[2]),
                    ayah_to: Number(m[3] ?? m[2]),
                  });
            return (
              <span key={i} className="translation-ayah-missing">
                {t.ayahInTranslationMissing(label)}
              </span>
            );
          }
          const label = shortAyahLabel(s.ref);
          return (
            <span key={i} className="translation-ayah">
              <span className="translation-ayah-label">
                {s.label === "kemenag"
                  ? t.ayahInTranslation(label)
                  : t.ayahInTranslationFull(label)}
              </span>{" "}
              <q>{s.ayat.map((a) => a.text).join(" ")}</q>
            </span>
          );
        })}
      </p>
    </div>
  );
}
