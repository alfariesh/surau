import type { ComponentType, SVGProps } from "react";

import { BookOpen01, InformationCircle, HelpCircle, Home01, Search01 } from "../../icons";

import { id } from "../../i18n/id";

export type NavItemId = "home" | "books" | "search" | "ask" | "mcp" | "about";

export interface NavItem {
  id: NavItemId;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Tanpa `href` berarti fitur belum tersedia (label "segera"). */
  href?: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: "home", label: id.nav.home, icon: Home01, href: "/" },
  { id: "books", label: id.nav.books, icon: BookOpen01, href: "/kitab" },
  { id: "search", label: id.nav.search, icon: Search01, href: "/cari" },
  { id: "ask", label: id.nav.ask, icon: HelpCircle },
  { id: "mcp", label: id.nav.mcp, icon: BookOpen01, href: "/mcp" },
  { id: "about", label: id.nav.about, icon: InformationCircle, href: "/tentang" },
];

export function findActiveNavItem(pathname: string | null): NavItem | undefined {
  if (!pathname) return undefined;

  return NAV_ITEMS.find(
    (item) =>
      item.href &&
      (pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`))),
  );
}
