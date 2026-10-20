"use client";

import { RouteError } from "../../../components/route-error";
import { id } from "../../../i18n/id";

const t = id.reader;

// Galat tak terduga di rute /kitab/* (D1 gagal, baris rusak). Alamat yang tidak ada sudah menjadi
// 404 lewat notFound(); yang sampai ke sini adalah gangguan.
export default function KitabError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <RouteError
      body={t.errorBody}
      error={error}
      heading={t.errorHeading}
      retry={retry}
      retryLabel={t.errorRetry}
    />
  );
}
