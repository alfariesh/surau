import { createRemoteJWKSet, jwtVerify } from "jose";
import type { JWTVerifyGetKey } from "jose";
import { evalHash } from "@surau/core";

export interface ReviewAccessConfig {
  REVIEW_ACCESS_ISSUER?: string;
  REVIEW_ACCESS_AUD?: string;
}
let cached: { issuer: string; keys: JWTVerifyGetKey } | undefined;

/** Fail closed pada SEMUA host, termasuk workers.dev/preview. Tidak ada bypass development. */
export async function reviewIdentity(
  token: string | null,
  config: ReviewAccessConfig,
  testKeys?: JWTVerifyGetKey,
): Promise<string | null> {
  const issuer = config.REVIEW_ACCESS_ISSUER;
  const audience = config.REVIEW_ACCESS_AUD;
  if (
    !issuer ||
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/u.test(issuer) ||
    !audience ||
    !/^[a-f0-9]{64}$/u.test(audience) ||
    !token ||
    token.length > 8192
  )
    return null;
  try {
    if (!testKeys && cached?.issuer !== issuer) {
      cached = {
        issuer,
        keys: createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`), {
          timeoutDuration: 5000,
          cooldownDuration: 30000,
          cacheMaxAge: 300000,
        }),
      };
    }
    const keys = testKeys ?? cached?.keys;
    if (!keys) return null;
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "iat", "sub"],
    });
    if (
      payload.type !== "app" ||
      typeof payload.sub !== "string" ||
      payload.sub.length === 0 ||
      typeof payload.email !== "string" ||
      !payload.email.includes("@")
    )
      return null;
    // Email, token, dan identitas mentah tidak disimpan atau dicatat ke log.
    return await evalHash({ issuer, subject: payload.sub });
  } catch {
    // Pesan galat JWT dapat memuat claims; jangan log exception-nya.
    return null;
  }
}

export function reviewSameOrigin(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export const REVIEW_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  Vary: "Cookie, Cf-Access-Jwt-Assertion",
};
