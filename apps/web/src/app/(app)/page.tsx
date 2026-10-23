import type { Metadata } from "next";

import { Card, Typography } from "@heroui/react";

import { listWorks } from "@surau/core";

import { ArtEmbed } from "../../components/art/art-embed";
import { HomeSearch } from "../../components/home/home-search";
import { ContinueReading } from "../../components/reader/continue-reading";
import { WorkShelf } from "../../components/book/work-shelf";
import { id } from "../../i18n/id";
import { PAGE_FRAME } from "../../lib/layout";
import { getEnv, readerEnabled } from "../../lib/cloudflare";
import { PageLead, PageTitle } from "../../components/page-title";

export const metadata: Metadata = {
  title: { absolute: id.meta.title },
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
  try {
    const env = await getEnv();
    // Segmen Maknaz di kotak cari mengikuti saklar rute Jawab (mati di produksi sampai `/rilis 4`).
    const ask = env.JAWAB_ROUTE_ENABLED === "1" || process.env.NODE_ENV === "development";
    if (!readerEnabled(env)) return { ask, real: [], shelf: [] };
    const { works } = await listWorks(env.CORPUS_DB);
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
    return { ask, real, shelf };
  } catch (error) {
    // Gagal = Beranda tetap tampil: tanpa rak, pemilih kitab, dan Maknaz.
    console.error("data beranda gagal dimuat", error);
    return { ask: false, real: [], shelf: [] };
  }
}

// Beranda (ADR-086): fokus cari dan jelajah. Rak kitab, sambutan singkat, kotak cari (Cari/Maknaz),
// lanjutkan membaca, lalu tiga prinsip.
export default async function HomePage() {
  const { ask, real, shelf } = await homeData();
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
        <div className="flex flex-col items-center gap-3">
          <PageTitle className="text-center text-balance" compactTitle={false} id="judul-beranda">
            {t.heading}
          </PageTitle>
          <PageLead className="max-w-xl text-center">{ask ? t.lead : t.leadSearchOnly}</PageLead>
        </div>
        <HomeSearch ask={ask} works={works} />
        <ContinueReading className="w-full text-start" />
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
        <ol className="grid w-full gap-4 sm:grid-cols-3">
          {t.principles.map((p, index) => (
            <li key={p.title} className="flex" data-art-card>
              <Card className="w-full gap-0 p-2">
                {/* Ilustrasi per prinsip (ADR-057): tanpa kata, dekoratif; hover/ketuk kartu memutar ulang.
                    Panel bertepi lembut supaya ruang kosong ilustrasi terbaca sebagai bingkai. */}
                <div className="bg-surface-secondary overflow-hidden rounded-xl">
                  <ArtEmbed name={p.art} title={t.principleArtTitle} />
                </div>
                <Card.Header className="gap-1.5 px-3 pt-4 pb-3">
                  <Typography className="font-medium tabular-nums" color="muted" type="body-xs">
                    <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <span className="sr-only">{t.principleNumber(index + 1)}</span>
                  </Typography>
                  <Card.Title className="text-base">{p.title}</Card.Title>
                  <Card.Description className="text-pretty">{p.body}</Card.Description>
                </Card.Header>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
