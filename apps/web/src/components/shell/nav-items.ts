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
} from "../../icons";

import { nav as navText } from "../../i18n/id/nav";

export type NavItemId = "home" | "books" | "ask" | "mcp" | "about";

export interface NavItem {
  id: NavItemId;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Ikon saat menu aktif (gaya duotone). */
  activeIcon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Tanpa `href` berarti fitur belum tersedia (label "segera"). */
  href?: string;
  /** Halaman lain yang tetap menyorot menu ini (mis. hasil /cari di bawah Beranda). */
  also?: readonly string[];
  /** Lencana kecil di kanan label. */
  badge?: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  // Cari tidak punya menu sendiri (ADR-088): kotak cari ada di Beranda, /cari = halaman hasilnya.
  {
    id: "home",
    label: navText.home,
    icon: Home01,
    activeIcon: Home01Duotone,
    href: "/",
    also: ["/cari"],
  },
  {
    id: "books",
    label: navText.books,
    icon: BookOpen01,
    activeIcon: BookOpen01Duotone,
    href: "/kitab",
  },

  { id: "ask", label: navText.ask, icon: HelpCircle, activeIcon: HelpCircleDuotone },
  {
    id: "mcp",
    label: navText.mcp,
    icon: BookOpen01,
    activeIcon: BookOpen01Duotone,
    href: "/mcp",
    badge: navText.mcpBadge,
  },
  {
    id: "about",
    label: navText.about,
    icon: InformationCircle,
    activeIcon: InformationCircleDuotone,
    href: "/tentang",
  },
];

const matches = (pathname: string, href: string) =>
  pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

/** Menu sidebar yang disorot untuk alamat ini (termasuk `also`). */
export function findActiveNavItem(pathname: string | null): NavItem | undefined {
  if (!pathname) return undefined;
  return NAV_ITEMS.find(
    (item) =>
      item.href && (matches(pathname, item.href) || item.also?.some((p) => matches(pathname, p))),
  );
}

/** Judul halaman di navbar: label menu, kecuali halaman tanpa menu sendiri (/cari = "Cari"). */
export function navTitle(pathname: string | null): string | undefined {
  if (pathname && matches(pathname, "/cari")) return navText.search;
  return findActiveNavItem(pathname)?.label;
}
