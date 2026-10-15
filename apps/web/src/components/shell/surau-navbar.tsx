"use client";

import { AppLayout, Navbar, Sidebar } from "@heroui-pro/react";

import { id } from "../../i18n/id";

import { ThemeSwitch } from "./theme-switch";

export function SurauNavbar({ title }: { title?: string }) {
  return (
    <Navbar maxWidth="full">
      <Navbar.Header>
        <AppLayout.MenuToggle aria-label={id.nav.openMenu} />
        <Sidebar.Trigger aria-label={id.nav.toggleSidebar} />
        {title ? (
          <span className="text-foreground truncate text-sm font-medium sm:text-base">{title}</span>
        ) : null}
        <Navbar.Spacer />
        <ThemeSwitch />
      </Navbar.Header>
    </Navbar>
  );
}
