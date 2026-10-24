// Buka-tutup teks per paragraf di pembaca (X11): tombol "Terjemahan AI" di mode Keduanya + Dilipat
// (X04) dan di paragraf yang dibuka sementara di mode Arab. Statusnya atribut paragraf
// (`data-tr-open`; `data-tr-peek` = dibuka sementara di mode Arab), bukan state React, jadi berlaku
// juga untuk halaman sambungan gulir bersambung. CSS memilih apa yang tampil (globals.css).

/** Buka/tutup terjemahan satu paragraf lewat tombolnya (`.translation-toggle`). */
export function toggleTranslation(button: Element) {
  const open = button.getAttribute("aria-expanded") !== "true";
  button.setAttribute("aria-expanded", String(open));
  button.closest(".passage")?.toggleAttribute("data-tr-open", open);
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

/** Elemen ini tidak dirender (display: none pada dirinya atau leluhurnya). */
export function isHidden(el: Element): boolean {
  return typeof el.checkVisibility === "function" && !el.checkVisibility();
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
  return false;
}
