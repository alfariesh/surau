import type { Metadata } from "next";

import { Typography } from "@heroui/react";

import { listWorks } from "@surau/core";

import { SearchBox } from "../../../components/search/search-box";
import { ContinueReading } from "../../../components/reader/continue-reading";
import { WorkShelf } from "../../../components/book/work-shelf";
import { id } from "../../../i18n/id";
import { PAGE_FRAME } from "../../../lib/layout";
import { getEnv, readerEnabled } from "../../../lib/cloudflare";
import { jawabRouteOn } from "../../../lib/jawab-flag";
import { loadSearchSections } from "../../../lib/search/sections";
import { PageTitle } from "../../../components/page-title";
import { PrinciplesGrid } from "../../../components/principles-grid";

// Beranda pindah dari / ke /home (ADR-096): / kini landing page publik.
export const metadata: Metadata = {
  title: id.nav.home,
  alternates: { canonical: "/home" },
};

const t = id.home;

// Dirender per request (seperti /kitab): rak kitab membaca daftar karya dari D1 (satu query kecil),
// dan CI tidak punya D1 saat build. Bila pembaca tertutup atau D1 gagal, rak tidak ditampilkan.
export const dynamic = "force-dynamic";

// SEMENTARA (permintaan pemilik): selama karya di DB kurang dari 3, rak putar hero diisi karya yang
// ada secara berulang sampai DUMMY_COUNT buku, supaya bentuk lingkarannya terlihat. Otomatis berhenti
// begitu ada >= 3 karya asli. Semua buku tetap menautkan edisi aslinya; judul Arab tetap dari DB.
const DUMMY_COUNT = 10;

async function homeData() {
  let ask = false;
  try {
    const env = await getEnv();
    ask = jawabRouteOn(env);
    if (!readerEnabled(env)) return { ask, real: [], shelf: [], sections: [] };
    // Bagian kitab untuk pemilih sumber (sama dengan /cari): satu query daftar isi kedalaman 2.
    // Fitur sekunder: gagal = pemilih tanpa bagian, rak dan Maknaz tetap tampil.
    const [{ works }, sections] = await Promise.all([
      listWorks(env.CORPUS_DB),
      loadSearchSections(env.CORPUS_DB).catch((error: unknown) => {
        console.error("bagian kitab beranda gagal dimuat", error);
        return [];
      }),
    ]);
    const real = works.flatMap((work) => {
      const edition = work.editions.find((e) => e.is_default) ?? work.editions[0];
      return edition ? [{ ...work, href: edition.permalink }] : [];
    });
    const shelf =
      real.length === 0 || real.length >= 3
        ? real
        : Array.from({ length: DUMMY_COUNT }, (_, i) => {
            const work = real[i % real.length]!;
            return { ...work, slug: `${work.slug}-${i}` };
          });
    return { ask, real, shelf, sections };
  } catch (error) {
    // Gagal = Beranda tetap tampil tanpa rak dan pemilih kitab (Maknaz mengikuti saklarnya).
    console.error("data beranda gagal dimuat", error);
    return { ask, real: [], shelf: [], sections: [] };
  }
}

// Beranda (ADR-086): fokus cari dan jelajah. Rak kitab, sambutan singkat, kotak cari (Cari/Maknaz),
// lanjutkan membaca, lalu tiga prinsip.
export default async function HomePage() {
  const { ask, real, shelf, sections } = await homeData();
  // Pemilih kitab memakai karya asli (bukan isian rak sementara); judul Latin, Arab tidak dipakai di
  // daftar teks biasa.
  const works = real.flatMap((w) => (w.title_id ? [{ slug: w.slug, title: w.title_id }] : []));
  return (
    <div className={`${PAGE_FRAME} flex flex-col items-center gap-14 pt-2 pb-16 sm:pt-4`}>
      <section
        aria-labelledby="judul-beranda"
        className="flex w-full max-w-2xl flex-col items-center gap-5 text-center"
      >
        {shelf.length > 0 ? (
          // Ruang atas panggung rak (kemiringan kamera) dipotong supaya kotak cari naik ke layar pertama.
          <WorkShelf className="-mt-6 -mb-4 w-full sm:-mt-14" label={t.shelfLabel} works={shelf} />
        ) : null}
        <PageTitle className="text-center text-balance" compactTitle={false} id="judul-beranda">
          {t.heading}
        </PageTitle>
        <SearchBox ask={ask} sections={sections} works={works} />
        <ContinueReading wide className="w-full text-start" />
      </section>

      <section
        aria-labelledby="judul-prinsip"
        className="flex w-full max-w-5xl flex-col items-center gap-8"
      >
        <div className="flex max-w-xl flex-col items-center gap-2">
          <Typography.Heading
            className="text-center text-xl sm:text-2xl"
            id="judul-prinsip"
            level={2}
          >
            {t.principlesHeading}
          </Typography.Heading>
          <Typography className="text-center text-pretty" color="muted" type="body-sm">
            {t.principlesLead}
          </Typography>
        </div>
        <PrinciplesGrid />
      </section>
    </div>
  );
}
