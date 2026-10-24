"use client";

import { usePathname } from "next/navigation";

import { navTitle } from "./nav-items";
import { NavbarSlot } from "./navbar-slot";
import { useUnderNavbar } from "./use-under-navbar";

/**
 * Judul ringkas halaman di navbar: saat judul besar (`[data-page-title]`) tergulir ke balik navbar,
 * judul menu (mis. "Kitab") bergeser keluar dan judul halaman (mis. "Ihya' 'Ulum ad-Din") masuk,
 * dengan transisi yang sama seperti pembaca. Tidak tampil bila sama dengan judul menu.
 */
export function CompactTitle({ title }: { title: string }) {
  const visible = useUnderNavbar("[data-page-title]");
  const menuTitle = navTitle(usePathname());
  if (title === menuTitle) return null;

  return (
    <NavbarSlot>
      <span
        aria-hidden={visible ? undefined : true}
        className="navbar-compact text-foreground block truncate text-sm font-medium sm:text-base"
        data-visible={visible}
      >
        {title}
      </span>
    </NavbarSlot>
  );
}
