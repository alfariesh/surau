"use client";

import { useId, useState } from "react";
import {
  Button,
  Card,
  Chip,
  Description,
  Label,
  NumberField,
  Separator,
  Switch,
  Typography,
} from "@heroui/react";
import { NativeSelect } from "@heroui-pro/react";
import type { FeedbackStatus } from "@surau/db";
import { adminText as t } from "../../i18n/admin";
import type { AdminAction } from "../../lib/admin-action";
import type { AdminOverview } from "../../lib/admin-data";

const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const time = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Typography type="body-xs" color="muted">
        {label}
      </Typography>
      <Typography type="body" className="font-medium tabular-nums">
        {value}
      </Typography>
    </div>
  );
}

function FeedbackStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: FeedbackStatus;
  onChange: (status: FeedbackStatus) => void;
  disabled: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="sr-only">
        {t.feedback.status}
      </Label>
      <NativeSelect className="w-44">
        <NativeSelect.Trigger
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as FeedbackStatus)}
        >
          {(Object.keys(t.feedback.statuses) as FeedbackStatus[]).map((s) => (
            <NativeSelect.Option value={s} key={s}>
              {t.feedback.statuses[s]}
            </NativeSelect.Option>
          ))}
          <NativeSelect.Indicator />
        </NativeSelect.Trigger>
      </NativeSelect>
    </div>
  );
}

export function AdminClient({
  initial,
  routeEnabled,
}: {
  initial: AdminOverview;
  routeEnabled: boolean;
}) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cap, setCap] = useState(initial.settings.budget_monthly_usd);
  const [anon, setAnon] = useState(initial.settings.quota_anon_daily);
  const [ip, setIp] = useState(initial.settings.quota_ip_daily);

  async function send(action: AdminAction) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action),
      });
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as AdminOverview);
      setMessage(t.saved);
    } catch {
      setMessage(t.failed);
    } finally {
      setBusy(false);
    }
  }

  const b = data.budget;
  return (
    <div className="space-y-6">
      {message ? (
        <output className="block">
          <Typography type="body-sm" color="muted">
            {message}
          </Typography>
        </output>
      ) : null}

      <Card>
        <Card.Header>
          <Card.Title>{t.jawab.heading}</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-3">
          <Switch
            isSelected={data.settings.jawab_enabled}
            isDisabled={busy}
            onChange={(value) => void send({ action: "jawab_enabled", value })}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Label>{t.jawab.toggle}</Label>
            </Switch.Content>
            <Description>{t.jawab.toggleHint}</Description>
          </Switch>
          <Typography type="body-sm" color="muted">
            {routeEnabled ? t.jawab.routeOn : t.jawab.routeOff}
          </Typography>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>{t.budget.heading}</Card.Title>
          <Card.Description>
            {t.budget.period} {b.period} · {t.updated} {time.format(new Date(data.generated_at))}
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label={t.budget.cap} value={money.format(b.cap_usd)} />
            <Stat label={t.budget.spent} value={money.format(b.spent_usd)} />
            <Stat label={t.budget.reserved} value={money.format(b.reserved_usd)} />
            <Stat label={t.budget.used} value={`${b.used_pct}%`} />
            <Stat label={t.budget.questions} value={String(data.questions)} />
          </div>
          {b.warned_at ? (
            <Chip color="warning" variant="soft">
              {t.budget.warned} {time.format(new Date(b.warned_at))}
            </Chip>
          ) : null}
          <div className="space-y-2">
            <Typography type="body-sm" className="font-medium">
              {t.budget.outcomes}
            </Typography>
            {data.outcomes.length === 0 ? (
              <Typography type="body-sm" color="muted">
                {t.budget.none}
              </Typography>
            ) : (
              <ul className="space-y-1">
                {data.outcomes.map((o) => (
                  <li key={o.outcome} className="flex justify-between gap-4">
                    <Typography type="body-sm">
                      {t.budget.outcomeNames[o.outcome] ?? o.outcome} · {o.calls}
                    </Typography>
                    <Typography type="body-sm" className="tabular-nums">
                      {money.format(o.cost_usd)}
                      {o.estimated > 0 ? ` (${o.estimated} ${t.budget.estimated})` : ""}
                    </Typography>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Separator />
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send({ action: "budget", usd: cap });
            }}
          >
            <NumberField
              className="w-44"
              value={cap}
              onChange={(v) => setCap(Number.isFinite(v) ? Math.trunc(v) : 0)}
              minValue={0}
              maxValue={1000}
              formatOptions={{ useGrouping: false }}
            >
              <Label>{t.budget.capLabel}</Label>
              <NumberField.Group>
                <NumberField.Input />
              </NumberField.Group>
            </NumberField>
            <Button type="submit" isDisabled={busy}>
              {t.budget.save}
            </Button>
            <Typography type="body-xs" color="muted" className="basis-full">
              {t.budget.capHint}
            </Typography>
          </form>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>{t.quota.heading}</Card.Title>
          <Card.Description>
            {t.quota.day} {data.quota.day}
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label={t.quota.visitors} value={String(data.quota.anon.subjects)} />
            <Stat label={t.quota.visitorsFull} value={String(data.quota.anon.exhausted)} />
            <Stat label={t.quota.networks} value={String(data.quota.ip.subjects)} />
            <Stat label={t.quota.networksFull} value={String(data.quota.ip.exhausted)} />
          </div>
          <Separator />
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send({ action: "quota", anon, ip });
            }}
          >
            <NumberField
              className="w-44"
              value={anon}
              onChange={(v) => setAnon(Number.isFinite(v) ? Math.trunc(v) : 0)}
              minValue={0}
              maxValue={1000}
              formatOptions={{ useGrouping: false }}
            >
              <Label>{t.quota.anonLabel}</Label>
              <NumberField.Group>
                <NumberField.Input />
              </NumberField.Group>
            </NumberField>
            <NumberField
              className="w-44"
              value={ip}
              onChange={(v) => setIp(Number.isFinite(v) ? Math.trunc(v) : 0)}
              minValue={0}
              maxValue={10_000}
              formatOptions={{ useGrouping: false }}
            >
              <Label>{t.quota.ipLabel}</Label>
              <NumberField.Group>
                <NumberField.Input />
              </NumberField.Group>
            </NumberField>
            <Button type="submit" isDisabled={busy}>
              {t.quota.save}
            </Button>
            <Typography type="body-xs" color="muted" className="basis-full">
              {t.quota.hint}
            </Typography>
          </form>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>{t.feedback.heading}</Card.Title>
          <Card.Description>{t.feedback.retention}</Card.Description>
        </Card.Header>
        <Card.Content>
          {data.feedback.length === 0 ? (
            <Typography type="body-sm" color="muted">
              {t.feedback.empty}
            </Typography>
          ) : (
            <ul className="divide-separator divide-y">
              {data.feedback.map((f) => (
                <li key={f.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip size="sm" variant="soft">
                      {t.feedback.kinds[f.kind]}
                    </Chip>
                    <Typography type="body-xs" color="muted">
                      #{f.id} · {time.format(new Date(f.created_at))}
                    </Typography>
                    {f.path ? (
                      <a className="text-accent text-sm underline" href={f.path}>
                        {t.feedback.open}
                      </a>
                    ) : null}
                  </div>
                  <Typography type="body-sm" className="break-words whitespace-pre-line">
                    {f.message}
                  </Typography>
                  <FeedbackStatusSelect
                    value={f.status}
                    disabled={busy}
                    onChange={(status) =>
                      void send({ action: "feedback_status", id: f.id, status })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
