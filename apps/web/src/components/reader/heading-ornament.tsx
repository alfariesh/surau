// Ornamen judul bab (dekorasi, bukan ikon). Bentuk = desain pemilik (Paper, 2026-10-19), dioptimasi:
// viewBox dipotong ke ornamennya saja (asli 83×83), koordinat absolut digeser ke 0,0 dan dibulatkan
// 1 desimal, path sewarna digabung (5 → 2), tanpa ukuran/gaya tetap. Tinta = currentColor (ikut
// tema), emas = --ornament-gold (globals.css). `side="end"` dicerminkan untuk sisi kanan judul.

const INK =
  "M32.1 3.8H12.8C11.3 3.8 10.4 3.3 10 2.8 9.7 2.4 9.2 2.7 9.3 3.1 9.6 3.6 10.7 3.9 12.2 3.9 10.3 4 8.7 5.4 6.8 5.4 5.1 5.4 3.9 4.2 3.9 2.8 3.9 1.8 4.7 1.1 5.5 1.1 6.2 1.1 6.7 1.5 6.7 2.1 6.7 2.4 6.5 2.7 6.3 2.7 6.4 2.4 6.1 2.1 5.8 2.1 5.5 2.1 5.3 2.4 5.3 2.6 5.3 3 5.7 3.2 6.1 3.2 6.7 3.2 7.1 2.7 7.1 2.1 7.1 1.3 6.4 0.8 5.5 0.8 4.5 0.8 3.6 1.6 3.6 2.8 3.6 3.6 3.9 4.3 4.3 4.7 3.7 4.2 2.8 3.9 2.2 3.9 1.6 3.9 1.3 4.2 1.3 4.6 1.3 4.9 1.7 5 1.9 4.7 2 4.4 2.3 4.2 2.7 4.2 3.2 4.2 3.8 4.5 4.4 4.9 5 5.4 5.8 5.7 6.7 5.7 8.8 5.7 10.2 4.2 12.4 4.1 13.8 4 15.3 4 16.6 4H32.1ZM12.1 4.1C10.4 4.2 9.3 5.1 9.3 5.9 9.3 6.4 9.9 6.5 10 6 10 5 11 4.3 12.1 4.1Z";

const GOLD =
  "M3.7 4.2C3.4 3.5 2.8 3 2.3 3 2 3 1.8 3.2 1.8 3.4S2 3.7 2.3 3.7C2.8 3.7 3.2 3.9 3.7 4.2ZM10.2 4.1C8.9 3.9 7.8 4.1 7.8 4.6 7.8 4.8 8 4.9 8.2 4.9 8.8 4.9 9.4 4.3 10.2 4.1ZM33.2 3.3C33.1 3.5 32.8 3.8 32.5 3.9 32.8 4 33.1 4.2 33.2 4.5 33.4 4.2 33.7 4 34 3.9 33.7 3.8 33.4 3.5 33.2 3.3Z";

export function HeadingOrnament({ side }: { side: "start" | "end" }) {
  return (
    <svg
      aria-hidden="true"
      className={`heading-ornament ${side === "end" ? "-scale-x-100" : ""}`}
      focusable="false"
      viewBox="1 0.5 33.4 6.3"
    >
      <path d={INK} fill="currentColor" />
      <path d={GOLD} fill="var(--ornament-gold)" />
    </svg>
  );
}
