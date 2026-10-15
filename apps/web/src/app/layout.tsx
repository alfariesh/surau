import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Noto_Naskh_Arabic, Plus_Jakarta_Sans } from "next/font/google";

import { id } from "../i18n/id";

import { Providers } from "./providers";

import "./globals.css";

// Font UI: Plus Jakarta Sans (karya Tokotype, Indonesia). Font Arab: Noto Naskh Arabic (T-08,
// ADR-027). Keduanya diunduh saat build dan di-host sendiri oleh next/font. Naskh tidak di-preload:
// teks Arab belum ada di setiap halaman, jadi tidak perlu membebani halaman lain.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-naskh",
  display: "swap",
  preload: false,
});

const SITE_URL = "https://surau-web.alfarieshsalman.workers.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: id.meta.title,
    template: `%s · ${id.meta.siteName}`,
  },
  description: id.meta.description,
  applicationName: id.meta.siteName,
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: id.meta.siteName,
    title: id.meta.title,
    description: id.meta.description,
    url: "/",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      suppressHydrationWarning
      className={`${jakarta.variable} ${naskh.variable}`}
      dir="ltr"
      lang="id"
    >
      <body className="bg-background text-foreground font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
