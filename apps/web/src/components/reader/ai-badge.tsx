import type { TranslationLabel } from "../../lib/translation-label";

/**
 * Lencana label terjemahan AI di pembaca (X11: satu komponen untuk paragraf, judul, dan kepala
 * halaman). Terlihat, tidak ikut tersalin; di paragraf pembaca layar memakai awalan sr-only, jadi
 * lencananya `aria-hidden`. `announce` = lencana ikut dibaca (tanpa awalan di dekatnya, mis. judul
 * Indonesia di kepala halaman). Terjemahan yang ditinjau manusia (X08): lencana berupa tombol yang
 * membuka rincian nama lengkap + tanggal (popover HTML bawaan, tanpa JavaScript), karena `title`
 * tidak terbaca di layar sentuh; butuh `anchor` untuk id rinciannya.
 */
export function AiBadge({
  label,
  anchor,
  announce = false,
}: {
  label: TranslationLabel;
  /** Jangkar paragraf (`p2824`), untuk id rincian tinjauan. */
  anchor?: string;
  announce?: boolean;
}) {
  if (label.kind === "ai" || anchor === undefined) {
    return (
      <span aria-hidden={announce ? undefined : "true"} className="ai-badge" title={label.detail}>
        {label.badge}
      </span>
    );
  }
  const id = `tr-review-${anchor}`;
  return (
    <>
      {/* Nama aksesibel = teks lencana yang terlihat (WCAG 2.5.3 "label dalam nama", X10: perintah
          suara menyebut teks yang tampil), rinciannya sebagai deskripsi (`aria-describedby` tetap
          terbaca walau popover tertutup); tanpa `title` ganda dengan popover. */}
      <button
        aria-describedby={id}
        className="ai-badge ai-badge-review"
        data-copy-skip=""
        popoverTarget={id}
        type="button"
      >
        {label.badge}
      </button>
      <span className="tr-review-popover" data-copy-skip="" id={id} popover="auto" role="note">
        {label.detail}
      </span>
    </>
  );
}
