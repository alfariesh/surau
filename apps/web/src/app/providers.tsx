"use client";

import type { ReactNode } from "react";

import { useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { I18nProvider, RouterProvider } from "react-aria-components";

// Provider klien Surau. Root layout tidak membaca headers() (S04 langkah 3), jadi locale
// ditetapkan statis ke id-ID dan tema dipulihkan next-themes di klien.
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <ThemeProvider disableTransitionOnChange enableSystem attribute="class" defaultTheme="system">
      <I18nProvider locale="id-ID">
        <RouterProvider navigate={(href) => router.push(href)}>{children}</RouterProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
