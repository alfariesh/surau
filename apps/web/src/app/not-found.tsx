import type { Metadata } from "next";

import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";

import { SurauShell } from "../components/shell/surau-shell";
import { id } from "../i18n/id";
import { PAGE_FRAME } from "../lib/layout";
import { Typography } from "@heroui/react";
import { PageTitle } from "../components/page-title";

const t = id.notFound;

export const metadata: Metadata = {
  title: t.pageTitle,
};

// not-found di root tidak dibungkus layout grup (app), jadi kerangka dipasang di sini.
export default function NotFound() {
  return (
    <SurauShell>
      <div className={`${PAGE_FRAME} flex flex-col items-start gap-4 pt-16 pb-16`}>
        <Typography type="body-sm" color="muted" weight="medium" className="tabular-nums">
          404
        </Typography>
        <PageTitle compactTitle={false}>{t.heading}</PageTitle>
        <Typography color="muted">{t.body}</Typography>
        <NextLink className={buttonVariants({ variant: "primary" })} href="/">
          {t.back}
        </NextLink>
      </div>
    </SurauShell>
  );
}
