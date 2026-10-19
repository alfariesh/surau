"use client";

import { useEffect, useRef } from "react";

import { useTheme } from "next-themes";

// Aset ilustrasi interaktif (ADR-054) disematkan lewat iframe sandbox: skrip aset berjalan di origin
// "null", tidak bisa menyentuh cookie atau DOM Surau. Tema situs dikirim lewat postMessage (aset tidak
// bisa membaca kelas tema induk), saat tema berubah dan saat iframe selesai dimuat (mana pun yang lebih
// dulu). Sebelum itu aset mengikuti tema sistem, yang sama dengan bawaan situs (defaultTheme "system").
const TEMA: Record<string, string> = { light: "terang", dark: "gelap", sepia: "sepia" };

export function AsetSemat({
  className,
  nama,
  title,
}: {
  className?: string;
  nama: string;
  title: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const { resolvedTheme } = useTheme();
  const tema = TEMA[resolvedTheme ?? ""] ?? null;

  // targetOrigin "*": origin iframe sandbox memang "null"; isinya hanya nama tema.
  const kirim = () => {
    if (tema) ref.current?.contentWindow?.postMessage({ type: "surau-aset", tema }, "*");
  };
  useEffect(kirim, [tema]);

  return (
    <iframe
      ref={ref}
      className={`block aspect-[4/3] w-full border-0 bg-transparent ${className ?? ""}`}
      loading="lazy"
      onLoad={kirim}
      // color-scheme iframe harus sama dengan isinya; bila beda, browser memberi latar buram (bukan transparan)
      style={tema ? { colorScheme: tema === "gelap" ? "dark" : "light" } : undefined}
      sandbox="allow-scripts"
      src={`/aset/${nama}.html?sematan=1`}
      title={title}
    />
  );
}
