// Amplop setiap hasil tool MCP (ADR-021, ADR-049): permalink absolut dan blok `license`.
// Core mengembalikan permalink berupa path tanpa origin (packages/core/README); di sini origin situs
// ditambahkan, supaya AI pengguna bisa menautkan halaman cetak secara langsung.
import { z } from "zod";

/** Lisensi konten yang URL resminya diketahui (data/LICENSE). Lisensi lain → halaman /lisensi. */
const LICENSE_URLS: Readonly<Record<string, string>> = {
  "CC BY-NC-SA 4.0": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const licenseBlock = z
  .strictObject({
    name: z.string().describe("Content license of the texts in this result, e.g. CC BY-NC-SA 4.0"),
    url: z.string().describe("License text"),
    terms_url: z.string().describe("Surau license, attribution and correction page"),
    attribution: z
      .string()
      .describe("Required attribution: digital text source, edition, and Surau as the adapter"),
    notice: z.string().describe("How the content may be reused"),
  })
  .describe(
    "License and attribution for this result (ADR-021). Keep it when quoting or republishing content",
  );
export type LicenseBlock = z.infer<typeof licenseBlock>;

export const LICENSE_NOTICE =
  "Non-commercial use only; share adaptations under the same license; credit the work, edition, volume and page, and Surau. AI translations and summaries are labelled and may contain errors.";

/**
 * Blok lisensi untuk satu hasil: `sources` = pasangan (lisensi, atribusi) edisi yang muncul di
 * hasil itu. Hasil tanpa edisi (mis. pencarian kosong) tetap membawa lisensi konten Surau.
 */
export function licenseFor(
  siteUrl: string,
  sources: readonly { license: string; attribution: string }[],
): LicenseBlock {
  const licenses = [...new Set(sources.map((s) => s.license))];
  const attributions = [...new Set(sources.map((s) => s.attribution))];
  const name = licenses.length === 0 ? "CC BY-NC-SA 4.0" : licenses.join("; ");
  const terms = `${siteUrl}/lisensi`;
  return {
    name,
    url: licenses.length === 1 ? (LICENSE_URLS[name] ?? terms) : terms,
    terms_url: terms,
    attribution: [...attributions, `Adapted and published by Surau (${siteUrl})`].join("; "),
    notice: LICENSE_NOTICE,
  };
}

/**
 * Salinan `value` dengan setiap field `permalink` yang berupa path ("/kitab/…") diberi origin
 * situs. Field lain dan teks kitab tidak disentuh.
 */
export function absolutize<T>(value: T, siteUrl: string): T {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v === null || typeof v !== "object") return v;
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      out[k] =
        k === "permalink" && typeof x === "string" && x.startsWith("/") ? siteUrl + x : walk(x);
    }
    return out;
  };
  return walk(value) as T;
}
