import type { ComponentProps } from "react";

import { Typography } from "@heroui/react";

// Judul halaman (h1) dan paragraf pembuka: satu definisi supaya skala tipografi semua halaman
// konsisten. Berbasis Typography HeroUI; hanya ukuran responsif yang diatur di sini.
// Judul halaman baca dan halaman galat memakai Typography langsung karena skalanya sengaja lain.
export function PageTitle({ className, ...props }: ComponentProps<typeof Typography.Heading>) {
  return (
    <Typography.Heading
      level={1}
      className={`text-3xl sm:text-4xl lg:text-5xl lg:leading-[1.1] ${className ?? ""}`.trim()}
      {...props}
    />
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
