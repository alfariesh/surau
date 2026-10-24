import { readDigest } from "@surau/core";
import { AI_TEXT_LANG, listTitleTranslations } from "@surau/db";
import { notFound } from "next/navigation";

import { listenTrack } from "../../../../../../../../components/listen/track";
import { loadTocNode } from "../../../../../../../../lib/reader/data";

// Data pemutar "Dengarkan" satu Intisari (X17): GET /kitab/ihya/bab/<id>/intisari/dengar.json →
// `ListenTrack` (URL MP3 di media.surau.org, durasi, suara AI, bab = gagasan beserta judulnya).
// Dipakai pemutar global untuk memulihkan sesi sesudah muat ulang. ISR on-demand seperti halaman
// baca (ADR-034): versi korpus berganti lewat deploy (ADR-036). 404 bila node bukan milik edisi,
// belum punya Intisari yang tampil, atau Intisarinya belum punya audio (termasuk korpus skema < 9).
export const revalidate = false;
export const dynamicParams = true;
export function generateStaticParams(): { work: string; id: string }[] {
  return [];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ work: string; id: string }> },
): Promise<Response> {
  const { work, id } = await params;
  const { env, edition, node, segment } = await loadTocNode(work, id);
  const view = await readDigest(env.CORPUS_DB, node.id);
  if (view === null) notFound();
  const titles = await listTitleTranslations(env.CORPUS_DB, edition.id, AI_TEXT_LANG);
  const title = titles?.toc.find(
    (t) => t.toc_node_id === node.id && t.review_status !== "rejected",
  )?.text;
  const track = listenTrack(view, {
    work: segment,
    title: title ?? node.title_ar,
    href: `/kitab/${segment}/bab/${node.id}/intisari`,
  });
  if (track === null) notFound();
  return Response.json(track, { headers: { "X-Robots-Tag": "noindex" } });
}
