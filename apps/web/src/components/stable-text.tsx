import type { ReactNode } from "react";

/**
 * Teks yang berganti menurut mode baca tanpa mengubah tinggi (X11): semua varian ditumpuk di satu
 * sel grid (`.stable-stack`) dan hanya yang aktif terlihat, jadi tingginya = varian tertinggi. Di
 * lembar ponsel tepi atas ikut tinggi isinya, dan di petunjuk mode baca (X13) teks kitab di bawahnya
 * tidak bergeser; tanpa ini pilihan mode bergeser di bawah jari.
 */
export function StableText({
  active,
  variants,
}: {
  active: string;
  variants: Readonly<Record<string, ReactNode>>;
}) {
  return (
    <div className="stable-stack">
      {Object.entries(variants).map(([key, node]) => (
        <div
          key={key}
          aria-hidden={key === active ? undefined : true}
          className={key === active ? undefined : "invisible"}
        >
          {node}
        </div>
      ))}
    </div>
  );
}
