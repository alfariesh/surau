"use client";

import type { ReactNode } from "react";

import { useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { Toast } from "@heroui/react";
import { I18nProvider, RouterProvider } from "react-aria-components";

// Tema: terang, gelap, dan kertas sepia (panel Tampilan di halaman baca). Sepia = palet terang
// yang lebih hangat (globals.css `:root.sepia`).
const THEMES = ["light", "dark", "sepia"];

// Provider klien Surau. Root layout tidak membaca headers() (S04 langkah 3), jadi locale
// ditetapkan statis ke id-ID dan tema dipulihkan next-themes di klien.
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <ThemeProvider
      disableTransitionOnChange
      enableSystem
      attribute="class"
      defaultTheme="system"
      themes={THEMES}
    >
      <I18nProvider locale="id-ID">
        <RouterProvider navigate={(href) => router.push(href)}>
          {children}
          {/* Notifikasi singkat (mis. "Sitasi disalin" di pembaca kitab). */}
          <Toast.Provider placement="bottom" />
        </RouterProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
