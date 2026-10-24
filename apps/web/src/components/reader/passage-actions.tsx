"use client";

import type { PassageRef } from "./reader-context";

import { MoreVertical } from "../../icons";
import { Button, Dropdown, Label } from "@heroui/react";

import { reader as readerText } from "../../i18n/id/reader";
import { UI_LANG } from "../../i18n/locale";

import { useReadMode } from "../read-mode";

import { useReader } from "./reader-context";

const t = readerText;

/**
 * Menu kecil per paragraf: salin sitasi paragraf (permalink `#pN`), bagikan tautannya (lembar bagi
 * ponsel, atau salin URL di desktop; X04 W5), dan laporkan kesalahan.
 */
export function PassageActions({ passage }: { passage: PassageRef }) {
  const reader = useReader();

  return (
    <Dropdown>
      <Button
        isIconOnly
        aria-label={`${t.passageActions} ${passage.label}`}
        // Sebaris di akhir teks Arab; label aksesibel berbahasa Indonesia.
        className="passage-actions ms-1 size-7 min-w-0 align-middle"
        lang={UI_LANG}
        size="sm"
        variant="ghost"
      >
        <MoreVertical className="size-4" />
      </Button>
      <Dropdown.Popover placement="bottom start">
        <Dropdown.Menu
          onAction={(key) => {
            if (key === "copy") void reader.copyCitation(passage.permalink);
            if (key === "share") void reader.shareLink(passage.permalink);
            if (key === "report") reader.openReport(passage);
          }}
        >
          <Dropdown.Item id="copy" textValue={t.copyPassage}>
            <Label>{t.copyPassage}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="share" textValue={t.sharePassage}>
            <Label>{t.sharePassage}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="report" textValue={t.reportPassage}>
            <Label>{t.reportPassage}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/**
 * ⋮ kedua di baris alat paragraf, hanya di mode Terjemahan (X11 bagian B): ⋮ biasa ada di dalam teks
 * Arab yang terlipat. Mode baru diketahui sesudah hidrasi, jadi di server dan mode lain tidak
 * merender apa pun: HTML dan hidrasi pembaca lain tidak bertambah.
 */
export function TrPassageActions({ passage }: { passage: PassageRef }) {
  const mode = useReadMode();
  return mode === "tr" ? <PassageActions passage={passage} /> : null;
}
