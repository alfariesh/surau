import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Amiri, Noto_Naskh_Arabic, Noto_Sans_Arabic, Scheherazade_New } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";

import { id } from "../i18n/id";
import { PAPER_SCRIPT } from "../lib/paper";
import { READER_SCALE_SCRIPT } from "../lib/reader/scale";
import { OPEN_GRAPH_BASE, SITE_URL } from "../lib/site";

import { Providers } from "./providers";

import "./globals.css";

// Font UI: HarmonyOS Sans (Huawei; lisensi khusus, ADR-056), disalin apa adanya dari TTF resmi tanpa
// diubah. Berkasnya statis: tidak ada SemiBold, jadi weight 600 (judul) memakai berkas Bold. Font
// Arab: Noto Naskh Arabic (T-08, ADR-027), diunduh saat build dan di-host sendiri oleh next/font.
// Naskh tidak di-preload: teks Arab belum ada di setiap halaman, jadi tidak perlu membebani halaman
// lain (preload khusus halaman baca ditolak di X09: next/font memberi berkas preload URL lain, jadi
// berkas yang sama bisa terunduh dua kali). HarmonyOS juga tanpa preload (X09): empat TTF
// ±230 KB yang di-preload berebut jaringan dengan CSS dan teks halaman di ponsel; berkas tetap dimuat
// begitu teksnya tampil (Italic hanya bila ada teks miring).
const harmony = localFont({
  src: [
    { path: "../fonts/harmonyos-sans/HarmonyOS_Sans_Regular.ttf", weight: "400", style: "normal" },
    {
      path: "../fonts/harmonyos-sans/HarmonyOS_Sans_Regular_Italic.ttf",
      weight: "400",
      style: "italic",
    },
    { path: "../fonts/harmonyos-sans/HarmonyOS_Sans_Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/harmonyos-sans/HarmonyOS_Sans_Bold.ttf", weight: "600 700", style: "normal" },
  ],
  variable: "--font-harmony",
  display: "swap",
  preload: false,
});

const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-naskh",
  display: "swap",
  preload: false,
});

// Font Arab pilihan pembaca (panel Tampilan di halaman baca, semuanya lisensi OFL). Tidak
// di-preload: browser hanya mengunduh berkasnya bila pembaca memilih font itu.
const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
  preload: false,
});

const scheherazade = Scheherazade_New({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-scheherazade",
  display: "swap",
  preload: false,
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-sans-arabic",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: id.meta.title,
    template: `%s · ${id.meta.siteName}`,
  },
  description: id.meta.description,
  applicationName: id.meta.siteName,
  openGraph: {
    ...OPEN_GRAPH_BASE,
    type: "website",
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
      className={`${harmony.variable} ${naskh.variable} ${amiri.variable} ${scheherazade.variable} ${notoSansArabic.variable}`}
      dir="ltr"
      lang="id"
    >
      <body className="bg-background text-foreground font-sans antialiased">
        {/* Tekstur kertas (X09, lib/paper.ts): skrip mentah supaya dijalankan saat HTML diurai, sebelum
            isi tampil; bila tile belum pernah terunduh, tekstur ditunda sampai halaman dimuat. */}
        <script dangerouslySetInnerHTML={{ __html: PAPER_SCRIPT }} suppressHydrationWarning />
        {/* Preferensi tampilan pembaca dipasang di <html> sebelum teks tampil (tidak berkedip). Harus di
            root layout: <script> di dalam halaman tidak dijalankan saat navigasi klien dan memicu
            peringatan React. Selektornya hanya mengenai kelas pembaca, jadi aman di semua halaman. */}
        <Script id="reader-prefs" strategy="beforeInteractive">
          {READER_SCALE_SCRIPT}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
