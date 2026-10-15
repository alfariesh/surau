import type { ReactNode } from "react";

// Satu-satunya jalan merender blok teks Arab di Surau (.claude/rules/teks-arab.md, bagian Tampilan).
// Teksnya selalu berasal dari data (DB, atau file sumber yang dicatat asal-usulnya), tidak pernah
// dari keluaran model. Gaya tipografi ada di kelas `.arabic-text` (globals.css): font Naskh pilihan,
// ±1,25× teks UI, line-height ±2 untuk harakat, rata awal, tanpa letter-spacing dan justify.

export interface ArabicTextProps {
  children: ReactNode;
  /** Elemen pembungkus. Default `p`; pakai `blockquote` untuk kutipan, `div` bila berisi blok lain. */
  as?: "p" | "div" | "blockquote";
  className?: string;
  id?: string;
}

export function ArabicText({ as: Tag = "p", children, className, id }: ArabicTextProps) {
  return (
    <Tag
      className={className ? `arabic-text ${className}` : "arabic-text"}
      dir="rtl"
      id={id}
      lang="ar"
    >
      {children}
    </Tag>
  );
}
