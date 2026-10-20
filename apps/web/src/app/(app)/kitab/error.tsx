"use client";

import { Button, Typography } from "@heroui/react";
import { useEffect } from "react";

import { id } from "../../../i18n/id";
import { PageTitle } from "../../../components/page-title";

const t = id.reader;

// Galat tak terduga di rute /kitab/* (D1 gagal, baris rusak). Alamat yang tidak ada sudah menjadi
// 404 lewat notFound(); yang sampai ke sini adalah gangguan. Galat server sudah dicatat Next di log
// Worker; di klien cukup konsol browser (pesan galat server disamarkan Next, hanya `digest`).
export default function KitabError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 pt-16 pb-16 sm:px-6">
      <PageTitle>{t.errorHeading}</PageTitle>
      <Typography color="muted">{t.errorBody}</Typography>
      <Button onPress={() => retry()}>{t.errorRetry}</Button>
    </div>
  );
}
