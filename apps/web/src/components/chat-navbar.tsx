"use client";

import type { ChatActivePage } from "../data/chat";

import { ArrowRightToSquare, Magnifier } from "@gravity-ui/icons";
import { Button, Kbd, Tooltip } from "@heroui/react";
import { AppLayout, Navbar, Sidebar } from "@heroui-pro/react";

const NAV_TITLES: Record<ChatActivePage["kind"], { title: string; subtitle: string }> = {
  explore: { subtitle: "Starter prompts to explore what this template can do", title: "Explore" },
  library: { subtitle: "Saved prompts, tone presets, and reusable threads", title: "Library" },
  new: { subtitle: "Start a brand new conversation", title: "New Chat" },
  thread: { subtitle: "", title: "" },
};

export interface ChatNavbarProps {
  activePage: ChatActivePage;
  onSearch?: () => void;
}

export function ChatNavbar({ activePage, onSearch }: ChatNavbarProps) {
  const isThread = activePage.kind === "thread";
  const thread = isThread ? activePage.thread : undefined;
  const title = isThread ? (thread?.title ?? "Chat") : NAV_TITLES[activePage.kind].title;
  const subtitle = isThread
    ? thread?.updatedAt
      ? `Updated ${thread.updatedAt}`
      : "Live conversation"
    : NAV_TITLES[activePage.kind].subtitle;

  return (
    <Navbar maxWidth="full">
      <Navbar.Header>
        <AppLayout.MenuToggle />
        <Sidebar.Trigger />
        <div className="flex min-w-0 flex-col">
          <h1 className="text-foreground truncate text-sm font-semibold sm:text-base">{title}</h1>
          {subtitle ? <span className="text-muted truncate text-xs">{subtitle}</span> : null}
        </div>
        <Navbar.Spacer />
        <div className="flex items-center gap-2">
          <Tooltip delay={0}>
            <Button aria-label="Search chats" size="sm" variant="tertiary" onPress={onSearch}>
              <Magnifier className="size-4" />
              <span className="hidden sm:inline">Search</span>
            </Button>
            <Tooltip.Content placement="bottom">
              <div className="flex items-center gap-2 text-xs">
                <span>Search chats</span>
                <Kbd className="text-[10px]">⌘K</Kbd>
              </div>
            </Tooltip.Content>
          </Tooltip>
          {isThread ? (
            <Button className="hidden md:inline-flex" size="sm">
              <ArrowRightToSquare className="size-4" />
              Share
            </Button>
          ) : null}
        </div>
      </Navbar.Header>
    </Navbar>
  );
}
