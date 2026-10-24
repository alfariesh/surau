import type { ReactNode } from "react";

import { FOOTNOTE_MARKER_SOURCE } from "@surau/text";

import { reader as readerText } from "../../i18n/id/reader";
import { shortAyahLabel } from "../../lib/reader/ayah";
import { aiRuns } from "../../lib/reader/id-text";
import type { TranslationModel, TranslationSegmentView } from "../../lib/reader/page-model";
import { translationLabel } from "../../lib/translation-label";

import { AiBadge } from "./ai-badge";

const t = readerText;

// Terjemahan AI satu paragraf (S13 dibuat, S14 tampil, X04 ditata ulang). Selalu berlabel
// (teks-arab.md aturan 8): pembaca layar mendengar "Terjemahan AI:" di awal, mata melihat lencana
// "Terjemahan AI" di akhir (title = penjelasan lengkap), dan salinan teks mendapat label + permalink
// (reader-enhancements.tsx). Placeholder ayat ⟦QS s:a⟧ dirender dari terjemahan Kemenag VERBATIM dengan
// labelnya sendiri, bukan sebagai teks model. Kutipan langsung "…" yang berpasangan tampil sebagai
// “…” bergaya kutipan; padanan subjudul ditebalkan (rentang dari daftar kurasi). Penanda catatan
// kaki (١) menaut ke catatan kaki Arab halaman ini. Bagian AI diberi `data-ai-text` (sorotan Cari).
// Mode "terjemahan dilipat" (panel Tampilan) memakai tombol `.translation-toggle`; buka-tutupnya
// ditangani satu pendengar klik di halaman (reader-enhancements.tsx), jadi komponen ini tetap komponen server.
// Bahasa (`lang`) dari datanya, bukan bahasa UI (X11): siap untuk terjemahan bahasa lain.

const MARKER = new RegExp(FOOTNOTE_MARKER_SOURCE, "g");

function withMarkers(text: string, footAnchor: Readonly<Record<string, string>>): ReactNode[] {
  const out: ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(MARKER)) {
    const anchor = footAnchor[m[1] ?? ""];
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

const ADDED = /\[[^\]\n]*\]/gu;

/**
 * Kata tambahan penerjemah `[…]` pada teks perbaikan manusia (X08): tampil redup dengan penjelasan.
 * Kurung siku tulisan AI tidak diberi gaya ini (bisa bermakna lain, mis. "[ayat 26]").
 */
function withAdded(
  text: string,
  revised: boolean,
  footAnchor: Readonly<Record<string, string>>,
): ReactNode[] {
  if (!revised) return withMarkers(text, footAnchor);
  const out: ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(ADDED)) {
    if (m.index > at) out.push(...withMarkers(text.slice(at, m.index), footAnchor));
    out.push(
      <span key={`a${m.index}`} className="tr-added" title={t.trAdded}>
        {withMarkers(m[0], footAnchor)}
      </span>,
    );
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push(...withMarkers(text.slice(at), footAnchor));
  return out;
}

/** Segmen AI: potongan bergaya (kutipan, tebal) dengan penanda catatan kaki tertaut. */
function AiText({
  text,
  offset,
  bold,
  revised,
  footAnchor,
}: {
  text: string;
  offset: number;
  bold: TranslationModel["bold"];
  revised: boolean;
  footAnchor: Readonly<Record<string, string>>;
}) {
  return (
    <span data-ai-text="" data-tr-seg="ai">
      {aiRuns(text, offset, bold).map((run, i) => {
        let node: ReactNode = withAdded(run.text, revised, footAnchor);
        if (run.quote) node = <span className="tr-quote">{node}</span>;
        if (run.bold) node = <strong className="tr-strong">{node}</strong>;
        return <span key={i}>{node}</span>;
      })}
    </span>
  );
}

