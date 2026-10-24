import type { Metadata } from "next";

import { Alert } from "@heroui/react";
import NextLink from "next/link";
import { notFound } from "next/navigation";

import { DigestPage } from "../../../../components/intisari/digest-page";
import { id } from "../../../../i18n/id";
import { devPagesEnabled, getEnv } from "../../../../lib/cloudflare";
import { PAGE_FRAME } from "../../../../lib/layout";
import {
  FIXTURE_BOOK,
  FIXTURE_CHILDREN,
  FIXTURE_SECTION,
} from "../../../../lib/reader/digest-fixture";

const t = id.intisari;

// Pratinjau halaman Intisari dari fixture buatan (X16), tanpa D1: e2e komponen di Preview CI dan
// `next dev` sebelum data nyata ada di staging (X15b langkah 9). `?tier=section` = tata letak Bab.
// Tidak tampil di produksi (`DEV_PAGES`), tidak diindeks. Teks Arabnya kalimat contoh, bukan kitab.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.devTitle,
  robots: { index: false, follow: false },
};

export default async function DevIntisariPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!devPagesEnabled(await getEnv())) notFound();
  const section = (await searchParams).tier === "section";
  const digest = section ? FIXTURE_SECTION : FIXTURE_BOOK;
  return (
    <div className={`${PAGE_FRAME} flex flex-col gap-8 pt-6 pb-16`}>
      <Alert className="mx-auto w-full max-w-2xl" status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t.devTitle}</Alert.Title>
          <Alert.Description>
            {t.devLead}{" "}
            <NextLink
              className="link"
              href={section ? "/dev/intisari" : "/dev/intisari?tier=section"}
            >
              {section ? t.tierBook : t.tierSection}
            </NextLink>
          </Alert.Description>
        </Alert.Content>
      </Alert>
      <DigestPage
        author="penulis uji"
        crumbs={[
          { name: id.reader.listTitle, href: "/kitab" },
          { name: "Kitab Uji", href: "/dev/intisari" },
        ]}
        digest={digest}
        editionSlug="uji"
        hubHref="/dev/intisari"
        sections={section ? [] : FIXTURE_CHILDREN}
        titleId={section ? "Bab Uji" : "Kitab Uji"}
        titleLang="id"
        workSlug="uji"
      />
    </div>
  );
}
