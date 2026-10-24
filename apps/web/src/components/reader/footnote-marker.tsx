"use client";

import type { NeedsReviewReason } from "@surau/db";

import { HoverCard } from "@heroui-pro/react";
import { Popover, Typography } from "@heroui/react";
import { useState, useSyncExternalStore } from "react";
import { Button as AriaButton } from "react-aria-components";

import { reader as readerText } from "../../i18n/id/reader";
import { UI_LANG } from "../../i18n/locale";
import { ArabicText } from "../arabic";

import { NeedsReviewNote } from "./needs-review";

const t = readerText;

// Penanda catatan kaki `(١)` di badan teks: tombol yang membuka teks takhrij asli di tempat
// (.claude/rules/teks-arab.md, Tampilan). Desktop (pointer halus + hover): HoverCard yang juga
// terbuka saat diklik. Ponsel/sentuh: Popover yang terbuka saat diketuk. Teks penanda dan teks
// catatan kaki keduanya `text_raw` dari DB, dikirim server apa adanya.

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(HOVER_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * `false` saat render server dan hidrasi pertama, lalu nilai sebenarnya (tanpa mismatch). Dipakai
 * juga label rujukan ayat (ayah-ref.tsx).
 */
export function useCanHover(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(HOVER_QUERY).matches,
    () => false,
  );
}

export interface FootnoteMarkerProps {
  /** Potongan `text_raw` penanda, mis. `(٤)`. */
  text: string;
  marker: string;
  footnote: { anchor: string; text: string; needsReview: NeedsReviewReason[] };
  /** ID elemen penanda (tujuan tautan "kembali ke teks" dari daftar catatan kaki). */
  refId?: string;
}

const MARKER_CLASS =
  "footnote-marker text-accent cursor-pointer rounded-md px-0.5 font-[inherit] outline-none hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-focus data-[pressed]:bg-accent-soft";

function FootnoteBody({
  footnote,
  heading,
}: {
  footnote: FootnoteMarkerProps["footnote"];
  heading: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <ArabicText className="text-foreground">{footnote.text}</ArabicText>
      <NeedsReviewNote reasons={footnote.needsReview} />
      <a className="link text-xs" href={`#${footnote.anchor}`}>
        {t.footnoteGoto}
        <span className="sr-only"> ({heading})</span>
      </a>
    </div>
  );
}

export function FootnoteMarker({ text, marker, footnote, refId }: FootnoteMarkerProps) {
  const canHover = useCanHover();
  const [open, setOpen] = useState(false);
  const heading = t.footnoteHeading(marker);

  if (canHover) {
    return (
      <HoverCard closeDelay={250} open={open} openDelay={250} onOpenChange={setOpen}>
        {/* Span pemicu HoverCard sendiri yang menjadi tombol: HoverCard memasang aria-expanded di
            span ini, dan tombol bersarang di dalamnya melanggar aturan ARIA (axe aria-allowed-attr). */}
        <HoverCard.Trigger
          aria-label={heading}
          className={MARKER_CLASS}
          id={refId}
          // Tombol ada di dalam blok `lang="ar"`; label aksesibelnya berbahasa Indonesia.
          lang={UI_LANG}
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
          {text}
        </HoverCard.Trigger>
        <HoverCard.Content
          aria-label={heading}
          className="w-96 max-w-[calc(100vw-2rem)]"
          placement="bottom"
        >
          <Typography type="body-xs" color="muted" weight="medium" className="mb-1">
            {heading}
          </Typography>
          <FootnoteBody footnote={footnote} heading={heading} />
        </HoverCard.Content>
      </HoverCard>
    );
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <AriaButton aria-label={heading} className={MARKER_CLASS} id={refId} lang={UI_LANG}>
        {text}
      </AriaButton>
      <Popover.Content className="w-96 max-w-[calc(100vw-2rem)]" placement="bottom">
        <Popover.Dialog>
          <Popover.Heading className="text-muted mb-1 text-xs font-medium">
            {heading}
          </Popover.Heading>
          <FootnoteBody footnote={footnote} heading={heading} />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
