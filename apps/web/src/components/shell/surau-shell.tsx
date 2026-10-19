"use client";

import type { ReactNode } from "react";

import { AppLayout } from "@heroui-pro/react";
import { usePathname } from "next/navigation";

import { findActiveNavItem } from "./nav-items";
import { NavbarSlotProvider } from "./navbar-slot";
import { SurauNavbar } from "./surau-navbar";
import { SurauSidebar } from "./surau-sidebar";

// Kerangka aplikasi Surau: sidebar (navigasi) + navbar (judul halaman, tema) + konten.
// Navigasi klien lewat RouterProvider di `Providers`, jadi AppLayout tidak butuh `navigate`.
export function SurauShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = findActiveNavItem(pathname);

  return (
    <NavbarSlotProvider>
      <AppLayout
        navbar={<SurauNavbar title={active?.label} />}
        sidebar={<SurauSidebar activeId={active?.id} />}
        sidebarCollapsible="offcanvas"
      >
        {children}
      </AppLayout>
    </NavbarSlotProvider>
  );
}
