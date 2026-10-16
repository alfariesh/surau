import { redirect } from "next/navigation";

import { loadTocNode } from "../../../../../../lib/reader/data";

// Permalink bagian daftar isi (ADR-029): /kitab/ihya/bab/<toc_node.id>. Dialihkan (307, bukan
// 308: awal bagian bisa bergeser bila patch daftar isi berubah) ke halaman awal bagian, dengan
// jangkar #bab-<id> di paragraf pertamanya. Node milik edisi lain = 404 (validasi lewat getToc).
export const revalidate = false;
export const dynamicParams = true;
export function generateStaticParams(): { work: string; id: string }[] {
  return [];
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ work: string; id: string }>;
}) {
  const { work, id } = await params;
  const { node } = await loadTocNode(work, id);
  redirect(`${node.start.permalink}#bab-${node.id}`);
}
