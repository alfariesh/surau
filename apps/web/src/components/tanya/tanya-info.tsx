"use client";

import { HoverCard } from "@heroui-pro/react";
import { Popover, Typography } from "@heroui/react";
import { useState } from "react";
import { Button as AriaButton } from "react-aria-components";

import { tanyaText as t } from "../../i18n/tanya";
import { HelpCircle } from "../../icons";
import { useCanHover } from "../reader/footnote-marker";

// Tanda "?" di bawah contoh pertanyaan: detail kebijakan jawaban (bukan fatwa, tanyakan ulama setempat,
// tiap pertanyaan dijawab terpisah). Pola sama dengan penanda catatan kaki: HoverCard di perangkat
// ber-hover (juga terbuka saat diklik/Enter), Popover yang dibuka dengan ketukan di layar sentuh.

const TRIGGER_CLASS =
  "text-muted inline-flex size-6 cursor-pointer items-center justify-center rounded-full outline-none hover:bg-default focus-visible:ring-2 focus-visible:ring-focus";

function Detail() {
  return (
    <div className="flex flex-col gap-2 text-start">
      <Typography type="body-sm">{t.noticeBody}</Typography>
      <Typography type="body-sm">{t.separate}</Typography>
    </div>
  );
}

export function TanyaInfo() {
  const canHover = useCanHover();
  const [open, setOpen] = useState(false);
  if (canHover) {
    return (
      <HoverCard closeDelay={200} open={open} openDelay={150} onOpenChange={setOpen}>
        {/* HoverCard.Trigger selalu <span>; dijadikan tombol (pola footnote-marker). */}
        <HoverCard.Trigger
          aria-label={t.noticeMore}
          className={TRIGGER_CLASS}
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
          <HelpCircle className="size-4" />
        </HoverCard.Trigger>
        <HoverCard.Content
          aria-label={t.noticeMore}
          className="w-80 max-w-[calc(100vw-2rem)]"
          placement="top"
        >
          <Detail />
        </HoverCard.Content>
      </HoverCard>
    );
  }
  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <AriaButton aria-label={t.noticeMore} className={TRIGGER_CLASS}>
        <HelpCircle className="size-4" />
      </AriaButton>
      <Popover.Content className="w-80 max-w-[calc(100vw-2rem)]" placement="top">
        <Popover.Dialog aria-label={t.noticeMore}>
          <Detail />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
