// Jaga posisi baca saat tampilan berubah (X11): mengganti mode baca, ukuran huruf, atau tata letak
// mengubah tinggi teks di atas layar, sehingga paragraf yang sedang dibaca bisa terlempar jauh.
// Jangkar = elemen bacaan pertama yang masih terlihat di bawah navbar; posisinya diukur sebelum dan
// sesudah perubahan, lalu selisihnya digulir di wadah gulir yang sebenarnya (wadah AppLayout atau
// window). Scroll anchoring bawaan browser tidak diandalkan: jangkar pilihannya bisa ikut
// tersembunyi, dan Safari belum mendukungnya.

/** Tinggi navbar (4rem, sama dengan `use-under-navbar`). */
const NAVBAR = 64;

/** Paragraf pembaca (teks dan catatan kaki) dan kartu lain yang menandai diri `data-keep-position`. */
const ANCHORS = ".reader-text .passage, .reader-footnotes > .passage, [data-keep-position]";

function firstVisible(): Element | null {
  for (const el of document.querySelectorAll(ANCHORS)) {
    const rect = el.getBoundingClientRect();
    if (rect.height > 0 && rect.bottom > NAVBAR) return el;
  }
  return null;
}

function scroller(el: Element): Element | null {
  for (let p = el.parentElement; p !== null; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if ((overflowY === "auto" || overflowY === "scroll") && p.scrollHeight > p.clientHeight) {
      return p;
    }
  }
  return null;
}

/**
 * Jalankan `apply` (perubahan atribut/variabel di <html>) tanpa menggeser elemen yang sedang dibaca.
 * `anchor` bawaan = elemen bacaan pertama yang terlihat; tanpa elemen bacaan, `apply` saja.
 */
export function keepReadingPosition(apply: () => void, anchor: Element | null = firstVisible()) {
  if (anchor === null) {
    apply();
    return;
  }
  const before = anchor.getBoundingClientRect().top;
  apply();
  const after = anchor.getBoundingClientRect();
  const delta = after.top - before;
  // Jangkar ikut tersembunyi (tinggi 0): posisinya tidak bermakna, biarkan.
  if (after.height === 0 || Math.abs(delta) < 0.5) return;
  const box = scroller(anchor);
  if (box === null) window.scrollBy({ top: delta, behavior: "instant" });
  else box.scrollBy({ top: delta, behavior: "instant" });
}
