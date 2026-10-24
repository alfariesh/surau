// Buka-tutup teks per paragraf di pembaca (X11): tombol "Terjemahan AI" di mode Keduanya + Dilipat
// (X04) dan di paragraf yang dibuka sementara di mode Arab; tombol "Teks Arab" di mode Terjemahan.
// Statusnya atribut paragraf (`data-tr-open`; `data-tr-peek` = dibuka sementara di mode Arab;
// `data-ar-open` = teks Arab dibuka di mode Terjemahan), bukan state React, jadi berlaku juga untuk
// halaman sambungan gulir bersambung. CSS memilih apa yang tampil (globals.css).

/** Buka/tutup terjemahan satu paragraf lewat tombolnya (`.translation-toggle`). */
export function toggleTranslation(button: Element) {
  const open = button.getAttribute("aria-expanded") !== "true";
  button.setAttribute("aria-expanded", String(open));
  button.closest(".passage")?.toggleAttribute("data-tr-open", open);
}

/** Buka/tutup teks Arab satu paragraf di mode Terjemahan lewat tombolnya (`.arabic-toggle`, bagian B). */
export function toggleArabic(button: Element) {
  const open = button.getAttribute("aria-expanded") !== "true";
  button.setAttribute("aria-expanded", String(open));
  button.closest(".passage")?.toggleAttribute("data-ar-open", open);
}

/** Tampilkan teks Arab satu paragraf yang terlipat di mode Terjemahan (kata cari, tautan balik). */
export function revealArabic(passage: Element) {
  passage.setAttribute("data-ar-open", "");
  passage.querySelector(".arabic-toggle")?.setAttribute("aria-expanded", "true");
}

/**
 * Tampilkan terjemahan satu paragraf yang tersembunyi oleh mode baca atau tata letak: di mode Arab
 * dibuka sementara (tombolnya ikut tampil untuk menutup lagi), di mode Dilipat dibuka. Di tata letak
 * lain atribut ini tidak berpengaruh.
 */
export function revealTranslation(passage: Element) {
  passage.setAttribute("data-tr-peek", "");
  passage.setAttribute("data-tr-open", "");
  passage.querySelector(".translation-toggle")?.setAttribute("aria-expanded", "true");
}

/**
 * Elemen ini tidak dirender (display: none pada dirinya atau leluhurnya). Browser tanpa
 * `checkVisibility` (Safari < 17.4): elemen tanpa kotak dianggap tersembunyi.
 */
export function isHidden(el: Element): boolean {
  return typeof el.checkVisibility === "function"
    ? !el.checkVisibility()
    : el.getClientRects().length === 0;
}

/**
 * Buka teks tersembunyi yang memuat `el` (target tautan atau kata cari) di paragrafnya. `true` bila
 * ada yang dibuka.
 */
export function revealFor(el: Element): boolean {
  if (!isHidden(el)) return false;
  const passage = el.closest(".passage");
  if (passage === null) return false;
  if (el.closest(".passage-translation") !== null) {
    revealTranslation(passage);
    return true;
  }
  // Teks Arab terlipat di mode Terjemahan: blok `passage-ar` atau isinya (mis. penanda catatan kaki
  // tujuan tautan "kembali ke teks").
  if (el.closest(".passage-ar") !== null || el.querySelector(".passage-ar") !== null) {
    revealArabic(passage);
    return true;
  }
  return false;
}
