"use client";

import type { FormEvent } from "react";

import {
  Alert,
  Button,
  Description,
  Input,
  Label,
  Modal,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import { useState } from "react";

import { intisari as intisariText } from "../../i18n/id/intisari";
import { FEEDBACK_MESSAGE_MAX } from "../../lib/feedback";

const t = intisariText;

type Status = "idle" | "sending" | "sent" | "error_rate" | "error_invalid" | "error";

/**
 * Body POST /api/feedback untuk laporan satu gagasan, atau `null` bila keterangan kosong (spasi saja):
 * awalan nomor gagasan membuat pesan tidak pernah kosong, jadi `min(1)` server tidak menolaknya.
 */
export function pointReportBody(
  pointNo: number,
  message: unknown,
  pagePath: string,
  passageId: number | null,
  website: unknown = "",
) {
  const body = typeof message === "string" ? message.trim() : "";
  if (body === "") return null;
  return {
    kind: "other" as const,
    message: `${t.reportPrefix(pointNo)}${body}`,
    path: pagePath,
    passage_id: passageId,
    website: typeof website === "string" ? website : "",
  };
}

/**
 * Tombol "Laporkan" per gagasan Intisari (X24 langkah 6). Dikirim ke /api/feedback yang sama dengan
 * pembaca (tanpa migrasi DB app): jenis `other`, path halaman Intisari, `passage_id` = paragraf
 * dasar pertama gagasan (pengelola bisa membuka teksnya), dan pesan berawalan nomor gagasan. Tanpa
 * data pribadi; kolom `website` = honeypot.
 */
export function PointReport({
  pagePath,
  pointNo,
  passageId,
}: {
  pagePath: string;
  pointNo: number;
  passageId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const prefix = t.reportPrefix(pointNo);
  const max = FEEDBACK_MESSAGE_MAX - prefix.length;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = pointReportBody(
      pointNo,
      form.get("message"),
      pagePath,
      passageId,
      form.get("website"),
    );
    if (payload === null) {
      setStatus("error_invalid");
      return;
    }
    setStatus("sending");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) setStatus("sent");
      else if (response.status === 429) setStatus("error_rate");
      else if (response.status === 400 || response.status === 413) setStatus("error_invalid");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  const error =
    status === "error_rate"
      ? t.reportErrorRate
      : status === "error_invalid"
        ? t.reportErrorInvalid
        : status === "error"
          ? t.reportErrorGeneric
          : null;

  return (
    <>
      <Button
        aria-label={t.reportButtonLabel(pointNo)}
        className="self-start"
        size="sm"
        variant="ghost"
        onPress={() => {
          setStatus("idle");
          setOpen(true);
        }}
      >
        {t.reportButton}
      </Button>
      <Modal.Backdrop isOpen={open} onOpenChange={setOpen}>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t.reportHeading(pointNo)}</Modal.Heading>
            </Modal.Header>
            {status === "sent" ? (
              <>
                <Modal.Body>
                  <Alert status="success">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>{t.reportThanks}</Alert.Title>
                    </Alert.Content>
                  </Alert>
                </Modal.Body>
                <Modal.Footer>
                  <Button slot="close" variant="secondary">
                    {t.reportClose}
                  </Button>
                </Modal.Footer>
              </>
            ) : (
              <form className="contents" onSubmit={submit}>
                <Modal.Body className="flex flex-col gap-4">
                  <Typography color="muted" type="body-sm">
                    {t.reportLead}
                  </Typography>
                  <TextField isRequired maxLength={max} name="message">
                    <Label>{t.reportMessage}</Label>
                    <TextArea rows={4} />
                    <Description>{t.reportMessageHint(max)}</Description>
                  </TextField>
                  {/* Honeypot: manusia tidak melihatnya; bot pengisi formulir biasanya mengisinya. */}
                  <div
                    aria-hidden="true"
                    className="absolute -left-[9999px] h-px w-px overflow-hidden"
                  >
                    <TextField name="website">
                      <Label>{t.reportHoneypot}</Label>
                      <Input autoComplete="off" tabIndex={-1} />
                    </TextField>
                  </div>
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
                    {t.reportCancel}
                  </Button>
                  <Button isPending={status === "sending"} type="submit">
                    {status === "sending" ? t.reportSending : t.reportSubmit}
                  </Button>
                </Modal.Footer>
              </form>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
