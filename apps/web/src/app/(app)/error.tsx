"use client";

import { RouteError } from "../../components/route-error";
import { error as errorText } from "../../i18n/id/error";

const t = errorText;

// Galat tak terduga di rute grup (app) selain /kitab (yang punya error.tsx sendiri): /cari dan
// /tinjau membaca D1 tanpa try/catch. Boundary ini ada di dalam layout grup, jadi kerangka Surau
// (kepala, navigasi, kaki) tetap tampil.
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <RouteError
      body={t.body}
      error={error}
      heading={t.heading}
      retry={retry}
      retryLabel={t.retry}
    />
  );
}
