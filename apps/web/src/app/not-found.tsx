import type { Metadata } from "next";

import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";

import { SurauShell } from "../components/shell/surau-shell";
import { id } from "../i18n/id";

const t = id.notFound;

export const metadata: Metadata = {
  title: t.pageTitle,
};

// not-found di root tidak dibungkus layout grup (app), jadi kerangka dipasang di sini.
export default function NotFound() {
  return (
    <SurauShell>
      <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 pt-16 pb-16 sm:px-6">
        <p className="text-muted text-sm font-medium tabular-nums">404</p>
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">{t.heading}</h1>
        <p className="text-muted text-base">{t.body}</p>
        <NextLink className={buttonVariants({ variant: "primary" })} href="/">
          {t.back}
        </NextLink>
      </div>
    </SurauShell>
  );
}
