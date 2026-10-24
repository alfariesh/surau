"use client";

import { Segment } from "@heroui-pro/react";

import { readMode as text } from "../i18n/id/readMode";
import type { ReadMode } from "../lib/reader/scale";

import { READ_MODES } from "../lib/reader/scale";

import { setReadMode, useReadMode } from "./read-mode";

/**
 * Pilihan mode baca (X11) untuk panel Tampilan pembaca dan menu ⋮ navbar. Segment = grup tombol
 * pilihan tunggal (React Aria ToggleButtonGroup), jadi pembaca layar mendengarnya sebagai grup
 * radio; label dari elemen `labelId` yang terlihat.
 */
export function ReadModeSegment({
  labelId,
  size = "sm",
  onPick,
}: {
  labelId: string;
  size?: "sm" | "md";
  /** Dipanggil setiap pilihan ditekan, juga pilihan yang sudah aktif (petunjuk mode baca, X13). */
  onPick?: (mode: ReadMode) => void;
}) {
  const mode = useReadMode();
  return (
    <Segment
      aria-labelledby={labelId}
      className="w-full"
      selectedKey={mode}
      size={size}
      onSelectionChange={(key) => {
        const next = READ_MODES.find((m) => m === key);
        if (next !== undefined && next !== mode) setReadMode(next);
      }}
    >
      {READ_MODES.map((m) => (
        <Segment.Item key={m} className="flex-1" id={m} onPress={() => onPick?.(m)}>
          {text.options[m]}
        </Segment.Item>
      ))}
    </Segment>
  );
}
