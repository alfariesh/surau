import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Amiri, Noto_Naskh_Arabic, Plus_Jakarta_Sans } from "next/font/google";

import { id } from "../i18n/id";

import { Providers } from "./providers";

import "./globals.css";

// Font UI: Plus Jakarta Sans (karya Tokotype, Indonesia). Font Arab: Noto Naskh Arabic dan Amiri
// (dua opsi T-08); keduanya diunduh saat build dan di-host sendiri oleh next/font.
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

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
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
      className={`palet-zaitun ${jakarta.variable} ${naskh.variable} ${amiri.variable}`}
      dir="ltr"
      lang="id"
    >
      <body className="bg-background text-foreground font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
