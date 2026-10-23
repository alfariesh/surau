"use client";

import { AppLayout, Navbar, Sidebar } from "@heroui-pro/react";

import { nav as navText } from "../../i18n/id/nav";
import { PAGE_FRAME } from "../../lib/layout";

import { HeaderMenu } from "./header-menu";
import { NavbarSlotTarget } from "./navbar-slot";
import { SearchPalette } from "./search-palette";

export function SurauNavbar({ title }: { title?: string }) {
  return (
    <Navbar maxWidth="full">
      {/* Header sejajar dengan isi halaman (PAGE_FRAME), bukan selebar layar. */}
      <Navbar.Header className={PAGE_FRAME}>
        <AppLayout.MenuToggle aria-label={navText.openMenu} />
        <Sidebar.Trigger aria-label={navText.toggleSidebar} />
        {/* Judul menu dan slot judul ringkas (judul halaman, atau progres di pembaca) bertumpuk
            di sel yang sama: saat slot terisi dan tampil, judul menu memudar ke atas dan judul
            ringkas masuk dari bawah. */}
        <div className="navbar-title-stack grid min-w-0 flex-1 items-center">
          {title ? (
            <span className="navbar-page-title text-foreground truncate text-sm font-medium sm:text-base">
              {title}
            </span>
          ) : null}
          <NavbarSlotTarget className="navbar-slot min-w-0" />
        </div>
        <div className="-me-1.5 flex shrink-0 items-center gap-1">
          <SearchPalette />
          <HeaderMenu />
        </div>
      </Navbar.Header>
    </Navbar>
  );
}
