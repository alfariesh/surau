import type { ReactNode } from "react";

// Satu-satunya jalan merender blok teks Arab di Surau (.claude/rules/teks-arab.md, bagian Tampilan).
// Teksnya selalu berasal dari data (DB, atau file sumber yang dicatat asal-usulnya), tidak pernah
// dari keluaran model. Gaya tipografi ada di kelas `.arabic-text` (globals.css): font Naskh pilihan,
// ±1,25× teks UI, line-height ±2 untuk harakat, rata awal, tanpa letter-spacing dan justify.

export interface ArabicTextProps {
  children: ReactNode;
  /**
   * Elemen pembungkus. Default `p`; `blockquote` untuk kutipan, `div` bila berisi blok lain,
   * `h2`/`h3` untuk judul bagian kitab yang berasal dari teks sumber (pembaca S09).
   */
  as?: "p" | "div" | "blockquote" | "h2" | "h3";
  className?: string;
  id?: string;
  /**
   * Skala ukuran huruf Arab (satu-satunya cara mengubahnya; jangan memberi kelas `text-*`):
   * `md` (bawaan) 1,25× teks di sekitarnya, `lg` 1,45×, `display` ukuran tetap untuk judul besar
   * (30 px, 36 px di layar lebar). Pembaca tetap mengikuti `--reader-scale`.
   */
  size?: "md" | "lg" | "display";
}

export function ArabicText({ as: Tag = "p", children, className, id, size }: ArabicTextProps) {
  return (
    <Tag
      className={className ? `arabic-text ${className}` : "arabic-text"}
      data-size={size === "md" ? undefined : size}
      dir="rtl"
      id={id}
      lang="ar"
    >
      {children}
    </Tag>
  );
}
