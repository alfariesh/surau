import type { ReactNode } from "react";

// Potongan Arab di tengah kalimat Indonesia. `<bdi>` mengisolasi arah teks supaya tanda baca
// dan angka di sekitarnya tidak ikut terbalik; halaman tetap LTR.

export interface ArabicInlineProps {
  children: ReactNode;
  className?: string;
}

export function ArabicInline({ children, className }: ArabicInlineProps) {
  return (
    <bdi className={className ? `arabic-inline ${className}` : "arabic-inline"} dir="rtl" lang="ar">
      {children}
    </bdi>
  );
}
