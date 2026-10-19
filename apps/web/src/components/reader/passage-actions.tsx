"use client";

import type { PassageRef } from "./reader-context";

import { MoreVertical } from "../../icons";
import { Button, Dropdown, Label } from "@heroui/react";

import { id } from "../../i18n/id";

import { useReader } from "./reader-context";

const t = id.reader;

/** Menu kecil per paragraf: salin sitasi paragraf (permalink `#pN`) dan laporkan kesalahan. */
export function PassageActions({ passage }: { passage: PassageRef }) {
  const reader = useReader();

  return (
    <Dropdown>
      <Button
        isIconOnly
        aria-label={`${t.passageActions} ${passage.label}`}
        // Sebaris di akhir teks Arab; label aksesibel berbahasa Indonesia.
        className="passage-actions ms-1 size-7 min-w-0 align-middle"
        lang="id"
        size="sm"
        variant="ghost"
      >
        <MoreVertical className="size-4" />
      </Button>
      <Dropdown.Popover placement="bottom start">
        <Dropdown.Menu
          onAction={(key) => {
            if (key === "copy") void reader.copyCitation(passage.permalink);
            if (key === "report") reader.openReport(passage);
          }}
        >
          <Dropdown.Item id="copy" textValue={t.copyPassage}>
            <Label>{t.copyPassage}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="report" textValue={t.reportPassage}>
            <Label>{t.reportPassage}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
