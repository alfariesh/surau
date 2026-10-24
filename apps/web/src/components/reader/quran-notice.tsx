import type { QuranView } from "@surau/core";

import { Typography } from "@heroui/react";

import { common as commonText } from "../../i18n/id/common";
import { reader as readerText } from "../../i18n/id/reader";

const t = readerText;

// Atribusi ayat Al-Qur'an di footer halaman baca (S12), hanya bila halaman mengutip ayat: Tanzil
// (CC BY 3.0, wajib menyebut sumber dan menautkan tanzil.net) dan Kemenag. Nama, versi, lisensi,
// dan tautan diambil dari tabel `quran_source` (DB), bukan ditulis di sini.
export function QuranNotice({ quran }: { quran: QuranView }) {
  const text = quran.sources.find((s) => s.kind === "text");
  const translation = quran.sources.find((s) => s.kind === "translation");
  const link = (href: string, label: string) => (
    <a className="link text-[length:inherit]" href={href} rel="noopener noreferrer" target="_blank">
      {label}
      <span className="sr-only"> {commonText.newTab}</span>
    </a>
  );
  return (
    <Typography type="body-xs" color="muted">
      {t.quranNotice}:
      {text ? (
        <>
          {" "}
          {t.quranNoticeText} {link(text.url, `${text.name} ${text.version}`)} ({text.license})
        </>
      ) : null}
      {translation ? (
        <>
          {text ? ";" : ""} {t.quranNoticeTranslation} {link(translation.url, translation.name)} (
          {translation.version})
        </>
      ) : null}
      . {t.quranNoticeVerbatim}
    </Typography>
  );
}
