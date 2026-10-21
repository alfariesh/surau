// Kartu dalam satu daftar (gaya daftar Material 3): tanpa bayangan, sudut dalam md, sudut luar 2xl.
export function groupedCardClass(index: number, count: number): string {
  return [
    "rounded-md shadow-none",
    index === 0 ? "rounded-t-2xl" : "",
    index === count - 1 ? "rounded-b-2xl" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
