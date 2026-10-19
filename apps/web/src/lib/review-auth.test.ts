import { beforeAll, describe, expect, test } from "vite-plus/test";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { reviewIdentity, reviewSameOrigin } from "./review-auth";

const config = {
  REVIEW_ACCESS_ISSUER: "https://test.cloudflareaccess.com",
  REVIEW_ACCESS_AUD: "a".repeat(64),
};
let pair: Awaited<ReturnType<typeof generateKeyPair>>;
let keys: ReturnType<typeof createLocalJWKSet>;
beforeAll(async () => {
  pair = await generateKeyPair("RS256");
  keys = createLocalJWKSet({
    keys: [{ ...(await exportJWK(pair.publicKey)), kid: "test", alg: "RS256" }],
  });
});
async function token(over: Record<string, unknown> = {}) {
  return new SignJWT({
    type: "app",
    email: "reviewer@example.test",
    sub: "subject",
    iss: config.REVIEW_ACCESS_ISSUER,
    aud: [config.REVIEW_ACCESS_AUD],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 600,
    ...over,
  })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .sign(pair.privateKey);
}
describe("Access JWT", () => {
  test("identitas berupa hash stabil, tidak memuat email", async () => {
    const first = await reviewIdentity(await token(), config, keys);
    expect(first).toMatch(/^[a-f0-9]{64}$/u);
    expect(await reviewIdentity(await token({ email: "changed@example.test" }), config, keys)).toBe(
      first,
    );
  });
  test("hilang, palsu, signature salah, kedaluwarsa, issuer/audience salah gagal tertutup", async () => {
    for (const value of [
      null,
      "fake",
      (await token()).replace(
        /(\.[^.]+\.)(.)/u,
        (_all, prefix: string, first: string) => prefix + (first === "a" ? "b" : "a"),
      ),
      await token({ exp: 1 }),
      await token({ iss: "https://evil.example" }),
      await token({ aud: "other" }),
      await token({ type: "service" }),
      await token({ email: undefined }),
      await token({ iat: undefined }),
      await token({ sub: "" }),
    ])
      expect(await reviewIdentity(value, config, keys)).toBeNull();
    expect(await reviewIdentity(await token(), {}, keys)).toBeNull();
    const other = await generateKeyPair("RS256");
    const wrong = createLocalJWKSet({
      keys: [{ ...(await exportJWK(other.publicKey)), kid: "test", alg: "RS256" }],
    });
    expect(await reviewIdentity(await token(), config, wrong)).toBeNull();
  });
  test("Origin wajib persis termasuk skema/port", () => {
    for (const origin of [
      "https://evil.example",
      "https://surau.example.evil",
      "http://surau.example",
      "null",
      "",
    ])
      expect(
        reviewSameOrigin(new Request("https://surau.example/api/review", { headers: { origin } })),
      ).toBe(false);
    expect(
      reviewSameOrigin(
        new Request("https://surau.example/api/review", {
          headers: { origin: "https://surau.example" },
        }),
      ),
    ).toBe(true);
  });
});
