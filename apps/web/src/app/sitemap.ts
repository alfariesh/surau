import type { MetadataRoute } from "next";

import { listWorks, pagePermalink } from "@surau/core";
import { listPages } from "@surau/db";
import { headers } from "next/headers";

import { getEnv, readerEnabled } from "../lib/cloudflare";

// sitemap.xml: halaman statis + (bila pembaca terbuka) halaman karya dan semua halaman cetak edisi
// default. Dinamis, bukan dibekukan saat build: datanya dari D1, yang tidak ada di CI. Origin dari
// host permintaan, supaya Preview menunjuk dirinya sendiri. Bagian (/bab/<id>) tidak dicantumkan:
// itu pengalihan ke halaman cetak. Ihya ±1.700 URL, jauh di bawah batas 50.000 per sitemap.
export const dynamic = "force-dynamic";

async function origin(): Promise<string> {
  const host = (await headers()).get("host") ?? "localhost";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return `${local ? "http" : "https"}://${host}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await origin();
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/` },
    { url: `${base}/tentang` },
    { url: `${base}/lisensi` },
    { url: `${base}/mcp` },
  ];
  const env = await getEnv();
  if (!readerEnabled(env)) return entries;

  entries.push({ url: `${base}/kitab` });
  const { works } = await listWorks(env.CORPUS_DB);
  for (const work of works) {
    const edition = work.editions.find((e) => e.is_default);
    if (edition === undefined) continue;
    entries.push({ url: `${base}${edition.permalink}` });
    const path = { workSlug: work.slug, editionSlug: edition.slug, isDefault: true };
    for (const page of await listPages(env.CORPUS_DB, edition.id)) {
      entries.push({ url: `${base}${pagePermalink(path, page.juz, page.page_no)}` });
    }
  }
  return entries;
}
