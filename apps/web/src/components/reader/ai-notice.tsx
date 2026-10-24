"use client";

import { Alert, CloseButton } from "@heroui/react";
import NextLink from "next/link";

import { reader as readerText } from "../../i18n/id/reader";
import { readMode as readModeText } from "../../i18n/id/readMode";
import { AI_NOTICE_KEY } from "../../lib/reader/scale";

const t = readerText;
const rm = readModeText;

/**
 * Catatan terjemahan AI di awal teks halaman (X04 W3): satu kalimat yang menjelaskan semua lencana
 * "Terjemahan AI" di halaman ini. Bisa ditutup; pilihan itu disimpan per browser dan dipasang skrip
 * awal (`data-ai-notice="off"`, CSS menyembunyikannya) sebelum halaman tampil, jadi tidak berkedip.
 * Lencana per paragraf tetap tampil walaupun catatan ini sudah ditutup (aturan 8). Hanya bila ada
 * terjemahan AI yang belum ditinjau manusia; `mixed` = sebagian sudah dikoreksi/diperiksa (X10).
 */
export function AiNotice({ mixed = false }: { mixed?: boolean }) {
  function close() {
    document.documentElement.setAttribute("data-ai-notice", "off");
    try {
      window.localStorage.setItem(AI_NOTICE_KEY, "off");
    } catch {
      // Penyimpanan diblokir: catatan muncul lagi di halaman berikutnya.
    }
  }

  return (
    // Bantuan terjemahan (X11): disembunyikan di mode baca Arab, seperti terjemahannya.
    <Alert className="ai-notice" data-tr-aid="">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t.aiNoticeTitle}</Alert.Title>
        <Alert.Description>
          {mixed ? t.aiNoticeBodyMixed : t.aiNoticeBody}{" "}
          {/* Hanya di mode Terjemahan (CSS): teks Arab tetap ada di setiap paragraf (X11). */}
          <span className="ai-notice-tr">{rm.aiNoticeTr} </span>
          <NextLink className="link" href="/tentang#prinsip">
            {t.aiNoticeMore}
          </NextLink>
        </Alert.Description>
      </Alert.Content>
      <CloseButton aria-label={t.aiNoticeClose} onPress={close} />
    </Alert>
  );
}
