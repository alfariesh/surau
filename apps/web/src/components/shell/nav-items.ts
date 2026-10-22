import type { ComponentType, SVGProps } from "react";

import {
  BookOpen01,
  BookOpen01Duotone,
  HelpCircle,
  HelpCircleDuotone,
  Home01,
  Home01Duotone,
  InformationCircle,
  InformationCircleDuotone,
  Search01,
  Search01Duotone,
} from "../../icons";

import { nav as navText } from "../../i18n/id/nav";

export type NavItemId = "home" | "books" | "search" | "ask" | "mcp" | "about";

export interface NavItem {
  id: NavItemId;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Ikon saat menu aktif (gaya duotone). */
  activeIcon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Tanpa `href` berarti fitur belum tersedia (label "segera"). */
  href?: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: "home", label: navText.home, icon: Home01, activeIcon: Home01Duotone, href: "/" },
  {
    id: "books",
    label: navText.books,
    icon: BookOpen01,
    activeIcon: BookOpen01Duotone,
    href: "/kitab",
  },
  {
    id: "search",
    label: navText.search,
    icon: Search01,
    activeIcon: Search01Duotone,
    href: "/cari",
  },
  { id: "ask", label: navText.ask, icon: HelpCircle, activeIcon: HelpCircleDuotone },
  { id: "mcp", label: navText.mcp, icon: BookOpen01, activeIcon: BookOpen01Duotone, href: "/mcp" },
  {
    id: "about",
    label: navText.about,
    icon: InformationCircle,
    activeIcon: InformationCircleDuotone,
    href: "/tentang",
  },
];

export function findActiveNavItem(pathname: string | null): NavItem | undefined {
  if (!pathname) return undefined;

  return NAV_ITEMS.find(
    (item) =>
      item.href &&
      (pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`))),
  );
}
