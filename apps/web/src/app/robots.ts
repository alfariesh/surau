import type { MetadataRoute } from "next";

import { SITE_URL } from "../lib/site";

// robots.txt: semua halaman boleh dirayapi kecuali API. Statis (dibekukan saat build).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
