"use client";

import { Moon02, Sun01 } from "../../icons";
import { Button, Tooltip } from "@heroui/react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { theme as themeText } from "../../i18n/id/theme";

const noopSubscribe = () => () => {};

// Tema baru diketahui setelah hidrasi (next-themes membaca localStorage/preferensi sistem),
// jadi sebelum itu tombol dirender netral supaya HTML server dan klien sama.
export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const isDark = isMounted && resolvedTheme === "dark";
  const label = isDark ? themeText.toLight : themeText.toDark;

  return (
    <Tooltip delay={300}>
      <Button
        isIconOnly
        aria-label={label}
        size="sm"
        variant="ghost"
        onPress={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? <Sun01 className="size-4" /> : <Moon02 className="size-4" />}
      </Button>
      <Tooltip.Content placement="bottom">{label}</Tooltip.Content>
    </Tooltip>
  );
}
