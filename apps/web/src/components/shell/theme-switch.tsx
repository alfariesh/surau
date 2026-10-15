"use client";

import { Moon, Sun } from "@gravity-ui/icons";
import { Button, Tooltip } from "@heroui/react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { id } from "../../i18n/id";

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
  const label = isDark ? id.theme.toLight : id.theme.toDark;

  return (
    <Tooltip delay={300}>
      <Button
        isIconOnly
        aria-label={label}
        size="sm"
        variant="ghost"
        onPress={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
      <Tooltip.Content placement="bottom">{label}</Tooltip.Content>
    </Tooltip>
  );
}
