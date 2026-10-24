"use client";

import { Alert, CloseButton, Typography } from "@heroui/react";
import { useId, useLayoutEffect } from "react";

import { readMode as text } from "../../i18n/id/readMode";
import { keepReadingPosition } from "../../lib/keep-position";
import { store, stored } from "../../lib/prefs";
import { READ_MODE_HINT_KEY, READ_MODE_KEY } from "../../lib/reader/scale";
import { useReadMode } from "../read-mode";
import { ReadModeSegment } from "../read-mode-segment";
import { StableText } from "../stable-text";

/**
 * Petunjuk mode baca sekali tampil (X14, ADR-095) di awal teks halaman baca: pengunjung yang belum
 * pernah memilih mode melihat tiga pilihan Arab · Keduanya · Terjemahan beserta penjelasannya.
 * HTML-nya sama untuk semua pembaca (ISR); skrip awal memasang `data-read-mode-hint="off"` sebelum
 * tampil bila mode sudah tersimpan atau petunjuk pernah ditutup, dan CSS menyembunyikannya, jadi
 * tidak berkedip dan tidak menggeser tata letak. Skrip awal tidak jalan lagi saat navigasi lunak Next
 * (`<html>` tetap), jadi pemeriksaan yang sama diulang saat petunjuk dipasang di halaman baru,
 * sebelum digambar. Memilih mode di sini tidak menutup petunjuk (teks di bawahnya tidak melompat);
 * di halaman berikutnya petunjuk tidak muncul karena mode tersimpan, termasuk Keduanya (bawaan).
 * Catatan dan lencana terjemahan AI tidak diubah (aturan 8).
 */
export function ReadModeHint({ hasTranslation }: { hasTranslation: boolean }) {
  const mode = useReadMode();
  const labelId = useId();

  useLayoutEffect(() => {
    if (stored(READ_MODE_KEY) !== null || stored(READ_MODE_HINT_KEY) === "off") {
      document.documentElement.setAttribute("data-read-mode-hint", "off");
    }
  }, []);

  function close(target: HTMLElement | null) {
    // Tombol tutup ikut tersembunyi: fokus pindah ke wilayah teks, tidak jatuh ke <body>.
    if (target !== null) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
    keepReadingPosition(() => document.documentElement.setAttribute("data-read-mode-hint", "off"));
    store(READ_MODE_HINT_KEY, "off");
  }

  const hint = (value: string) => (
    <Typography color="muted" type="body-xs">
      {value}
    </Typography>
  );

  return (
    <Alert className="read-mode-hint">
      <Alert.Content className="gap-2">
        <div className="flex flex-col gap-0.5">
          <Alert.Title id={labelId}>{text.hintTitle}</Alert.Title>
          <Alert.Description>{text.hintBody}</Alert.Description>
        </div>
        <ReadModeSegment
          labelId={labelId}
          size="md"
          // Keduanya (bawaan) yang sudah aktif tidak memicu perubahan mode, tetapi tetap pilihan.
          onPick={(m) => store(READ_MODE_KEY, m)}
        />
        <StableText
          active={mode}
          variants={{
            ar: hint(text.hints.ar),
            both: hint(hasTranslation ? text.hints.both : text.noTranslation),
            tr: hint(hasTranslation ? text.hints.tr : text.noTranslation),
          }}
        />
      </Alert.Content>
      <CloseButton
        aria-label={text.hintClose}
        onPress={(e) => close(e.target.closest<HTMLElement>(".reader-text"))}
      />
    </Alert>
  );
}
