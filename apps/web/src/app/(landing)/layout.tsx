import type { ReactNode } from "react";

import { LandingFooter } from "../../components/landing/landing-footer";

// Landing page publik di / (ADR-096): tanpa sidebar dan tanpa menu header, seperti template buku.
// Navigasinya menu bagian bernomor yang menempel (SectionNav, di halaman). Halaman aplikasi (Beranda di
// /home, Kitab, Cari, …) tetap memakai SurauShell di grup (app).
export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main id="isi-halaman">{children}</main>
      <LandingFooter />
    </>
  );
}
