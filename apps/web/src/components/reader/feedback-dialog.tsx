"use client";

import type { FormEvent } from "react";

import type { PassageRef } from "./reader-context";

import {
  Alert,
  Button,
  Description,
  Input,
  Label,
  Modal,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import { useState } from "react";

import { common as commonText } from "../../i18n/id/common";
import { reader as readerText } from "../../i18n/id/reader";
import { FEEDBACK_KINDS, FEEDBACK_MESSAGE_MAX } from "../../lib/feedback";

const t = readerText;

type Status = "idle" | "sending" | "sent" | "error_rate" | "error_invalid" | "error";

// Formulir "Laporkan kesalahan teks" (S09 langkah 8). Dikirim ke route handler /api/feedback
// (tanpa Server Actions, ADR-003). Tanpa data pribadi: hanya jenis, pesan, path halaman, dan ID
// paragraf. Kolom `website` adalah honeypot (disembunyikan dari manusia dan pembaca layar).
export function FeedbackDialog({
  isOpen,
  onOpenChange,
  pagePath,
  passage,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pagePath: string;
  passage: PassageRef | null;
}) {
  // Status mulai dari "idle" setiap kali dialog dibuka: ReaderProvider memberi `key` baru.
  const [status, setStatus] = useState<Status>("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("sending");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: form.get("kind"),
          message: form.get("message"),
          path: pagePath,
          passage_id: passage?.id ?? null,
          website: form.get("website") ?? "",
        }),
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
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container placement="center" size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{t.reportHeading}</Modal.Heading>
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
                  {commonText.close}
                </Button>
              </Modal.Footer>
            </>
          ) : (
            <form className="contents" onSubmit={submit}>
              <Modal.Body className="flex flex-col gap-4">
                <Typography type="body-sm" color="muted">
                  {t.reportLead}
                </Typography>
                {passage ? (
                  <Typography type="body-sm">{t.reportPassageNote(passage.label)}</Typography>
                ) : null}
                <RadioGroup isRequired defaultValue="text" name="kind">
                  <Label>{t.reportKind}</Label>
                  {FEEDBACK_KINDS.map((kind) => (
                    <Radio key={kind} value={kind}>
                      <Radio.Content>
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        {t.reportKinds[kind]}
                      </Radio.Content>
                    </Radio>
                  ))}
                </RadioGroup>
                <TextField isRequired maxLength={FEEDBACK_MESSAGE_MAX} name="message">
                  <Label>{t.reportMessage}</Label>
                  <TextArea rows={4} />
                  <Description>{t.reportMessageHint}</Description>
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
  );
}
