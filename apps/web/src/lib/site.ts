import { id } from "../i18n/id";

// Origin kanonis situs (metadataBase, sitemap, robots): domain sendiri sejak S16 (T-07, ADR-049).
// deploy.yml memakai URL yang sama untuk smoke test; Worker MCP memakainya lewat `SITE_URL`.
export const SITE_URL = "https://surau.org";

/**
 * Field `openGraph` bersama. Next menggabung metadata antarsegmen secara dangkal: `openGraph` di
 * halaman MENGGANTI seluruh objek layout, jadi halaman yang menulis `openGraph` sendiri menyebar ini
 * supaya og:site_name dan og:locale tidak hilang (#76).
 */
export const OPEN_GRAPH_BASE = { siteName: id.meta.siteName, locale: "id_ID" } as const;
