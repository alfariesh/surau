"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";

import { Segment } from "@heroui-pro/react";
import { Button, Popover, Separator, Tooltip, Typography } from "@heroui/react";
import { useTheme } from "next-themes";
import {
  createContext,
  use,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Computer, Moon02, MoreVertical, Sun01 } from "../../icons";
import { nav as navText } from "../../i18n/id/nav";
import { readMode as readModeText } from "../../i18n/id/readMode";
import { theme as themeText } from "../../i18n/id/theme";
import { ReadModeSegment } from "../read-mode-segment";

// Menu ⋮ di navbar: pilihan tema (Terang/Gelap/Sistem), mode baca (X11, hanya di halaman yang
// teksnya terpengaruh), dan aksi tambahan milik halaman yang sedang tampil (mis. pembaca
// mendaftarkan "Tampilan"). Halaman mendaftarkan aksinya lewat `useHeaderMenuAction` dan mode baca
// lewat `useHeaderMenuReadMode`, jadi navbar tidak perlu tahu halaman apa yang sedang dibuka.

export interface HeaderMenuAction {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  onPress: () => void;
}

const ActionsContext = createContext<{
  actions: readonly HeaderMenuAction[];
  setActions: (update: (prev: readonly HeaderMenuAction[]) => readonly HeaderMenuAction[]) => void;
  /** Jumlah komponen terpasang yang meminta pilihan mode baca di menu. */
  readModeHosts: number;
  setReadModeHosts: (update: (prev: number) => number) => void;
} | null>(null);

export function HeaderMenuProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<readonly HeaderMenuAction[]>([]);
  const [readModeHosts, setReadModeHosts] = useState(0);
  return (
    <ActionsContext value={{ actions, setActions, readModeHosts, setReadModeHosts }}>
      {children}
    </ActionsContext>
  );
}

/**
 * Tampilkan pilihan mode baca di menu ⋮ selama komponen pemanggil terpasang (halaman yang teksnya
 * ikut mode baca: pembaca, daftar isi karya, Cari).
 */
export function useHeaderMenuReadMode() {
  const setHosts = use(ActionsContext)?.setReadModeHosts;
  useEffect(() => {
    if (setHosts === undefined) return;
    setHosts((n) => n + 1);
    return () => setHosts((n) => n - 1);
  }, [setHosts]);
}

/** Versi komponen `useHeaderMenuReadMode` untuk halaman server. */
export function HeaderMenuReadMode() {
  useHeaderMenuReadMode();
  return null;
}

/** Tambahkan satu aksi ke menu ⋮ selama komponen pemanggil terpasang. */
export function useHeaderMenuAction(action: HeaderMenuAction) {
  const setActions = use(ActionsContext)?.setActions;
  // Aksi dibaca lewat ref supaya pendaftaran tidak diulang tiap render (onPress berubah identitas).
  const latest = useRef(action);
  useEffect(() => {
    latest.current = action;
  });
  const { label, icon } = action;

  useEffect(() => {
    if (setActions === undefined) return;
    const entry: HeaderMenuAction = { label, icon, onPress: () => latest.current.onPress() };
    setActions((prev) => [...prev, entry]);
    return () => setActions((prev) => prev.filter((a) => a !== entry));
  }, [setActions, label, icon]);
}

const THEME_KEYS = ["light", "dark", "system"] as const;
const THEME_ICONS = { light: Sun01, dark: Moon02, system: Computer } as const;
type ThemeKey = (typeof THEME_KEYS)[number];

const noopSubscribe = () => () => {};

export function HeaderMenu() {
  const context = use(ActionsContext);
  const actions = context?.actions ?? [];
  const showReadMode = (context?.readModeHosts ?? 0) > 0;
  const [isOpen, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const labelId = useId();
  const readModeId = useId();
  // Tema baru diketahui setelah hidrasi; sebelum itu tidak ada pilihan yang tersorot. Kertas
  // sepia (panel Tampilan pembaca) bukan salah satu pilihan di sini, jadi tidak ada yang tersorot.
  const isMounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const selected = isMounted && THEME_KEYS.includes(theme as ThemeKey) ? (theme as ThemeKey) : null;

  return (
    <Popover isOpen={isOpen} onOpenChange={setOpen}>
      <Tooltip delay={300}>
        <Button isIconOnly aria-label={navText.more} size="sm" variant="ghost">
          <MoreVertical className="size-4" />
        </Button>
        <Tooltip.Content placement="bottom">{navText.more}</Tooltip.Content>
      </Tooltip>
      <Popover.Content className="w-64" placement="bottom end">
        <Popover.Dialog aria-label={navText.more} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Typography color="muted" id={labelId} type="body-xs">
              {themeText.label}
            </Typography>
            <Segment
              aria-labelledby={labelId}
              className="w-full"
              selectedKey={selected}
              size="sm"
              onSelectionChange={(key) => setTheme(String(key))}
            >
              {THEME_KEYS.map((key) => (
                <Segment.Item
                  key={key}
                  aria-label={themeText.options[key]}
                  className="flex-1"
                  id={key}
                >
                  {(() => {
                    const Icon = THEME_ICONS[key];
                    return <Icon className="size-4" />;
                  })()}
                </Segment.Item>
              ))}
            </Segment>
          </div>
          {showReadMode ? (
            <div className="flex flex-col gap-2">
              <Typography color="muted" id={readModeId} type="body-xs">
                {readModeText.label}
              </Typography>
              <ReadModeSegment labelId={readModeId} />
            </div>
          ) : null}
          {actions.length > 0 ? (
            <>
              <Separator />
              <div className="-mx-1 flex flex-col">
                {actions.map(({ label, icon: Icon, onPress }) => (
                  <Button
                    key={label}
                    className="justify-start"
                    size="sm"
                    variant="ghost"
                    onPress={() => {
                      setOpen(false);
                      // Satu frame sesudah popover menutup (fokus sudah kembali ke ⋮), supaya
                      // panel yang dibuka aksi mengembalikan fokus ke ⋮ saat ditutup.
                      requestAnimationFrame(onPress);
                    }}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </>
          ) : null}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
