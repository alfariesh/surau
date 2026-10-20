// Label galat untuk event `mcp_error` (#74). Hanya label statis: pesan galat SDK bisa memuat potongan
// body permintaan (masukan pengguna, P-7), jadi pesannya tidak pernah dicatat; awalannya yang konstan
// dipetakan ke label, ditambah nama kelas dan kode numerik bila ada.
const KNOWN_PREFIXES: readonly (readonly [RegExp, string])[] = [
  [/^Unsupported Media Type/, "unsupported_media_type"],
  [/^Rejected inbound request/, "inbound_rejected"],
  [/^Rejected 2025-era request/, "era_rejected"],
  [/^subscriptions\/listen refused/, "subscription_limit"],
  [/^requestState verification rejected/, "request_state_rejected"],
];

export interface ErrorLabel {
  error: string;
  kind: string;
  code?: number;
}

export function errorLabel(error: unknown): ErrorLabel {
  if (!(error instanceof Error)) return { error: "unknown", kind: "other" };
  const kind = KNOWN_PREFIXES.find(([pattern]) => pattern.test(error.message))?.[1] ?? "other";
  const code = (error as { code?: unknown }).code;
  return {
    error: error.constructor.name,
    kind,
    ...(typeof code === "number" ? { code } : {}),
  };
}
