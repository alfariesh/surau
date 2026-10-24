"use client";

import { Alert, CloseButton, Typography } from "@heroui/react";
import { useId } from "react";

import { readMode as text } from "../../i18n/id/readMode";
import { keepReadingPosition } from "../../lib/keep-position";
import { store } from "../../lib/prefs";
import { READ_MODE_HINT_KEY } from "../../lib/reader/scale";
import { useReadMode } from "../read-mode";
import { ReadModeSegment } from "../read-mode-segment";
import { StableText } from "../stable-text";

/**
 * Petunjuk mode baca sekali tampil (X13, ADR-093) di awal teks halaman baca: pengunjung yang belum
 * pernah memilih mode melihat tiga pilihan Arab · Keduanya · Terjemahan beserta penjelasannya.
 * HTML-nya sama untuk semua pembaca (ISR); skrip awal memasang `data-read-mode-hint="off"` sebelum
 * tampil bila mode sudah tersimpan atau petunjuk pernah ditutup, dan CSS menyembunyikannya, jadi
 * tidak berkedip dan tidak menggeser tata letak. Memilih mode di sini tidak menutup petunjuk (teks
 * di bawahnya tidak melompat); di halaman berikutnya petunjuk tidak muncul karena mode tersimpan.
 * Catatan dan lencana terjemahan AI tidak diubah (aturan 8).
 */
export function ReadModeHint({ hasTranslation }: { hasTranslation: boolean }) {
  const mode = useReadMode();
  const labelId = useId();

  function close() {
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
        <ReadModeSegment labelId={labelId} size="md" />
        <StableText
          active={mode}
          variants={{
            ar: hint(text.hints.ar),
            both: hint(hasTranslation ? text.hints.both : text.noTranslation),
            tr: hint(hasTranslation ? text.hints.tr : text.noTranslation),
          }}
        />
      </Alert.Content>
      <CloseButton aria-label={text.hintClose} onPress={close} />
    </Alert>
  );
}
