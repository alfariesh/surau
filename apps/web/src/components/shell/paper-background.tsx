"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

// Latar serat kertas, sama dengan portofolio pemilik (PaperFibre/Backdrop): PaperTexture statis
// dengan roughness dan fiber 0,3, tanpa lipatan/kerutan/bercak. Kanvas tetap di belakang seluruh
// isi (globals.css `.paper-fibre`), dicampur supaya hanya seratnya yang tampak: terang = multiply
// di atas kertas putih, gelap = screen di atas hitam. Modul shader dimuat setelah halaman selesai
// dimuat (tanpa SSR) dan merender sekali; sebelum itu (atau tanpa WebGL2) latar tetap polos.
const PaperTexture = dynamic(() => import("./paper-texture").then((m) => m.PaperTexture), {
  ssr: false,
});

const FIBRE = {
  // Warna portofolio (#FFFFFF / #C9CBC1), bayangan digeser ke krem hangat Zaitun.
  light: { paper: "#FFFFFF", shadow: "#CDC8BB" },
  dark: { paper: "#000000", shadow: "#3A362E" },
} as const;

function subscribeLoad(onChange: () => void) {
  window.addEventListener("load", onChange, { once: true });
  return () => window.removeEventListener("load", onChange);
}

const isLoaded = () => document.readyState === "complete";

export function PaperBackground() {
  const { resolvedTheme } = useTheme();
  const ready = useSyncExternalStore(subscribeLoad, isLoaded, () => false);
  if (!ready || resolvedTheme === undefined) return null;
  const dark = resolvedTheme === "dark";
  const c = dark ? FIBRE.dark : FIBRE.light;

  return (
    <div aria-hidden="true" className="paper-fibre" data-theme={dark ? "dark" : "light"}>
      <PaperTexture
        colorBack={c.paper}
        colorPaper={c.paper}
        colorShadow={c.shadow}
        crumples={0}
        distortion={0}
        drops={0}
        fiber={0.3}
        fit="cover"
        folds={0}
        maxPixelCount={1920 * 1080}
        minPixelRatio={1}
        roughness={0.3}
        scale={1}
        speed={0}
        style={{ width: "100%", height: "100%" }}
        wrinkles={0}
      />
    </div>
  );
}
