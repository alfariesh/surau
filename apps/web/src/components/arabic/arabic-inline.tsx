import type { ReactNode } from "react";

// Potongan Arab di tengah kalimat Indonesia. `<bdi>` mengisolasi arah teks supaya tanda baca
// dan angka di sekitarnya tidak ikut terbalik; halaman tetap LTR.

export interface ArabicInlineProps {
  children: ReactNode;
  className?: string;
  /** Skala ukuran (lihat ArabicText): `md` bawaan 1,15×, `lg` 1,3×, `display` 30/36 px. */
  size?: "md" | "lg" | "display";
}

export function ArabicInline({ children, className, size }: ArabicInlineProps) {
  return (
    <bdi
      className={className ? `arabic-inline ${className}` : "arabic-inline"}
      data-size={size === "md" ? undefined : size}
      dir="rtl"
      lang="ar"
    >
      {children}
    </bdi>
  );
}
