import type { JawabStatus } from "./model";

/**
 * Status Jawab untuk UI (halaman Maknaz dan kotak cari Beranda): rute mati (404) = "closed" (UI
 * mengarahkan ke Cari); galat sementara (429/5xx/jaringan) = null (tidak diketahui: komposer tetap
 * aktif, server yang memutuskan).
 */
export async function loadJawabStatus(): Promise<JawabStatus | "closed" | null> {
  try {
    const res = await fetch("/api/jawab", { cache: "no-store" });
    if (res.status === 404) return "closed";
    return res.ok ? ((await res.json()) as JawabStatus) : null;
  } catch {
    return null;
  }
}

/** Alasan Maknaz tidak bisa dipakai sekarang (kunci `errors` di teks Tanya), atau null bila bisa. */
export function jawabUnavailable(status: JawabStatus | "closed" | null): string | null {
  if (status === "closed") return "closed";
  if (status !== null && !status.available) return status.reason ?? "disabled";
  return null;
}
