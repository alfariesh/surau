import type { CSSProperties, ReactNode } from "react";

// Sampul buku 3D (meniru Geist Book, vercel.com/geist/book): miring dan membuka sedikit saat
// di-hover/fokus, dengan tebal halaman dan sampul belakang. Murni CSS (book.css), jadi aman di
// Server Component. Tambahan Surau: `direction="rtl"` membalik punggung buku ke kanan seperti kitab
// Arab, tekstur kertas dari noise SVG (tanpa gambar luar), dan gerak mati bila pengguna memilih
// "kurangi gerakan".
//
// Sampul adalah hiasan: bila Book dibungkus tautan, beri tautan itu nama aksesibel sendiri dan
// tampilkan judul di heading terpisah, supaya pembaca layar tidak membacanya dua kali.

export type BookWidth = number | { xs?: number; sm: number; md?: number; lg?: number };

export interface BookProps {
  /** Judul di sampul. Teks Arab wajib lewat ArabicInline/ArabicText (judul dari DB). */
  title: ReactNode;
  /** Baris kecil di bawah judul, mis. judul Latin dan pengarang. */
  subtitle?: ReactNode;
  /** `stripe`: blok warna di atas + badan kertas. `simple`: seluruh sampul satu warna. */
  variant?: "stripe" | "simple";
  /** Warna sampul (token CSS, mis. `var(--accent)`); tanpa ini sampul abu-abu netral. */
  color?: string;
  /** Warna teks judul (berguna untuk `simple` berwarna gelap). */
  textColor?: string;
  /** Ikon kecil di kaki sampul. */
  icon?: ReactNode;
  /** Isi blok warna (`stripe`), mis. pola. Dekoratif. */
  illustration?: ReactNode;
  /** Lebar dalam px; objek = per ukuran layar (xs ≤400, sm ≤600, md ≤960, lg >960). */
  width?: BookWidth;
  /** Tekstur kertas/kain di sampul. */
  textured?: boolean;
  /** `rtl`: punggung buku di kanan dan membuka ke kiri (kitab Arab). */
  direction?: "ltr" | "rtl";
  /** Isi punggung buku (terlihat saat buku berdiri di rak, mis. BookRing). */
  spine?: ReactNode;
  className?: string;
}

const DEFAULT_WIDTH = 196;

function widthVars(width: BookWidth): Record<string, number> {
  if (typeof width === "number") return { "--book-width": width };
  const vars: Record<string, number> = {};
  for (const size of ["xs", "sm", "md", "lg"] as const) {
    const value = width[size];
    if (value !== undefined) vars[`--${size}-book-width`] = value;
  }
  return vars;
}

export function Book({
  title,
  subtitle,
  variant = "stripe",
  color,
  textColor,
  icon,
  illustration,
  width = DEFAULT_WIDTH,
  textured = false,
  direction = "ltr",
  spine,
  className,
}: BookProps) {
  const responsive = typeof width !== "number";
  const coverStyle = {
    ...(color ? { "--book-color": color } : {}),
    ...(textColor ? { "--book-text-color": textColor } : {}),
  } as CSSProperties;

  return (
    <div
      className={className ? `book ${className}` : "book"}
      data-dir={direction}
      data-responsive={responsive || undefined}
      style={widthVars(width) as CSSProperties}
    >
      <div
        className="book__rotate"
        data-color={color ? true : undefined}
        data-variant={variant}
        style={coverStyle}
      >
        <div className="book__cover">
          {variant === "stripe" ? (
            <div aria-hidden="true" className="book__stripe">
              {illustration ? <div className="book__illustration">{illustration}</div> : null}
              <div className="book__bind" />
            </div>
          ) : null}
          <div className="book__body">
            <div aria-hidden="true" className="book__bind" />
            <div className="book__content" dir={direction}>
              <div className="book__heading">
                <span className="book__title">{title}</span>
                {subtitle ? <span className="book__subtitle">{subtitle}</span> : null}
              </div>
              {icon ? <span className="book__icon">{icon}</span> : null}
            </div>
          </div>
          {textured ? <div aria-hidden="true" className="book__texture" /> : null}
        </div>
        {spine ? (
          <>
            <div aria-hidden="true" className="book__spine">
              <div className="book__spine-content">{spine}</div>
            </div>
            <div aria-hidden="true" className="book__head" />
            <div aria-hidden="true" className="book__tail" />
          </>
        ) : null}
        <div aria-hidden="true" className="book__pages" />
        <div aria-hidden="true" className="book__back" />
      </div>
    </div>
  );
}

/**
 * Pola bintang delapan (khatam) untuk blok warna sampul, digambar sebagai SVG berulang. Warnanya
 * mengikuti `currentColor` dengan opasitas rendah, jadi cocok di atas warna sampul apa pun.
 */
export function BookPattern({ id = "book-pattern" }: { id?: string }) {
  return (
    <svg aria-hidden="true" className="book-pattern" focusable="false">
      <defs>
        <pattern height="40" id={id} patternUnits="userSpaceOnUse" width="40">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M20 6 L24.1 15.9 L34 20 L24.1 24.1 L20 34 L15.9 24.1 L6 20 L15.9 15.9 Z" />
            <rect height="17" transform="rotate(45 20 20)" width="17" x="11.5" y="11.5" />
            <rect height="17" width="17" x="11.5" y="11.5" />
            <path d="M0 0 L6 6 M40 0 L34 6 M0 40 L6 34 M40 40 L34 34" />
          </g>
        </pattern>
      </defs>
      <rect fill={`url(#${id})`} height="100%" width="100%" />
    </svg>
  );
}
