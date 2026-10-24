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

/**
 * Jangkar = elemen pertama yang awalnya tampak di bawah navbar (paragraf yang sedang mulai dibaca,
 * juga tujuan `#pN`); perubahan di paragraf yang terpotong di atasnya ikut dikompensasi. Bila tidak
 * ada (satu paragraf panjang memenuhi layar), paragraf yang terpotong itu.
 */
function firstVisible(): Element | null {
  let partial: Element | null = null;
  for (const el of document.querySelectorAll(ANCHORS)) {
    const rect = el.getBoundingClientRect();
    if (rect.height === 0 || rect.bottom <= NAVBAR) continue;
    if (rect.top >= NAVBAR - 1) return rect.top < window.innerHeight ? el : (partial ?? el);
    partial ??= el;
  }
  return partial;
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
  const box = scroller(anchor);
  // Scroll anchoring browser dimatikan selama penyesuaian: tanpa ini Chrome ikut mengoreksi sesudah
  // koreksi di bawah (koreksi ganda), terutama bila jangkar pilihannya ikut tersembunyi.
  const anchored = (box as HTMLElement | null) ?? document.documentElement;
  const previous = anchored.style.overflowAnchor;
  anchored.style.overflowAnchor = "none";
  const before = anchor.getBoundingClientRect().top;
  apply();
  const after = anchor.getBoundingClientRect();
  const delta = after.top - before;
  // Jangkar ikut tersembunyi (tinggi 0): posisinya tidak bermakna, biarkan.
  if (after.height > 0 && Math.abs(delta) >= 0.5) {
    if (box === null) window.scrollBy({ top: delta, behavior: "instant" });
    else box.scrollBy({ top: delta, behavior: "instant" });
  }
  // Dipulihkan sesudah tata letak berikutnya selesai (dua frame).
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      anchored.style.overflowAnchor = previous;
    }),
  );
}
