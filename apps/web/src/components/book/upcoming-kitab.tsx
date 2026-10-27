"use client";

import type { CSSProperties, FormEvent, ReactNode } from "react";

import type { KitabField, UpcomingKitab } from "../../content/kitab-mendatang";

import { Widget } from "@heroui-pro/react";
import {
  Alert,
  Button,
  Input,
  Label,
  Modal,
  Radio,
  RadioGroup,
  Tag,
  TagGroup,
  TextField,
  Typography,
} from "@heroui/react";
import NextLink from "next/link";
import { useState, useSyncExternalStore } from "react";

import { common as commonText } from "../../i18n/id/common";
import { reader as readerText } from "../../i18n/id/reader";
import { upcoming as t } from "../../i18n/id/upcoming";
import { store, stored } from "../../lib/prefs";
import {
  AlphabetArabic,
  BookA,
  GridView,
  JusticeScale01,
  LegalDocument01,
  Quran01,
  Tasbih,
} from "../../icons";
import { ArabicInline } from "../arabic";
import { FIELD_COVER_COLORS } from "./cover-colors";
import { WorkCover } from "./work-cover";

// Kitab kandidat "Segera hadir" di /kitab (ADR-115): filter bidang (TagGroup), lalu kartu Widget
// seperti kartu Ihya. Mengeklik kartu membuka popup dua pertanyaan pilihan tetap, dikirim ke
// /api/minat-kitab tanpa data pribadi. Kitab yang sudah dipilih diingat hanya di browser ini
// (localStorage), supaya popupnya tidak mengundang suara berulang; server tidak bisa (dan tidak
// berusaha) mengenali pengirim.

const STORAGE_KEY = "surau:minat:v1";
const PURPOSES = ["self_study", "teaching", "research", "other"] as const;
const ARABIC_LEVELS = ["beginner", "with_help", "fluent"] as const;

type Status = "idle" | "sending" | "sent" | "error_rate" | "error" | "error_network";

const VOTED_EVENT = "surau:minat";

// Snapshot = teks mentah localStorage (string stabil), supaya useSyncExternalStore tidak berputar.
function votedRaw(): string {
  return stored(STORAGE_KEY) ?? "[]";
}

