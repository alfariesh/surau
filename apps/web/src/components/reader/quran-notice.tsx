import type { QuranView } from "@surau/core";

import { id } from "../../i18n/id";

const t = id.reader;

// Atribusi ayat Al-Qur'an di footer halaman baca (S12), hanya bila halaman mengutip ayat: Tanzil
// (CC BY 3.0, wajib menyebut sumber dan menautkan tanzil.net) dan Kemenag. Nama, versi, lisensi,
// dan tautan diambil dari tabel `quran_source` (DB), bukan ditulis di sini.
export function QuranNotice({ quran }: { quran: QuranView }) {
  const text = quran.sources.find((s) => s.kind === "text");
  const translation = quran.sources.find((s) => s.kind === "translation");
  const link = (href: string, label: string) => (
    <a className="link text-[length:inherit]" href={href} rel="noopener noreferrer" target="_blank">
      {label}
      <span className="sr-only"> {id.common.newTab}</span>
    </a>
  );
  return (
    <p>
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
    </p>
  );
}
