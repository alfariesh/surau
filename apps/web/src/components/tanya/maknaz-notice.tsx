import { Typography } from "@heroui/react";
import NextLink from "next/link";

import { tanyaText as t } from "../../i18n/tanya";

/**
 * Catatan tetap Maknaz (S21, docs/05 §2): "bukan pemberi fatwa", jawaban terpisah, data pribadi, dan
 * tautan privasi. Satu catatan yang terlihat pada satu waktu: /tanya di atas sebelum percakapan dan
 * di bawah kotak sesudahnya; Beranda di bawah contoh saat mode Maknaz.
 */
export function MaknazNotice({ className = "" }: { className?: string }) {
  return (
    <Typography className={`text-center text-balance ${className}`} color="muted" type="body-xs">
      {t.notice} {t.noticeExtra}{" "}
      <NextLink className="underline" href="/privasi">
        {t.privacyLink}
      </NextLink>
    </Typography>
  );
}
