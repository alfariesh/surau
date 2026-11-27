// Kitab yang ada di korpus yang sedang diuji (X31a langkah 8a, ADR-142). Ihya diarsipkan: korpus
// Gelombang 1 (staging/Preview dan D1 lokal dari `pnpm corpus:load:local`) hanya berisi kitab kecil,
// jadi tes yang memakai data Ihya dilewati bila Ihya tidak ada, bukan gagal. Dicek lewat
// `daftar-isi.json` karya (404 bila karya tidak ada di D1).
import { type APIRequestContext, test } from "@playwright/test";

const cache = new Map<string, Promise<boolean>>();

export function adaKitab(request: APIRequestContext, slug: string): Promise<boolean> {
  let found = cache.get(slug);
  if (found === undefined) {
    found = request
      .get(`/kitab/${slug}/daftar-isi.json`)
      .then((res) => res.status() === 200)
      .catch(() => false);
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
