"use client";

import { Button, Typography } from "@heroui/react";
import { useEffect } from "react";

import { PageTitle } from "./page-title";

// Isi error boundary rute (error.tsx). Galat server sudah dicatat Next di log Worker; di klien cukup
// konsol browser (pesan galat server disamarkan Next, hanya `digest`).
export function RouteError({
  error,
  retry,
  heading,
  body,
  retryLabel,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  heading: string;
  body: string;
  retryLabel: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 pt-16 pb-16 sm:px-6">
      <PageTitle>{heading}</PageTitle>
      <Typography color="muted">{body}</Typography>
      <Button onPress={() => retry()}>{retryLabel}</Button>
    </div>
  );
}
