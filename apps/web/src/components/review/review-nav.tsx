import { Typography } from "@heroui/react";
import NextLink from "next/link";
import { reviewNavText as t } from "../../i18n/review";

/**
 * Navigasi ruang penilai: tinjauan jawaban eval, label status hadits (X07), dan koreksi terjemahan
 * (X08). Peran tetap diperiksa di server setiap halaman/route; navigasi hanya tautan.
 */
export function ReviewNav({ current }: { current: "jawaban" | "takhrij" | "terjemahan" }) {
  const links = [
    { key: "jawaban", href: "/tinjau", label: t.answers },
    { key: "takhrij", href: "/tinjau/takhrij", label: t.takhrij },
    { key: "terjemahan", href: "/tinjau/terjemahan", label: t.translations },
  ] as const;
  return (
    <nav aria-label={t.label} className="flex flex-wrap gap-4 text-sm">
      {links.map((l) =>
        l.key === current ? (
          <Typography key={l.key} type="body-sm" weight="semibold" aria-current="page">
            {l.label}
          </Typography>
        ) : (
          <NextLink key={l.key} href={l.href} className="text-accent underline underline-offset-4">
            {l.label}
          </NextLink>
        ),
      )}
    </nav>
  );
}
