import { Card, Chip, Typography } from "@heroui/react";

import { adminText } from "../../i18n/admin";
import { upcoming } from "../../i18n/id/upcoming";
import type { MinatSummary } from "../../lib/minat-data";

// /admin · minat kitab kandidat (ADR-115). Hanya angka agregat; tanpa interaksi.
const t = adminText.minat;

function Breakdown({ label, parts }: { label: string; parts: [string, number][] }) {
  const shown = parts.filter(([, n]) => n > 0);
  if (shown.length === 0) return null;
  return (
    <Typography type="body-xs" color="muted">
      {label}: {shown.map(([name, n]) => `${name} ${n}`).join(" · ")}
    </Typography>
  );
}

export function AdminMinat({ rows }: { rows: MinatSummary[] }) {
  const any = rows.some((r) => r.total > 0);
  return (
    <Card>
      <Card.Header>
        <Card.Title>{t.heading}</Card.Title>
        <Card.Description>{t.intro}</Card.Description>
      </Card.Header>
      <Card.Content>
        {any ? null : (
          <Typography type="body-sm" color="muted">
            {t.empty}
          </Typography>
        )}
        <ol className="space-y-3">
          {rows.map((r) => (
            <li key={r.slug} className="border-separator space-y-1 border-b pb-3 last:border-b-0">
              <div className="flex flex-wrap items-center gap-2">
                <Typography type="body-sm" weight="medium">
                  {r.title_id}
                </Typography>
                <Chip size="sm" variant="soft" color={r.total > 0 ? "accent" : "default"}>
                  {t.total(r.total)}
                </Chip>
              </div>
              <Breakdown
                label={t.purposes}
                parts={Object.entries(r.purposes).map(([k, n]) => [
                  upcoming.purposes[k as keyof typeof upcoming.purposes],
                  n,
                ])}
              />
              <Breakdown
                label={t.arabic}
                parts={Object.entries(r.arabic).map(([k, n]) => [
                  upcoming.arabicLevels[k as keyof typeof upcoming.arabicLevels],
                  n,
                ])}
              />
            </li>
          ))}
        </ol>
      </Card.Content>
    </Card>
  );
}
