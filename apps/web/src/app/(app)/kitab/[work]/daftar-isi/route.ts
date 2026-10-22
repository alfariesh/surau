import { loadReaderToc, loadWork } from "../../../../../lib/reader/data";

// Pohon daftar isi pembaca lengkap (X09): GET /kitab/ihya/daftar-isi → `{ items, titleSource }`
// (JSON, bentuk `loadReaderToc`). HTML halaman baca hanya membawa baris yang tampil terbuka
// (`pruneToc`); klien mengambil pohon lengkap ini saat panel daftar isi tampil (desktop) atau sheet
// daftar isi dibuka (ponsel). ISR on-demand seperti halaman baca (ADR-034): render pertama membaca
// D1, berikutnya dari cache sampai deploy berikutnya (versi korpus berganti lewat deploy, ADR-036).
// 404 bila pembaca tertutup atau karya tidak ada; alias `ihya@<edisi default>` dialihkan 308.
export const revalidate = false;
export const dynamicParams = true;
export function generateStaticParams(): { work: string }[] {
  return [];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ work: string }> },
): Promise<Response> {
  const { work } = await params;
  await loadWork(work, "/daftar-isi");
  const toc = await loadReaderToc(work);
  return Response.json(toc, { headers: { "X-Robots-Tag": "noindex" } });
}
