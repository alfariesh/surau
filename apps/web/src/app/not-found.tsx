import type { Metadata } from "next";

import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";

import { SurauShell } from "../components/shell/surau-shell";
import { id } from "../i18n/id";
import { PAGE_FRAME } from "../lib/layout";

const t = id.notFound;

export const metadata: Metadata = {
  title: t.pageTitle,
};

// not-found di root tidak dibungkus layout grup (app), jadi kerangka dipasang di sini.
export default function NotFound() {
  return (
    <SurauShell>
      <div className={`${PAGE_FRAME} flex flex-col items-start gap-4 pt-16 pb-16`}>
        <p className="text-muted text-sm font-medium tabular-nums">404</p>
        <h1 className="text-foreground text-[2rem] leading-[1.12] font-semibold tracking-tight sm:text-[2.75rem] lg:text-5xl">
          {t.heading}
        </h1>
        <p className="text-muted text-base">{t.body}</p>
        <NextLink className={buttonVariants({ variant: "primary" })} href="/">
          {t.back}
        </NextLink>
      </div>
    </SurauShell>
  );
}
