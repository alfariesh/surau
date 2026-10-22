import type { Metadata } from "next";

import { meta as metaText } from "../i18n/id/meta";

// Origin kanonis situs (metadataBase, sitemap, robots): domain sendiri sejak S16 (T-07, ADR-049).
// deploy.yml memakai URL yang sama untuk smoke test; Worker MCP memakainya lewat `SITE_URL`.
export const SITE_URL = "https://surau.org";

/**
 * Field `openGraph` bersama. Next menggabung metadata antarsegmen secara dangkal: `openGraph` di
 * halaman MENGGANTI seluruh objek layout, termasuk gambar dari berkas `opengraph-image.jpg` root
 * (hanya disuntik di segmen tempat berkas itu berada). Halaman yang menulis `openGraph` sendiri
 * menyebar ini supaya og:site_name, og:locale, dan og:image tidak hilang (#76).
 */
export const OPEN_GRAPH_BASE = {
  siteName: metaText.siteName,
  locale: "id_ID",
  images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: metaText.ogImageAlt }],
} satisfies NonNullable<Metadata["openGraph"]>;
