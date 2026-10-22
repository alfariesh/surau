"use client";

import { AppLayout, Navbar, Sidebar } from "@heroui-pro/react";

import { nav as navText } from "../../i18n/id/nav";
import { PAGE_FRAME } from "../../lib/layout";

import { NavbarSlotTarget } from "./navbar-slot";
import { SearchPalette } from "./search-palette";
import { ThemeSwitch } from "./theme-switch";

export function SurauNavbar({ title }: { title?: string }) {
  return (
    <Navbar maxWidth="full">
      {/* Header sejajar dengan isi halaman (PAGE_FRAME), bukan selebar layar. */}
      <Navbar.Header className={PAGE_FRAME}>
        <AppLayout.MenuToggle aria-label={navText.openMenu} />
        <Sidebar.Trigger aria-label={navText.toggleSidebar} />
        {/* Judul halaman dan slot judul ringkas (pembaca) bertumpuk di sel yang sama: saat slot
            terisi dan tampil, judul memudar ke atas dan judul ringkas masuk dari bawah. */}
        <div className="navbar-title-stack grid min-w-0 flex-1 items-center">
          {title ? (
            <span className="navbar-page-title text-foreground truncate text-sm font-medium sm:text-base">
              {title}
            </span>
          ) : null}
          <NavbarSlotTarget className="navbar-slot min-w-0" />
        </div>
        <SearchPalette />
        <ThemeSwitch />
      </Navbar.Header>
    </Navbar>
  );
}
