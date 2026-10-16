"use client";

import type { NavItem } from "./nav-items";

import { Sidebar } from "@heroui-pro/react";
import NextLink from "next/link";

import { id, SOURCE_URL } from "../../i18n/id";

import { SurauMark } from "./logo";
import { NAV_ITEMS } from "./nav-items";

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
            <span className="text-foreground text-base font-semibold leading-tight">
              {id.brand.name}
            </span>
            <span className="text-muted text-xs leading-tight">{id.brand.tagline}</span>
          </span>
        </NextLink>
      </Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.Menu aria-label={id.nav.label}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSoon = !item.href;

              return (
                <Sidebar.MenuItem
                  key={item.id}
                  href={item.href}
                  id={`${idPrefix}${item.id}`}
                  isCurrent={item.id === activeId}
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
            })}
          </Sidebar.Menu>
        </Sidebar.Group>
      </Sidebar.Content>
      <Sidebar.Footer>
        <div className="flex flex-col gap-1 px-2 pb-2 text-xs" data-sidebar="label">
          <span className="text-muted">{id.footer.nonprofit}</span>
          <NextLink className="link text-xs" href="/lisensi">
            {id.footer.license}
          </NextLink>
          <a className="link text-xs" href={SOURCE_URL} rel="noopener noreferrer" target="_blank">
            {id.footer.source}
            <span className="sr-only"> {id.common.newTab}</span>
          </a>
        </div>
      </Sidebar.Footer>
    </>
  );
}
