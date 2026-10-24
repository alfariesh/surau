import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import {
  Amiri,
  Google_Sans,
  Noto_Naskh_Arabic,
  Noto_Sans_Arabic,
  Scheherazade_New,
} from "next/font/google";

import { id } from "../i18n/id";
import { UI_LANG } from "../i18n/locale";
import { PAPER_SCRIPT } from "../lib/paper";
import { READER_SCALE_SCRIPT } from "../lib/reader/scale";
import { OPEN_GRAPH_BASE, SITE_URL } from "../lib/site";

import { Providers } from "./providers";

import "./globals.css";

// Font UI: Google Sans (OFL, Google Fonts; ADR-080, menggantikan HarmonyOS Sans ADR-056), diunduh saat
// build dan di-host sendiri oleh next/font sebagai WOFF2 variabel (satu berkas untuk bobot 400–700, ±36 KB
// subset Latin). Dua pemanggilan dengan nama keluarga yang sama: gaya normal di-preload (dipakai semua
// halaman), italic tidak (baru diunduh bila ada teks miring). Font Arab: Noto Naskh Arabic (T-08,
// ADR-027). Naskh tidak di-preload: teks Arab belum ada di setiap halaman (preload khusus halaman baca
// ditolak di X09: next/font memberi berkas preload URL lain, jadi berkas yang sama bisa terunduh dua kali).
const googleSans = Google_Sans({
  subsets: ["latin"],
  style: "normal",
  variable: "--font-ui",
  display: "swap",
  // next/font belum punya metrik Google Sans untuk huruf cadangan otomatis; cadangan bermetrik
  // didefinisikan sendiri di globals.css ("Google Sans Fallback") supaya teks tidak bergeser saat
  // font selesai diunduh.
  adjustFontFallback: false,
  fallback: ["Google Sans Fallback"],
});

const googleSansItalic = Google_Sans({
  subsets: ["latin"],
  style: "italic",
  variable: "--font-ui-italic",
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
      className={`${googleSans.variable} ${googleSansItalic.variable} ${naskh.variable} ${amiri.variable} ${scheherazade.variable} ${notoSansArabic.variable}`}
      dir="ltr"
      lang={UI_LANG}
    >
      <body className="bg-background text-foreground font-sans antialiased">
        {/* Tekstur kertas (X09, lib/paper.ts): skrip mentah supaya dijalankan saat HTML diurai, sebelum
            isi tampil; bila tile belum pernah terunduh, tekstur ditunda sampai halaman dimuat. */}
        <script dangerouslySetInnerHTML={{ __html: PAPER_SCRIPT }} suppressHydrationWarning />
        {/* Preferensi tampilan pembaca dipasang di <html> sebelum teks tampil (tidak berkedip). Skrip
            mentah seperti tekstur kertas (X10): `<Script strategy="beforeInteractive">` di App Router
            baru dijalankan sesudah JS utama terunduh, jadi di ponsel lambat ukuran huruf dan tata
            letak sempat tampil bawaan. Harus di root layout: <script> di dalam halaman tidak
            dijalankan saat navigasi klien dan memicu peringatan React. Selektornya hanya mengenai
            kelas pembaca, jadi aman di semua halaman. */}
        <script
          dangerouslySetInnerHTML={{ __html: READER_SCALE_SCRIPT }}
          suppressHydrationWarning
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
