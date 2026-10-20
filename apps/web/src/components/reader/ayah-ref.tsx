"use client";

import type { AyahRef, QuranAyahView, QuranSourceView } from "@surau/core";

import { HoverCard } from "@heroui-pro/react";
import { Popover, Typography } from "@heroui/react";
import { useState } from "react";
import { Button as AriaButton } from "react-aria-components";

import { id } from "../../i18n/id";
import { ArabicText } from "../arabic";

import { shortAyahLabel } from "../../lib/reader/ayah";

import { useCanHover } from "./footnote-marker";

const t = id.reader;

// Label rujukan ayat "QS 2:255" sesudah kutipan ayat di teks kitab (S12). Membuka teks ayat Tanzil,
// transliterasi, dan terjemahan Kemenag, semuanya VERBATIM dari DB (props dari server, tidak
// pernah ditulis model), beserta atribusi dan tautan ke tanzil.net. Kutipan sebagian ayat diberi
// label "terjemahan ayat lengkap (Kemenag)": terjemahan yang tampil adalah ayat utuh, bukan
// terjemahan potongan yang dikutip. Desktop: HoverCard; ponsel/sentuh: Popover (sama dengan
// penanda catatan kaki).

export interface AyahRefChipProps {
  ayahRef: AyahRef;
  /** Ayat utuh ayah_from..ayah_to (urut). */
  ayat: QuranAyahView[];
  /** Nama surah Arab (dari DB). */
  surahNameAr: string | null;
  sources: QuranSourceView[];
}

// Tipografi label (huruf Latin kecil, sebaris di teks Arab) ada di globals.css (.ayah-chip).
const CHIP_CLASS =
  "ayah-chip cursor-pointer rounded-full border border-accent/30 bg-accent-soft font-medium text-accent outline-none hover:border-accent focus-visible:ring-2 focus-visible:ring-focus data-[pressed]:border-accent";

/**
 * Teks label lewat CSS `content: attr(data-label)` (globals.css): tampil, tetapi tidak ikut
 * tersalin bersama teks Arab dan tidak masuk innerText. Pembaca layar memakai aria-label tombol.
 */
function ChipLabel({ text }: { text: string }) {
  return <span aria-hidden="true" className="ayah-chip-label" data-label={text} dir="ltr" />;
}

