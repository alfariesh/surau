"use client";

import type { ChatNavItemId, ChatThread } from "../data/chat";
import type { ReactNode } from "react";

import { AppLayout } from "@heroui-pro/react";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import {
  CHAT_NAV_ITEMS,
  CHAT_THREADS,
  DEFAULT_CHAT_THREAD_ID,
  resolveChatActivePage,
} from "../data/chat";

import { ChatNavbar } from "./chat-navbar";
import { ChatSearchDialog } from "./chat-search-dialog";
import { ChatSidebar } from "./chat-sidebar";

interface ChatNavbarWithPathnameProps {
  basePath: string;
  onSearch?: () => void;
}

interface ChatSidebarWithPathnameProps {
  basePath: string;
  disableNavigation: boolean;
  onAction: (id: ChatNavItemId) => void;
}

function getDefaultPathname(basePath: string) {
  return `${basePath}/${DEFAULT_CHAT_THREAD_ID}`;
}

function ChatNavbarWithPathname({ basePath, onSearch }: ChatNavbarWithPathnameProps) {
  const pathname = usePathname();

  return <ChatNavbar activePage={resolveChatActivePage(pathname, basePath)} onSearch={onSearch} />;
}

function ChatSidebarWithPathname({
  basePath,
  disableNavigation,
  onAction,
}: ChatSidebarWithPathnameProps) {
  const pathname = usePathname();

  return (
    <ChatSidebar
      basePath={basePath}
      disableNavigation={disableNavigation}
      pathname={pathname ?? getDefaultPathname(basePath)}
      threads={CHAT_THREADS}
      onAction={onAction}
    />
  );
}

export interface ChatShellProps {
  children: ReactNode;
  basePath?: string;
  disableNavigation?: boolean;
}

export function ChatShell({ basePath = "", children, disableNavigation = false }: ChatShellProps) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const defaultPathname = getDefaultPathname(basePath);
  const defaultActivePage = resolveChatActivePage(defaultPathname, basePath);
  const handleSearch = useCallback(() => setIsSearchOpen(true), []);
  const onSearch = disableNavigation ? undefined : handleSearch;

  const navigate = useCallback(
    (href: string) => {
      if (disableNavigation) return;
      router.push(basePath + href);
    },
    [router, basePath, disableNavigation],
  );

  const handleNavAction = useCallback(
    (id: ChatNavItemId) => {
      if (disableNavigation) return;
      const item = CHAT_NAV_ITEMS.find((entry) => entry.id === id);

      if (item?.href) router.push(basePath + item.href);
    },
    [router, basePath, disableNavigation],
  );

  const handleThreadSelect = useCallback(
    (thread: ChatThread) => {
      setIsSearchOpen(false);
      if (!disableNavigation) router.push(`${basePath}/${thread.id}`);
    },
    [router, basePath, disableNavigation],
  );

  useEffect(() => {
    if (disableNavigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
      const metaPressed = isMac ? event.metaKey : event.ctrlKey;

      if (metaPressed && (event.key === "k" || event.key === "K")) {
        event.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disableNavigation]);

  return (
    <AppLayout
      navigate={navigate}
      sidebarCollapsible="offcanvas"
      navbar={
        <Suspense fallback={<ChatNavbar activePage={defaultActivePage} onSearch={onSearch} />}>
          <ChatNavbarWithPathname basePath={basePath} onSearch={onSearch} />
        </Suspense>
      }
      sidebar={
        <Suspense
          fallback={
            <ChatSidebar
              basePath={basePath}
              disableNavigation={disableNavigation}
              pathname={defaultPathname}
              threads={CHAT_THREADS}
              onAction={handleNavAction}
            />
          }
        >
          <ChatSidebarWithPathname
            basePath={basePath}
            disableNavigation={disableNavigation}
            onAction={handleNavAction}
          />
        </Suspense>
      }
    >
      {children}
      <ChatSearchDialog
        isOpen={isSearchOpen}
        threads={CHAT_THREADS}
        onOpenChange={setIsSearchOpen}
        onSelect={handleThreadSelect}
      />
    </AppLayout>
  );
}
