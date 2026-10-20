"use client";

import { useEffect, useRef } from "react";

// Widget Cloudflare Turnstile (S21, ADR-065): hanya dimuat saat server meminta tantangan (cookie anon
// belum ada), mode `interaction-only` (biasanya tak terlihat), `action` "jawab" (dicek server).
// Skrip resmi dimuat sekali (`render=explicit`, tanpa `turnstile.ready()` karena skrip async). Token
// sekali pakai langsung dikirim bersama pertanyaan; sesudah lolos, server memberi cookie 24 jam.

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __surauTurnstile?: Promise<void>;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile(): Promise<void> {
  if (window.turnstile !== undefined) return Promise.resolve();
  window.__surauTurnstile ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      window.__surauTurnstile = undefined;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(script);
  });
  return window.__surauTurnstile;
}

export function TurnstileWidget({
  sitekey,
  onToken,
  onError,
}: {
  sitekey: string;
  onToken: (token: string) => void;
  onError: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  // Callback terbaru tanpa merender ulang widget.
  const handlers = useRef({ onToken, onError });
  useEffect(() => {
    handlers.current = { onToken, onError };
  });

  useEffect(() => {
    let id: string | undefined;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || box.current === null || window.turnstile === undefined) return;
        id = window.turnstile.render(box.current, {
          sitekey,
          action: "jawab",
          appearance: "interaction-only",
          size: "flexible",
          callback: (token: string) => handlers.current.onToken(token),
          "error-callback": () => handlers.current.onError(),
          "timeout-callback": () => handlers.current.onError(),
        });
      })
      .catch(() => handlers.current.onError());
    return () => {
      cancelled = true;
      if (id !== undefined) window.turnstile?.remove(id);
    };
  }, [sitekey]);

  return <div ref={box} className="w-full" />;
}
