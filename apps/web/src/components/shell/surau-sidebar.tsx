"use client";

import type { NavItem } from "./nav-items";

import { Chip, Dropdown, Label } from "@heroui/react";
import { Sidebar } from "@heroui-pro/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { brand as brandText } from "../../i18n/id/brand";
import { footer as footerText } from "../../i18n/id/footer";
import { nav as navText } from "../../i18n/id/nav";
import { Copyright, HandHeart, InformationCircle, LockKeyhole } from "../../icons";

import { SurauMark } from "./logo";
import { NAV_ITEMS } from "./nav-items";

// "Tentang" ada di bawah sidebar (footer), menu lainnya di atas.
const MAIN_ITEMS = NAV_ITEMS.filter((item) => item.id !== "about" && item.id !== "mcp");
const MCP_ITEM = NAV_ITEMS.find((item) => item.id === "mcp");
const ABOUT_ITEM = NAV_ITEMS.find((item) => item.id === "about");

// Menu "Seputar Surau" di footer: Tentang + halaman informasi (lisensi, privasi, transparansi).
const HELP_LINKS = [
  { id: "about", icon: InformationCircle, label: navText.about, href: "/tentang" },
  { id: "license", icon: Copyright, label: footerText.license, href: "/lisensi" },
  { id: "privacy", icon: LockKeyhole, label: footerText.privacy, href: "/privasi" },
  { id: "transparency", icon: HandHeart, label: footerText.transparency, href: "/transparansi" },
] as const;

function NavMenuItem({
  item,
  activeId,
  idPrefix,
}: {
  item: NavItem;
  activeId?: string;
  idPrefix: string;
}) {
  const isCurrent = item.id === activeId;
  const Icon = isCurrent ? item.activeIcon : item.icon;
  const isSoon = !item.href;

  return (
    <Sidebar.MenuItem
      href={item.href}
      id={`${idPrefix}${item.id}`}
      isCurrent={isCurrent}
      isDisabled={isSoon}
      textValue={isSoon ? `${item.label} (${navText.soon})` : item.label}
      tooltip={isSoon ? `${item.label} · ${navText.soonHint}` : item.label}
    >
      <Sidebar.MenuIcon>
        <Icon className="size-4" />
      </Sidebar.MenuIcon>
      <Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
      {isSoon ? <Sidebar.MenuChip>{navText.soon}</Sidebar.MenuChip> : null}
      {item.badge ? (
        <Chip color="accent" size="sm" variant="soft">
          {item.badge}
        </Chip>
      ) : null}
    </Sidebar.MenuItem>
  );
}

export function SurauSidebar({ activeId }: { activeId?: NavItem["id"] }) {
  return (
    <>
      <Sidebar>
        <SidebarContents activeId={activeId} />
        <Sidebar.Rail />
      </Sidebar>
      <Sidebar.Mobile>
        <SidebarContents activeId={activeId} idPrefix="mobile-" />
      </Sidebar.Mobile>
    </>
  );
}

function SidebarContents({ activeId, idPrefix = "" }: { activeId?: string; idPrefix?: string }) {
  return (
    <>
      <Sidebar.Header>
        <NextLink
          className="flex items-center gap-3 rounded-xl px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-focus"
          href="/"
        >
          <SurauMark className="size-8 shrink-0" />
          <span className="flex min-w-0 flex-col" data-sidebar="label">
            <span className="text-foreground text-2xl font-bold leading-tight">
              {brandText.name}
            </span>
          </span>
        </NextLink>
      </Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.Menu aria-label={navText.label}>
            {MAIN_ITEMS.map((item) => (
              <NavMenuItem key={item.id} activeId={activeId} idPrefix={idPrefix} item={item} />
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
      </Sidebar.Content>
      <Sidebar.Footer>
        {MCP_ITEM ? (
          <Sidebar.Menu aria-label={MCP_ITEM.label}>
            <NavMenuItem activeId={activeId} idPrefix={idPrefix} item={MCP_ITEM} />
          </Sidebar.Menu>
        ) : null}
        <HelpMenu />
      </Sidebar.Footer>
    </>
  );
}

function HelpMenu() {
  const pathname = usePathname();
  const isCurrent = HELP_LINKS.some(
    (link) => pathname === link.href || pathname?.startsWith(`${link.href}/`),
  );
  const Icon = isCurrent ? ABOUT_ITEM?.activeIcon : ABOUT_ITEM?.icon;
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={navText.help}
        className="sidebar__menu-item"
        data-current={isCurrent || undefined}
      >
        <span className="sidebar__menu-item-content">
          {Icon ? (
            <span className="sidebar__menu-icon">
              <Icon className="size-4" />
            </span>
          ) : null}
          <span className="sidebar__menu-label" data-sidebar="label">
            {navText.help}
          </span>
        </span>
      </Dropdown.Trigger>
      <Dropdown.Popover className="w-56" offset={6} placement="top start">
        <Dropdown.Menu aria-label={navText.help}>
          {HELP_LINKS.map((link) => (
            <Dropdown.Item key={link.id} href={link.href} id={link.id} textValue={link.label}>
              <link.icon className="text-muted size-4 shrink-0" />
              <Label>{link.label}</Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
