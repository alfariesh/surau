import { Separator, Typography } from "@heroui/react";
import NextLink from "next/link";

import { brand } from "../../i18n/id/brand";
import { landing as t } from "../../i18n/id/landing";
import { PAGE_FRAME } from "../../lib/layout";
import { SurauMark } from "../shell/logo";

const LINKS = [
  { href: "/home", label: t.footerLinks.home },
  { href: "/kitab", label: t.footerLinks.books },
  { href: "/mcp", label: t.footerLinks.mcp },
  { href: "/tentang", label: t.footerLinks.about },
  { href: "/lisensi", label: t.footerLinks.license },
  { href: "/privasi", label: t.footerLinks.privacy },
  { href: "/transparansi", label: t.footerLinks.transparency },
] as const;

// Kaki landing page: merek, tautan situs, kode sumber, dan catatan lisensi (ADR-018: atribusi
// teks kitab; kredit ilustrasi iso-glow ada juga di /lisensi#ilustrasi).
// `sourceUrl` dari layout: komponen tidak mengimpor kamus lengkap `i18n/id` (X09).
export function LandingFooter({ sourceUrl }: { sourceUrl: string }) {
  return (
    <footer className="bg-surface-secondary mt-8">
      <div className={`${PAGE_FRAME} flex flex-col gap-8 py-12`}>
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="flex max-w-sm flex-col gap-3">
            <div className="flex items-center gap-2">
              <SurauMark className="size-7 shrink-0" />
              <Typography className="text-xl font-bold">{brand.name}</Typography>
            </div>
            <Typography color="muted" type="body-sm">
              {t.footerTagline}
            </Typography>
          </div>
          <nav aria-label={t.footerNav}>
            <ul className="grid grid-cols-2 gap-x-10 gap-y-2 sm:grid-cols-3">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Typography type="body-sm">
                    <NextLink className="link" href={link.href}>
                      {link.label}
                    </NextLink>
                  </Typography>
                </li>
              ))}
              <li>
                <Typography type="body-sm">
                  <a className="link" href={sourceUrl} rel="noopener noreferrer" target="_blank">
                    {t.footerLinks.source}
                  </a>
                </Typography>
              </li>
            </ul>
          </nav>
        </div>
        <Separator />
        <Typography color="muted" type="body-xs">
          {t.footerLicense}
        </Typography>
      </div>
    </footer>
  );
}