function subscribeVoted(onChange: () => void) {
  window.addEventListener(VOTED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(VOTED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function parseVoted(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function markVoted(slug: string) {
  store(STORAGE_KEY, JSON.stringify([...new Set([...parseVoted(votedRaw()), slug])]));
  window.dispatchEvent(new Event(VOTED_EVENT));
}

function authorLine(k: UpcomingKitab): string {
  return k.authors
    .map((a) => (a.death_hijri ? `${a.name} (${readerText.deathHijri(a.death_hijri)})` : a.name))
    .join(" & ");
}

const FIELD_ICON: Record<KitabField, (props: { className?: string }) => ReactNode> = {
  tasawuf: Tasbih,
  quran: Quran01,
  fikih: JusticeScale01,
  ushul: LegalDocument01,
  bahasa: AlphabetArabic,
  istilah: BookA,
};

const ALL = "semua";

export function UpcomingKitabList({ items }: { items: readonly UpcomingKitab[] }) {
  // Server dan hidrasi pertama: belum ada yang dipilih; lalu dibaca dari localStorage.
  const voted = parseVoted(useSyncExternalStore(subscribeVoted, votedRaw, () => "[]"));
  const [open, setOpen] = useState<UpcomingKitab | null>(null);
  const [field, setField] = useState<KitabField | typeof ALL>(ALL);
  const fields = [...new Set(items.map((k) => k.field))];
  const shown = field === ALL ? items : items.filter((k) => k.field === field);

  return (
    <>
      <TagGroup
        aria-label={t.filterLabel}
        className="kategori-filter"
        disallowEmptySelection
        selectedKeys={new Set([field])}
        selectionMode="single"
        size="lg"
        onSelectionChange={(keys) => {
          const [key] = keys === "all" ? [ALL] : [...keys];
          setField((key as KitabField | typeof ALL | undefined) ?? ALL);
        }}
      >
        <TagGroup.List>
          <Tag id={ALL} textValue={t.all}>
            <GridView />
            {t.all}
          </Tag>
          {fields.map((f) => {
            const Icon = FIELD_ICON[f];
            return (
              <Tag
                key={f}
                id={f}
                style={{ "--kategori": `var(--kategori-${f})` } as CSSProperties}
                textValue={t.fields[f]}
              >
                <Icon />
                {t.fields[f]}
              </Tag>
            );
          })}
        </TagGroup.List>
      </TagGroup>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((k) => {
          const Icon = FIELD_ICON[k.field];
          const single = k.authors.length === 1 ? k.authors[0] : undefined;
          return (
            <li key={k.slug} className="flex">
              {/* Seluruh kartu bisa diklik lewat tombol judul (after:inset-0), sama dengan kartu
                  Ihya di atasnya; sampul miring saat kartu di-hover atau tombolnya difokus. */}
              <Widget className="book-trigger relative w-full has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-[var(--focus)]">
                <Widget.Header className="justify-center px-6 pt-8 pb-6">
                  <WorkCover
                    color={FIELD_COVER_COLORS[k.field]}
                    width={{ xs: 132, sm: 140, md: 156 }}
                    work={{
                      slug: `mendatang-${k.slug}`,
                      title_ar: k.title_ar,
                      title_id: k.title_id,
                      author: {
                        name_ar: "",
                        name_id: k.authors.map((a) => a.name).join(" & "),
                        death_hijri: single?.death_hijri ?? null,
                      },
                    }}
                  />
                </Widget.Header>
                <Widget.Content className="flex flex-1 flex-col gap-1">
                  <Typography
                    type="body-xs"
                    className="mb-2 flex items-center gap-1.5 font-medium"
                    style={{ color: `var(--kategori-${k.field})` }}
                  >
                    <Icon className="size-3.5" />
                    {t.fields[k.field]}
                  </Typography>
                  <Typography.Heading level={3} className="text-lg">
                    <button
                      aria-haspopup="dialog"
                      className="cursor-pointer text-start outline-none after:absolute after:inset-0 after:rounded-[inherit]"
                      type="button"
                      onClick={() => setOpen(k)}
                    >
                      {k.title_id}
                    </button>
                  </Typography.Heading>
                  <Typography type="body-sm" color="muted">
                    {authorLine(k)}
                  </Typography>
                  <Typography type="body-sm" className="mt-2 text-pretty">
                    {k.blurb}
                  </Typography>
                </Widget.Content>
              </Widget>
            </li>
          );
        })}
      </ul>
      {open ? (
        <MinatDialog
          key={open.slug}
          alreadyVoted={voted.includes(open.slug)}
          kitab={open}
          onDone={() => markVoted(open.slug)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setOpen(null);
          }}
        />
      ) : null}
    </>
  );
}

function MinatDialog({
  alreadyVoted,
  kitab,
  onDone,
  onOpenChange,
}: {
  alreadyVoted: boolean;
  kitab: UpcomingKitab;
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  // Kitab yang sudah dipilih dari browser ini langsung menampilkan ucapan terima kasih.
  const [status, setStatus] = useState<Status>(alreadyVoted ? "sent" : "idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("sending");
    try {
      const response = await fetch("/api/minat-kitab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidate: kitab.slug,
          purpose: form.get("purpose"),
          arabic: form.get("arabic"),
          website: form.get("website") ?? "",
        }),
      });
      if (response.ok) {
        setStatus("sent");
        onDone();
      } else setStatus(response.status === 429 ? "error_rate" : "error");
    } catch {
      setStatus("error_network");
    }
  }

  const error =
    status === "error_rate"
      ? t.errorRate
      : status === "error"
        ? t.errorGeneric
        : status === "error_network"
          ? t.errorNetwork
          : null;

  return (
    <Modal.Backdrop isOpen onOpenChange={onOpenChange}>
      <Modal.Container placement="center" size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header className="flex flex-col items-start gap-1">
            <Modal.Heading>{kitab.title_id}</Modal.Heading>
            <ArabicInline className="text-muted">{kitab.title_ar}</ArabicInline>
          </Modal.Header>
          {status === "sent" ? (
            <>
              <Modal.Body>
                <Alert status="success">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>{alreadyVoted ? t.alreadyVoted : t.thanks}</Alert.Title>
                  </Alert.Content>
                </Alert>
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close" variant="secondary">
                  {commonText.close}
                </Button>
              </Modal.Footer>
            </>
          ) : (
            <form className="contents" onSubmit={submit}>
              <Modal.Body className="flex flex-col gap-5">
                <Typography type="body-sm" color="muted">
                  {t.dialogLead}
                </Typography>
                <RadioGroup isRequired name="purpose" variant="secondary">
                  <Label>{t.purposeLabel}</Label>
                  {PURPOSES.map((p) => (
                    <Radio key={p} value={p}>
                      <Radio.Content>
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        {t.purposes[p]}
                      </Radio.Content>
                    </Radio>
                  ))}
                </RadioGroup>
                <RadioGroup isRequired name="arabic" variant="secondary">
                  <Label>{t.arabicLabel}</Label>
                  {ARABIC_LEVELS.map((a) => (
                    <Radio key={a} value={a}>
                      <Radio.Content>
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        {t.arabicLevels[a]}
                      </Radio.Content>
                    </Radio>
                  ))}
                </RadioGroup>
                {/* Honeypot: manusia tidak melihatnya; bot pengisi formulir biasanya mengisinya. */}
                <div
                  aria-hidden="true"
                  className="absolute -left-[9999px] h-px w-px overflow-hidden"
                >
                  <TextField name="website">
                    <Label>{t.honeypot}</Label>
                    <Input autoComplete="off" tabIndex={-1} />
                  </TextField>
                </div>
                <Typography type="body-xs" color="muted">
                  {t.privacy}{" "}
                  <NextLink className="underline" href="/privasi">
                    {t.privacyLink}
                  </NextLink>
                </Typography>
                {error ? (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>{error}</Alert.Title>
                    </Alert.Content>
                  </Alert>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close" variant="secondary">
                  {t.cancel}
                </Button>
                <Button isPending={status === "sending"} type="submit">
                  {status === "sending" ? t.sending : t.submit}
                </Button>
              </Modal.Footer>
            </form>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
