"use client";

import type { NavItem } from "./nav-items";

import { Sidebar } from "@heroui-pro/react";
import NextLink from "next/link";

import { id } from "../../i18n/id";

import { SurauMark } from "./logo";
import { NAV_ITEMS } from "./nav-items";

// "Tentang" ada di bawah sidebar (footer), menu lainnya di atas.
const MAIN_ITEMS = NAV_ITEMS.filter((item) => item.id !== "about");
const FOOTER_ITEMS = NAV_ITEMS.filter((item) => item.id === "about");

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
      textValue={isSoon ? `${item.label} (${id.nav.soon})` : item.label}
      tooltip={isSoon ? `${item.label} · ${id.nav.soonHint}` : item.label}
    >
      <Sidebar.MenuIcon>
        <Icon className="size-4" />
      </Sidebar.MenuIcon>
      <Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
      {isSoon ? <Sidebar.MenuChip>{id.nav.soon}</Sidebar.MenuChip> : null}
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
              {id.brand.name}
            </span>
          </span>
        </NextLink>
      </Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.Menu aria-label={id.nav.label}>
            {MAIN_ITEMS.map((item) => (
              <NavMenuItem key={item.id} activeId={activeId} idPrefix={idPrefix} item={item} />
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
      </Sidebar.Content>
      <Sidebar.Footer>
        <Sidebar.Menu aria-label={id.nav.about}>
          {FOOTER_ITEMS.map((item) => (
            <NavMenuItem key={item.id} activeId={activeId} idPrefix={idPrefix} item={item} />
          ))}
        </Sidebar.Menu>
        <div className="flex flex-col gap-1 px-2 pb-2 text-xs" data-sidebar="label">
          <NextLink className="link text-xs" href="/lisensi">
            {id.footer.license}
          </NextLink>
        </div>
      </Sidebar.Footer>
    </>
  );
}
