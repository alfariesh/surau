import type { ReactNode } from "react";

import { LandingFooter } from "../../components/landing/landing-footer";
import { LandingNavbar } from "../../components/landing/landing-navbar";
import { SOURCE_URL } from "../../i18n/id";

// Landing page publik di / (ADR-096): tanpa sidebar aplikasi; navbar sendiri + kaki halaman.
// Halaman aplikasi (Beranda di /home, Kitab, Cari, …) tetap memakai SurauShell di grup (app).
export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <LandingNavbar />
      <main id="isi-halaman">{children}</main>
      <LandingFooter sourceUrl={SOURCE_URL} />
    </>
  );
}
