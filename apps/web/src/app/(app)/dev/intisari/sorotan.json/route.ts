import { notFound } from "next/navigation";

import { devPagesEnabled, getEnv } from "../../../../../lib/cloudflare";
import { FIXTURE_BOOK, FIXTURE_SECTION } from "../../../../../lib/reader/digest-fixture";
import { fixtureListen } from "../../../../../lib/reader/digest-fixture-audio";

// Timestamps BUATAN audio sunyi /dev/intisari (X18): bentuk sama dengan objek `.align.json` di
// bucket media. `?tier=section` = Intisari Bab. Hanya di `next dev` dan Preview (`DEV_PAGES`).
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  if (!devPagesEnabled(await getEnv())) notFound();
  const section = new URL(request.url).searchParams.get("tier") === "section";
  const { alignment } = await fixtureListen(section ? FIXTURE_SECTION : FIXTURE_BOOK, section);
  return Response.json(alignment, {
    headers: { "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
