"use client";

import { useRef } from "react";

import { tanyaText } from "../../i18n/tanya";
import type { OrbState } from "../tanya/orb-frames";
import { TanyaOrb } from "../tanya/tanya-orb";

import { useStory } from "./use-story";

const STATES: readonly OrbState[] = ["rest", "route", "retrieve", "answer", "verify", "done"];
const STEPS = [600, 900, 900, 900, 900] as const;

// Orb Maknaz besar untuk kartu bento (ADR-096): melewati tahap Jawab sampai bentuk "selesai", berulang
// selama terlihat (useStory); teks tahap di bawahnya (dekoratif: tahap yang sama dijelaskan di kartu).
export function OrbStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { step } = useStory(ref, STEPS);
  const state = STATES[step] ?? "done";
  const label = state === "rest" || state === "done" ? null : tanyaText.stages[state];
  return (
    <div ref={ref} className="flex flex-col items-center gap-4">
      <span className="flex size-36 items-center justify-center">
        <TanyaOrb size={112} stage={state} />
      </span>
      <span aria-hidden="true" className="text-foreground/80 min-h-5 text-sm">
        {label}
      </span>
    </div>
  );
}
