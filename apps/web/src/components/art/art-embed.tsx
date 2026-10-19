"use client";

import { useEffect, useRef } from "react";

import { useTheme } from "next-themes";

// Ilustrasi interaktif (/aset/*, ADR-054) disematkan lewat iframe sandbox: skrip ilustrasi berjalan di
// origin "null", tidak bisa menyentuh cookie atau DOM Surau. Tema situs dikirim lewat postMessage (iframe
// tidak bisa membaca kelas tema induk), saat tema berubah dan saat iframe selesai dimuat (mana pun yang
// lebih dulu). Sebelum itu ilustrasi mengikuti tema sistem, sama dengan bawaan situs (defaultTheme
// "system"). color-scheme elemen iframe diwarisi dari <html> (next-themes), jadi latarnya tetap transparan.
const THEME_PARAM: Record<string, string> = { light: "terang", dark: "gelap", sepia: "sepia" };

export function ArtEmbed({
  className,
  name,
  title,
}: {
  className?: string;
  name: string;
  title: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const { resolvedTheme } = useTheme();
  const theme = THEME_PARAM[resolvedTheme ?? ""] ?? null;

  // targetOrigin "*": origin iframe sandbox memang "null"; isinya hanya nama tema.
  const postTheme = () => {
    if (theme) ref.current?.contentWindow?.postMessage({ type: "surau-aset", tema: theme }, "*");
  };
  useEffect(postTheme, [theme]);

  return (
    <iframe
      ref={ref}
      className={`block aspect-[4/3] w-full border-0 bg-transparent ${className ?? ""}`}
      loading="lazy"
      onLoad={postTheme}
      sandbox="allow-scripts"
      src={`/aset/${name}.html?sematan=1`}
      title={title}
    />
  );
}
