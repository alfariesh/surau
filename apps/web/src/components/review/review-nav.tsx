import NextLink from "next/link";
import { reviewNavText as t } from "../../i18n/review";

/** Navigasi ruang penilai: tinjauan jawaban eval dan tinjauan label status hadits (X07). */
export function ReviewNav({ current }: { current: "jawaban" | "takhrij" }) {
  const links = [
    { key: "jawaban", href: "/tinjau", label: t.answers },
    { key: "takhrij", href: "/tinjau/takhrij", label: t.takhrij },
  ] as const;
  return (
    <nav aria-label={t.label} className="flex flex-wrap gap-4 text-sm">
      {links.map((l) =>
        l.key === current ? (
          <span key={l.key} aria-current="page" className="font-semibold">
            {l.label}
          </span>
        ) : (
          <NextLink key={l.key} href={l.href} className="text-accent underline underline-offset-4">
            {l.label}
          </NextLink>
        ),
      )}
    </nav>
  );
}
