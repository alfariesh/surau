import type { EditionView, WorkView } from "@surau/core";

// Segmen karya di URL publik (ADR-029 butir 4): `ihya` = edisi default, `ihya@<edisi>` = edisi
// lain. Satu URL kanonis per halaman: `ihya@<slug edisi default>` dialihkan ke `ihya`.

const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";
const SEGMENT = new RegExp(`^(${SLUG})(?:@(${SLUG}))?$`);

export interface WorkSegment {
  workSlug: string;
  editionSlug: string | null;
}

/** `null` bila bentuknya salah (huruf besar, spasi, `@` ganda, dll.). */
export function parseWorkSegment(raw: string): WorkSegment | null {
  let value = raw;
  // Next bisa memberikan `@` yang masih ter-encode (`%40`); decode sekali, aman dari URI rusak.
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const m = SEGMENT.exec(value);
  if (m === null || m[1] === undefined || value.length > 130) return null;
  return { workSlug: m[1], editionSlug: m[2] ?? null };
}

export type EditionResolution =
  | { kind: "ok"; edition: EditionView }
  | { kind: "redirect"; segment: string }
  | { kind: "not_found" };

/** Validasi kepemilikan edisi: edisi harus milik karya ini. */
export function resolveEdition(work: WorkView, editionSlug: string | null): EditionResolution {
  const fallback = work.editions.find((e) => e.is_default);
  if (editionSlug === null) {
    return fallback === undefined ? { kind: "not_found" } : { kind: "ok", edition: fallback };
  }
  const edition = work.editions.find((e) => e.slug === editionSlug);
  if (edition === undefined) return { kind: "not_found" };
  if (edition.is_default) return { kind: "redirect", segment: work.slug };
  return { kind: "ok", edition };
}

/** Segmen URL kanonis sebuah edisi (`ihya` atau `ihya@openiti`). */
export function editionSegment(work: Pick<WorkView, "slug">, edition: EditionView): string {
  return edition.is_default ? work.slug : `${work.slug}@${edition.slug}`;
}
