import { describe, expect, test } from "vite-plus/test";

import { errorLabel } from "./telemetry.ts";

describe("errorLabel (#74)", () => {
  test("pesan SDK yang konstan jadi label; pesan tidak pernah ikut", () => {
    const e = errorLabel(
      new Error("Unsupported Media Type: Content-Type must be application/json"),
    );
    expect(e).toEqual({ error: "Error", kind: "unsupported_media_type" });
    expect(
      errorLabel(new Error("subscriptions/listen refused: subscription limit reached (16)")).kind,
    ).toBe("subscription_limit");
    const rahasia = errorLabel(new Error("kueri pengguna yang tidak boleh tercatat"));
    expect(JSON.stringify(rahasia)).not.toContain("kueri");
    expect(rahasia).toEqual({ error: "Error", kind: "other" });
  });

  test("nama kelas dan kode numerik dicatat bila ada", () => {
    class ProtocolError extends Error {
      constructor(readonly code: number) {
        super("x");
      }
    }
    expect(errorLabel(new ProtocolError(-32603))).toEqual({
      error: "ProtocolError",
      kind: "other",
      code: -32603,
    });
    expect(errorLabel("bukan error")).toEqual({ error: "unknown", kind: "other" });
  });
});
