import type { Metadata } from "next";
import { headers } from "next/headers";
import { Typography } from "@heroui/react";
import { AdminClient } from "../../../components/admin/admin-client";
import { PageTitle } from "../../../components/page-title";
import { adminText as t } from "../../../i18n/admin";
import { adminOverview } from "../../../lib/admin-data";
import { getEnv } from "../../../lib/cloudflare";
import { adminIdentity } from "../../../lib/review-auth";

// /admin (S20, ADR-065): hanya pemilik. Cloudflare Access `Surau Admin` (T-14) menahan di tepi, dan
// JWT diverifikasi lagi di sini dengan AUD admin (gagal tertutup di semua host, tanpa bypass dev).
export const metadata: Metadata = { title: t.title, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const env = await getEnv();
  const identity = await adminIdentity((await headers()).get("cf-access-jwt-assertion"), env);
  if (!identity)
    return (
      <section className="mx-auto max-w-xl space-y-4 px-4 py-12">
        <Typography.Heading level={1} className="text-2xl">
          {t.denied}
        </Typography.Heading>
        <Typography>{t.deniedBody}</Typography>
        <a className="text-accent underline" href="https://surau.org/admin">
          {t.login}
        </a>
      </section>
    );
  const overview = await adminOverview(env.APP_DB);
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <Typography type="body-sm" className="text-accent">
          {t.eyebrow}
        </Typography>
        <PageTitle>{t.title}</PageTitle>
        <Typography color="muted">{t.intro}</Typography>
      </header>
      <AdminClient initial={overview} routeEnabled={env.JAWAB_ROUTE_ENABLED === "1"} />
    </div>
  );
}
