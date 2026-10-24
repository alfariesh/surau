import { describe, expect, it } from "vite-plus/test";

import { digestHref, digestHubHref, digestTeaser, digestTeasers, nearestDigest } from "./digest";

const head = (id: number, over: Partial<Parameters<typeof digestTeaser>[0]> = {}) => ({
  toc_node_id: id,
  tier: "section" as const,
  review_status: "ai_generated" as const,
  points: 3,
  chars: 2500,
  audio_ms: null,
  ...over,
});

describe("kepala Intisari (X16)", () => {
  it("alamat halaman Intisari dan hub", () => {
    expect(digestHref("ihya", 100074)).toBe("/kitab/ihya/bab/100074/intisari");
    expect(digestHubHref("ihya")).toBe("/kitab/ihya/intisari");
  });

  it("menit baca dari panjang teks AI (ke atas), menit dengar dibulatkan (minimal 1)", () => {
    expect(digestTeaser(head(7), "ihya")).toEqual({
      nodeId: 7,
      tier: "section",
      points: 3,
      minutes: 3,
      listenMinutes: null,
      href: "/kitab/ihya/bab/7/intisari",
    });
    expect(digestTeaser(head(7, { audio_ms: 20_000 }), "ihya")?.listenMinutes).toBe(1);
    expect(digestTeaser(head(7, { audio_ms: 150_000 }), "ihya")?.listenMinutes).toBe(3);
  });

  it("Intisari tanpa gagasan tampil tidak diberi kepala (tanpa lencana atau tautan)", () => {
    expect(digestTeaser(head(7, { points: 0 }), "ihya")).toBeNull();
    expect(digestTeasers([head(7, { points: 0 }), head(8)], "ihya").map((d) => d.nodeId)).toEqual([
      8,
    ]);
  });

  it("nearestDigest: bagian terdalam di jalur yang punya Intisari", () => {
    const by = new Map(
      digestTeasers([head(1, { tier: "book" }), head(3)], "ihya").map((d) => [d.nodeId, d]),
    );
    expect(nearestDigest([{ id: 1 }, { id: 2 }, { id: 3 }], by)?.nodeId).toBe(3);
    expect(nearestDigest([{ id: 1 }, { id: 2 }], by)?.nodeId).toBe(1);
    expect(nearestDigest([{ id: 5 }], by)).toBeNull();
    expect(nearestDigest([], by)).toBeNull();
  });
});
