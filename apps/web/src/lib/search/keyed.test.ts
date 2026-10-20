import { describe, expect, it } from "vite-plus/test";

import { keepCurrent } from "./keyed";

describe("keepCurrent", () => {
  it("menulis hasil berkunci sama atau pertama", () => {
    expect(keepCurrent(null, { key: "a", state: 1 })).toEqual({ key: "a", state: 1 });
    expect(keepCurrent({ key: "a", state: 1 }, { key: "a", state: 2 })).toEqual({
      key: "a",
      state: 2,
    });
  });

  it("hasil kueri lama tidak menimpa hasil kueri baru (#60)", () => {
    const fresh = { key: "b", state: 3 };
    expect(keepCurrent(fresh, { key: "a", state: 2 })).toBe(fresh);
  });
});