/** Isi terjemahan (segmen AI + ayat Kemenag) tanpa pembungkus; dipakai juga pratinjau /tinjau. */
export function Segments({
  translation,
  footAnchor,
}: {
  translation: TranslationModel;
  footAnchor: Readonly<Record<string, string>>;
}) {
  let offset = 0;
  return translation.segments.map((s, i) => {
    const at = offset;
    offset += s.kind === "ai" ? s.text.length : s.placeholder.length;
    if (s.kind === "ai") {
      return (
        <AiText
          key={i}
          bold={translation.bold}
          footAnchor={footAnchor}
          offset={at}
          revised={translation.review?.revised === true}
          text={s.text}
        />
      );
    }
    if (s.kind === "invalid") {
      return (
        <span key={i} className="translation-ayah-missing">
          {t.ayahInTranslationMissing(s.label)}
        </span>
      );
    }
    const label = shortAyahLabel(s.ref);
    return (
      <span key={i} className="translation-ayah" data-tr-seg="ayah">
        <span className="translation-ayah-label" data-copy-label="">
          {s.label === "kemenag" ? t.ayahInTranslation(label) : t.ayahInTranslationFull(label)}
        </span>{" "}
        <q>{s.ayat.map((a) => a.text).join(" ")}</q>
      </span>
    );
  });
}

/** Gabungkan terjemahan judul + lanjutannya (judul terpotong, kurasi X04) dengan satu spasi. */
export function joinTranslations(list: readonly TranslationModel[]): TranslationModel | null {
  const [first, ...rest] = list;
  if (first === undefined) return null;
  if (rest.length === 0) return first;
  const segments: TranslationSegmentView[] = [...first.segments];
  for (const tr of rest)
    segments.push({ kind: "ai", label: "ai_translation", text: " " }, ...tr.segments);
  // Label tinjauan hanya bila semua potongan ditinjau sama (judul terpotong = satu judul).
  const same = rest.every(
    (tr) => JSON.stringify(tr.review ?? null) === JSON.stringify(first.review ?? null),
  );
  return { segments, bold: null, review: same ? first.review : null, lang: first.lang };
}

export function PassageTranslation({
  translation,
  footAnchor,
  permalink,
  anchor,
  heading = false,
}: {
  translation: TranslationModel | null;
  /** Digit penanda (١) → jangkar catatan kaki di halaman ini. */
  footAnchor: Readonly<Record<string, string>>;
  /** Permalink paragraf (label salinan). */
  permalink: string;
  /** Jangkar paragraf (`p2824`), untuk id isi terjemahan. */
  anchor: string;
  /**
   * Terjemahan judul (node daftar isi atau subjudul): satu baris di bawah judul Arab, tebal, tanpa
   * garis tepi; lencananya tetap ada.
   */
  heading?: boolean;
}) {
  if (translation === null) return null;
  const allAi = translation.segments.every((s) => s.kind === "ai");
  const label = translationLabel(translation.review ?? null);
  // Label salinan (reader-enhancements.tsx): "(Terjemahan AI · dikoreksi …, permalink)".
  const copyLabel = label.kind === "ai" ? undefined : label.badge;
  if (heading && allAi) {
    return (
      <p
        className="passage-translation passage-translation-heading"
        data-permalink={permalink}
        data-tr-label={copyLabel}
        lang={translation.lang}
      >
        <span className="sr-only" data-copy-skip="">
          {label.badge}:{" "}
        </span>
        <Segments footAnchor={footAnchor} translation={translation} />{" "}
        <AiBadge anchor={anchor} label={label} />
      </p>
    );
  }
  const bodyId = `tr-${anchor}`;
  return (
    <div
      className="passage-translation"
      data-permalink={permalink}
      data-tr-label={copyLabel}
      lang={translation.lang}
    >
      <button
        aria-controls={bodyId}
        aria-expanded="false"
        className="translation-toggle"
        data-copy-skip=""
        type="button"
      >
        {t.aiTranslation}
      </button>
      <p className="passage-translation-body" id={bodyId}>
        <span className="sr-only" data-copy-skip="">
          {label.badge}:{" "}
        </span>
        <Segments footAnchor={footAnchor} translation={translation} />{" "}
        <AiBadge anchor={anchor} label={label} />
      </p>
    </div>
  );
}
