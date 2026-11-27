// Kitab yang ada di korpus yang sedang diuji (X31a langkah 8a, ADR-142). Ihya diarsipkan: korpus
// Gelombang 1 (staging/Preview dan D1 lokal dari `pnpm corpus:load:local`) hanya berisi kitab kecil,
// jadi tes yang memakai data Ihya dilewati bila Ihya tidak ada, bukan gagal. Dicek lewat
// `daftar-isi.json` karya: HANYA 404 berarti "tidak ada". Status lain (500, galat jaringan) melempar
// galat supaya kerusakan Preview tidak tersembunyi sebagai tes yang dilewati (peninjau X31a 8a).
import { type APIRequestContext, test } from "@playwright/test";

const cache = new Map<string, Promise<boolean>>();

export function adaKitab(request: APIRequestContext, slug: string): Promise<boolean> {
  let found = cache.get(slug);
  if (found === undefined) {
    found = request.get(`/kitab/${slug}/daftar-isi.json`).then((res) => {
      if (res.status() === 200) return true;
      if (res.status() === 404) return false;
      throw new Error(`/kitab/${slug}/daftar-isi.json → ${res.status()}, bukan 200 atau 404`);
    });
    cache.set(slug, found);
  }
  return found;
}

/** Lewati tes yang sedang berjalan bila kitab `slug` tidak ada di korpus. */
export async function butuhKitab(request: APIRequestContext, slug: string): Promise<void> {
  test.skip(!(await adaKitab(request, slug)), `kitab ${slug} tidak ada di korpus ini (ADR-142)`);
}

/** Lewati semua tes di berkas/describe ini bila kitab `slug` tidak ada di korpus. */
export function lewatiTanpaKitab(slug: string): void {
  test.beforeEach(async ({ request }) => {
    await butuhKitab(request, slug);
  });
}

/** Kitab yang dikenal e2e (ADR-142: Ihya diarsipkan, Bidayah kitab pertama Gelombang 1). */
export const KITAB_UJI = ["bidayat-al-hidayah", "ihya"] as const;
