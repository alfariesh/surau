import type { ComponentType, SVGProps } from "react";

import { BookOpen, CircleInfo, CircleQuestion, House, Magnifier } from "@gravity-ui/icons";

import { id } from "../../i18n/id";

export type NavItemId = "home" | "books" | "search" | "ask" | "about";

export interface NavItem {
  id: NavItemId;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Tanpa `href` berarti fitur belum tersedia (label "segera"). */
  href?: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: "home", label: id.nav.home, icon: House, href: "/" },
  { id: "books", label: id.nav.books, icon: BookOpen, href: "/kitab" },
  { id: "search", label: id.nav.search, icon: Magnifier },
  { id: "ask", label: id.nav.ask, icon: CircleQuestion },
  { id: "about", label: id.nav.about, icon: CircleInfo, href: "/tentang" },
];

export function findActiveNavItem(pathname: string | null): NavItem | undefined {
  if (!pathname) return undefined;

  return NAV_ITEMS.find(
    (item) =>
      item.href &&
      (pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`))),
  );
}