function sourceLink(source: QuranSourceView | undefined, label: string) {
  if (source === undefined) return <span>{label}</span>;
  return (
    <a
      className="link text-[length:inherit]"
      href={source.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {label}
      <span className="sr-only"> {id.common.newTab}</span>
    </a>
  );
}

function AyahBody({ ayahRef, ayat, surahNameAr, sources }: AyahRefChipProps) {
  const text = sources.find((s) => s.kind === "text");
  const translation = sources.find((s) => s.kind === "translation");
  const transliteration = sources.find((s) => s.kind === "transliteration");
  const notes = [
    ayahRef.partial ? t.ayahPartial : null,
    ayahRef.match === "similar" ? t.ayahSimilar : null,
    ayahRef.alt_count > 0 ? t.ayahAlt(ayahRef.alt_count) : null,
  ].filter((n) => n !== null);
  return (
    <div className="flex flex-col gap-3 text-sm">
      {surahNameAr ? <ArabicText className="text-muted text-base">{surahNameAr}</ArabicText> : null}
      {notes.length > 0 ? (
        <ul className="text-muted flex list-none flex-col gap-0.5 p-0 text-xs">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
      <Typography type="body-xs" color="muted" weight="medium">
        {ayahRef.partial ? t.ayahTranslationFull : t.ayahTranslation}
      </Typography>
      <ol className="flex list-none flex-col gap-3 p-0">
        {ayat.map((a) => (
          <li key={`${a.surah}:${a.ayah}`} className="flex flex-col gap-1">
            <ArabicText className="text-foreground text-lg">{a.text}</ArabicText>
            {a.transliteration ? (
              <Typography
                type="body-xs"
                color="muted"
                className="italic"
                lang="ar-Latn"
                translate="no"
              >
                {a.transliteration}
              </Typography>
            ) : null}
            {a.translation ? (
              <Typography>
                <span className="text-muted mr-1 tabular-nums">{a.ayah}.</span>
                {a.translation.text}
              </Typography>
            ) : (
              <Typography type="body-xs" color="muted">
                {t.ayahNoTranslation}
              </Typography>
            )}
            {a.translation && a.translation.footnotes.length > 0 ? (
              <ul className="text-muted flex list-none flex-col gap-1 border-l border-separator p-0 pl-2 text-xs">
                {a.translation.footnotes.map((f, i) => (
                  <li key={i}>
                    {f.marker ? <span className="mr-1">{f.marker}</span> : null}
                    {f.text}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
      <div className="text-muted flex flex-col gap-1 border-t border-separator pt-2 text-xs">
        <Typography type="body-xs" color="muted">
          {text ? (
            <>
              {t.ayahTextSource}: {sourceLink(text, text.name)} ({text.license}) ·{" "}
            </>
          ) : null}
          {transliteration && transliteration.url === translation?.url
            ? t.ayahTranslationAndTransliterationSource
            : t.ayahTranslationSource}
          : {sourceLink(translation, t.ayahKemenag)}
          {transliteration && transliteration.url !== translation?.url ? (
            <>
              {" · "}
              {t.ayahTransliterationSource}: {sourceLink(transliteration, t.ayahKemenag)}
            </>
          ) : null}
        </Typography>
        <Typography type="body-xs" color="muted">
          {t.ayahAuto}
        </Typography>
        <a
          className="link self-start text-[length:inherit]"
          href={`https://tanzil.net/#${ayahRef.surah}:${ayahRef.ayah_from}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t.ayahOpenTanzil}
          <span className="sr-only"> {id.common.newTab}</span>
        </a>
      </div>
    </div>
  );
}

export function AyahRefChip(props: AyahRefChipProps) {
  const canHover = useCanHover();
  const [open, setOpen] = useState(false);
  const { ayahRef } = props;
  const short = shortAyahLabel(ayahRef);
  const aria = t.ayahChipLabel(short, ayahRef.label);

  if (canHover) {
    return (
      <HoverCard closeDelay={250} open={open} openDelay={250} onOpenChange={setOpen}>
        {/* Span pemicu sendiri yang menjadi tombol (lihat FootnoteMarker: aturan ARIA). */}
        <HoverCard.Trigger
          aria-label={aria}
          className={CHIP_CLASS}
          // Tombol ada di dalam blok `lang="ar"`; label aksesibelnya berbahasa Indonesia.
          lang="id"
          // HoverCard.Trigger selalu merender <span>; elemennya tidak bisa diganti <button>.
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <ChipLabel text={short} />
        </HoverCard.Trigger>
        <HoverCard.Content
          aria-label={ayahRef.label}
          className="max-h-[70vh] w-[26rem] max-w-[calc(100vw-2rem)] overflow-y-auto"
          placement="bottom"
        >
          <Typography type="body-sm" weight="semibold" className="mb-2">
            {ayahRef.label}
          </Typography>
          <AyahBody {...props} />
        </HoverCard.Content>
      </HoverCard>
    );
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <AriaButton aria-label={aria} className={CHIP_CLASS} lang="id">
        <ChipLabel text={short} />
      </AriaButton>
      <Popover.Content
        className="max-h-[70vh] w-[26rem] max-w-[calc(100vw-2rem)] overflow-y-auto"
        placement="bottom"
      >
        <Popover.Dialog>
          <Popover.Heading className="text-foreground mb-2 text-sm font-semibold">
            {ayahRef.label}
          </Popover.Heading>
          <AyahBody {...props} />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
