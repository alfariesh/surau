import { SITE_URL } from "./site";

export interface Crumb {
  name: string;
  /** Alamat relatif (mis. `/kitab/ihya`) atau absolut. */
  href: string;
}

// Schema.org BreadcrumbList untuk Google (rich result desktop). Nama butir dari DB apa adanya
// (judul Arab verbatim); hanya alamat yang dijadikan absolut terhadap SITE_URL.
export function breadcrumbJsonLd(crumbs: readonly Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: new URL(crumb.href, SITE_URL).toString(),
    })),
  };
}

// Isi <script type="application/ld+json">: `<` di-escape agar judul dari DB tidak bisa menutup tag.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
