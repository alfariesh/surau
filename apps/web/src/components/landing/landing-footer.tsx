import { Typography } from "@heroui/react";
import NextLink from "next/link";

import { brand } from "../../i18n/id/brand";
import { landing as t } from "../../i18n/id/landing";

const LINKS = [
  { href: "/home", label: t.footerLinks.home },
  { href: "/kitab", label: t.footerLinks.books },
  { href: "/mcp", label: t.footerLinks.mcp },
  { href: "/tentang", label: t.footerLinks.about },
  { href: "/lisensi", label: t.footerLinks.license },
  { href: "/privasi", label: t.footerLinks.privacy },
  { href: "/transparansi", label: t.footerLinks.transparency },
] as const;

// Kaki landing page, ringkas dan rata tengah seperti template buku: tautan situs
// dan catatan lisensi (ADR-018: atribusi teks kitab; kredit ilustrasi iso-glow juga di /lisensi).
export function LandingFooter() {
  return (
    <footer className="relative pt-5 pb-20 sm:pt-14 sm:pb-32">
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 text-center">
        <nav aria-label={t.footerNav}>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Typography type="body-sm">
                  <NextLink className="link" href={link.href}>
                    {link.label}
                  </NextLink>
                </Typography>
              </li>
            ))}
          </ul>
        </nav>
        <Typography color="muted" type="body-sm">
          {brand.name} · {t.footerLicense}
        </Typography>
      </div>
    </footer>
  );
}
