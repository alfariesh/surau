"use client";

import { Alert, CloseButton } from "@heroui/react";
import NextLink from "next/link";

import { reader as readerText } from "../../i18n/id/reader";
import { AI_NOTICE_KEY } from "../../lib/reader/scale";

const t = readerText;

/**
 * Catatan terjemahan AI di awal teks halaman (X04 W3): satu kalimat yang menjelaskan semua lencana
 * "Terjemahan AI" di halaman ini. Bisa ditutup; pilihan itu disimpan per browser dan dipasang skrip
 * awal (`data-ai-notice="off"`, CSS menyembunyikannya) sebelum halaman tampil, jadi tidak berkedip.
 * Lencana per paragraf tetap tampil walaupun catatan ini sudah ditutup (aturan 8).
 */
export function AiNotice() {
  function close() {
    document.documentElement.setAttribute("data-ai-notice", "off");
    try {
      window.localStorage.setItem(AI_NOTICE_KEY, "off");
    } catch {
      // Penyimpanan diblokir: catatan muncul lagi di halaman berikutnya.
    }
  }

  return (
    <Alert className="ai-notice" lang="id">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t.aiNoticeTitle}</Alert.Title>
        <Alert.Description>
          {t.aiNoticeBody}{" "}
          <NextLink className="link" href="/tentang#prinsip">
            {t.aiNoticeMore}
          </NextLink>
        </Alert.Description>
      </Alert.Content>
      <CloseButton aria-label={t.aiNoticeClose} onPress={close} />
    </Alert>
  );
}
