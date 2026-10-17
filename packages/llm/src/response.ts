// Membaca respons Messages API / hasil batch. Haiku 5.5 berpikir adaptif secara default, jadi blok
// pertama bisa `thinking`: teks diambil dari blok bertipe `text`, tidak pernah dari content[0].
import type { Message } from "@anthropic-ai/sdk/resources/messages";

export type StopProblem = "refusal" | "max_tokens" | "no_text";

export function messageText(message: Pick<Message, "content">): string {
  return message.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("")
    .trim();
}

/** Masalah berhenti yang membuat keluaran tidak boleh dipakai; `null` = selesai normal. */
export function stopProblem(message: Pick<Message, "content" | "stop_reason">): StopProblem | null {
  if (message.stop_reason === "refusal") return "refusal";
  if (message.stop_reason === "max_tokens") return "max_tokens";
  return messageText(message) === "" ? "no_text" : null;
}
