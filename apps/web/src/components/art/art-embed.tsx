"use client";

import { useEffect, useRef } from "react";

import { useTheme } from "next-themes";

// Ilustrasi interaktif (/aset/*, ADR-054) disematkan lewat iframe sandbox: skrip ilustrasi berjalan di
// origin "null", tidak bisa menyentuh cookie atau DOM Surau. Ilustrasi tanpa kata dan tanpa tombol (situs
// tiga bahasa; maknanya ada di teks kartu), jadi iframe dekoratif: aria-hidden dan tidak bisa difokus.
// Ceritanya diputar sekali saat terlihat; kartu induk ([data-art-card]) yang di-hover atau diketuk memutarnya
// ulang lewat postMessage. Tema situs juga dikirim lewat postMessage (iframe tidak bisa membaca kelas tema
// induk), saat tema berubah dan saat iframe dimuat. color-scheme iframe diwarisi dari <html> (next-themes).
const THEME_PARAM: Record<string, string> = { light: "terang", dark: "gelap", sepia: "sepia" };

// repeat: putar cerita berulang N kali (0 = terus selama terlihat), untuk empty state atau indikator memuat.
export function ArtEmbed({
  className,
  name,
  repeat,
  title,
}: {
  className?: string;
  name: string;
  repeat?: number;
  title: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const { resolvedTheme } = useTheme();
  const theme = THEME_PARAM[resolvedTheme ?? ""] ?? null;

  // targetOrigin "*": origin iframe sandbox memang "null"; isinya hanya nama tema atau perintah putar.
  const post = (message: { tema?: string; putar?: true }) =>
    ref.current?.contentWindow?.postMessage({ type: "surau-aset", ...message }, "*");
  const postTheme = () => {
    if (theme) post({ tema: theme });
  };
  useEffect(postTheme, [theme]);

  useEffect(() => {
    const card = ref.current?.closest("[data-art-card]");
    if (!card) return;
    const play = (event: Event) => {
      if (
        event instanceof PointerEvent &&
        event.type === "pointerenter" &&
        event.pointerType !== "mouse"
      )
        return;
      post({ putar: true });
    };
    card.addEventListener("pointerenter", play);
    card.addEventListener("click", play);
    return () => {
      card.removeEventListener("pointerenter", play);
      card.removeEventListener("click", play);
    };
  }, []);

  return (
    <iframe
      ref={ref}
      aria-hidden="true"
      className={`block aspect-[4/3] w-full border-0 bg-transparent ${className ?? ""}`}
      loading="lazy"
      onLoad={postTheme}
      sandbox="allow-scripts"
      src={`/aset/${name}.html?sematan=1&tombol=0${repeat === undefined ? "" : `&ulang=${repeat}`}`}
      tabIndex={-1}
      title={title}
    />
  );
}
