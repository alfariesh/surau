"use client";

import { Button, Typography } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { useEffect } from "react";

import { PageTitle } from "../components/page-title";
import { error as errorText } from "../i18n/id/error";
import { UI_LANG } from "../i18n/locale";
import { meta as metaText } from "../i18n/id/meta";

import "./globals.css";

const t = errorText;

// Galat di root layout: menggantikan seluruh dokumen, jadi <html>/<body>, CSS global, dan judul
// dipasang sendiri (metadata tidak didukung di sini). Tanpa SurauShell dan font UI: halaman ini harus
// tampil walau kerangka itu yang rusak. HeroUI v3 tidak butuh Provider.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Tanpa Providers, next-themes tidak memasang kelas tema. Pulihkan pilihan pembaca (kunci bawaan
  // next-themes "theme") atau ikuti sistem, supaya mode gelap tidak berubah terang saat galat.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("theme");
    } catch {
      // localStorage diblokir: ikuti sistem.
    }
    const theme =
      saved === "light" || saved === "dark" || saved === "sepia"
        ? saved
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.classList.add(theme);
  }, []);

  return (
    <html dir="ltr" lang={UI_LANG}>
      <body className="bg-background text-foreground font-sans antialiased">
        <title>{`${t.pageTitle} · ${metaText.siteName}`}</title>
        <main className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 pt-16 pb-16 sm:px-6">
          <PageTitle compactTitle={false}>{t.heading}</PageTitle>
          <Typography color="muted">{t.body}</Typography>
          <div className="flex flex-wrap gap-3">
            <Button onPress={() => retry()}>{t.retry}</Button>
            {/* <a> sengaja: muat ulang penuh, karena root layout sedang rusak. */}
            {/* oxlint-disable-next-line next/no-html-link-for-pages */}
            <a className={buttonVariants({ variant: "secondary" })} href="/home">
              {t.home}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
