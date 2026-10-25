import { Card, Typography } from "@heroui/react";

import { home as t } from "../i18n/id/home";

import { ArtEmbed } from "./art/art-embed";

// Tiga kartu prinsip (ADR-057) dengan ilustrasi masing-masing; dipakai Beranda (/home) dan landing
// page (/), supaya keduanya selalu memuat janji yang sama.
export function PrinciplesGrid() {
  return (
    <ol className="grid w-full gap-4 sm:grid-cols-3">
      {t.principles.map((p, index) => (
        <li key={p.title} className="flex" data-art-card>
          <Card className="w-full gap-0 p-2 shadow-none">
            {/* Ilustrasi per prinsip: tanpa kata, dekoratif; hover/ketuk kartu memutar ulang.
                Panel bertepi lembut supaya ruang kosong ilustrasi terbaca sebagai bingkai. */}
            <div className="bg-surface-secondary overflow-hidden rounded-xl">
              <ArtEmbed name={p.art} title={t.principleArtTitle} />
            </div>
            <Card.Header className="gap-1.5 px-3 pt-4 pb-3">
              <Typography className="font-medium tabular-nums" color="muted" type="body-xs">
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className="sr-only">{t.principleNumber(index + 1)}</span>
              </Typography>
              <Card.Title className="text-base">{p.title}</Card.Title>
              <Card.Description className="text-pretty">{p.body}</Card.Description>
            </Card.Header>
          </Card>
        </li>
      ))}
    </ol>
  );
}
