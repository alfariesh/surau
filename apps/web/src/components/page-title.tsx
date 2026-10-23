import type { ComponentProps } from "react";

import { Typography } from "@heroui/react";

import { CompactTitle } from "./shell/compact-title";

// Judul halaman (h1) dan paragraf pembuka: satu definisi supaya skala tipografi semua halaman
// konsisten. Berbasis Typography HeroUI; hanya ukuran responsif yang diatur di sini.
// Judul halaman baca memakai Typography langsung karena skalanya sengaja lain.
export function PageTitle({
  className,
  compactTitle,
  ...props
}: ComponentProps<typeof Typography.Heading> & {
  /**
   * Judul ringkas yang muncul di navbar saat judul ini tergulir keluar. Bawaan: isi judul bila
   * berupa teks biasa; `false` mematikannya (mis. kalimat sambutan beranda).
   */
  compactTitle?: string | false;
}) {
  const compact = compactTitle ?? (typeof props.children === "string" ? props.children : undefined);
  return (
    <>
      <Typography.Heading
        level={1}
        className={`text-3xl sm:text-4xl lg:text-5xl lg:leading-[1.1] ${className ?? ""}`.trim()}
        data-page-title={compact ? "" : undefined}
        {...props}
      />
      {compact ? <CompactTitle title={compact} /> : null}
    </>
  );
}

export function PageLead({ className, ...props }: ComponentProps<typeof Typography>) {
  return (
    <Typography
      color="muted"
      className={`text-pretty sm:text-lg ${className ?? ""}`.trim()}
      {...props}
    />
  );
}
