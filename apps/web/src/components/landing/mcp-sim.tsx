"use client";

import { useRef } from "react";

import { Chip, Typography } from "@heroui/react";

import { Tick02 } from "../../icons";
import { landingDemo as t } from "../../i18n/id/landing";

import { useStory } from "./use-story";

const STEPS = [400, 700, 600, 600, 700] as const;

// Simulasi percakapan asisten AI pengguna yang memakai tool MCP Surau (ADR-096). Tanpa panggilan API:
// nama tool sama dengan server MCP publik (search_text, read_page, verify_quote); alamat cetak dari
// data kutipan supaya tidak bisa melenceng dari kutipannya.
export function McpSim({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { step } = useStory(ref, STEPS);
  const tools = t.mcpTools(label);
  return (
    <div
      ref={ref}
      className="landing-gradient relative flex min-h-[26rem] items-center justify-center overflow-hidden rounded-[2rem] px-4 py-10 sm:px-8"
    >
      <div className="flex w-full max-w-md flex-col gap-3">
        {step >= 1 ? (
          <div className="bg-background/60 text-foreground self-end rounded-3xl rounded-br-md px-4 py-3">
            <Typography type="body-sm">{t.mcpUser}</Typography>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          {tools.slice(0, Math.max(0, step - 1)).map((tool) => (
            <div
              key={tool.name}
              className="bg-background/60 flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs sm:text-sm"
            >
              <Tick02 className="text-accent size-4" />
              <span className="text-muted">{t.mcpTool}</span>
              <code className="text-foreground font-mono">{tool.name}</code>
              <span className="text-muted">· {tool.detail}</span>
            </div>
          ))}
        </div>
        {step >= STEPS.length ? (
          <div className="bg-background/60 flex flex-col gap-2 rounded-3xl rounded-tl-md px-4 py-3">
            <Chip className="self-start" size="sm" variant="soft">
              {t.mcpAssistant}
            </Chip>
            <Typography type="body-sm">{t.mcpAnswer(label)}</Typography>
          </div>
        ) : null}
      </div>
    </div>
  );
}
