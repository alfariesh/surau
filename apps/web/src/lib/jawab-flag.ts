// Saklar tampilan Maknaz di kotak cari (Beranda, /cari): sama dengan saklar rute /api/jawab (mati di
// produksi sampai `/rilis 4`, menyala di Preview dan `next dev`). Server saja.
export function jawabRouteOn(env: { JAWAB_ROUTE_ENABLED?: string }): boolean {
  return env.JAWAB_ROUTE_ENABLED === "1" || process.env.NODE_ENV === "development";
}
