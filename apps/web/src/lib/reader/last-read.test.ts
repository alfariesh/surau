import { describe, expect, it } from "vite-plus/test";

import { lastReadHref, parseLastRead } from "./last-read";

const ok = { work: "ihya", title: "Ihya' 'Ulum ad-Din", juz: 1, page: 200, anchor: "p2826", at: 1 };

describe("posisi baca terakhir", () => {
  it("rekaman sah dibaca; permalink halaman + jangkar paragraf", () => {
    const r = parseLastRead(JSON.stringify(ok));
    expect(r).toEqual(ok);
    expect(lastReadHref(r!)).toBe("/kitab/ihya/1/200#p2826");
    expect(lastReadHref({ ...ok, anchor: null })).toBe("/kitab/ihya/1/200");
  });

  it("data rusak atau berbahaya diabaikan (bukan dipakai sebagai tautan)", () => {
    for (const bad of [
      null,
      "bukan json",
      JSON.stringify({ ...ok, work: "javascript:alert(1)" }),
      JSON.stringify({ ...ok, work: "../admin" }),
      JSON.stringify({ ...ok, anchor: 'x"><script>' }),
      JSON.stringify({ ...ok, juz: 0 }),
      JSON.stringify({ ...ok, page: 1.5 }),
      JSON.stringify({ ...ok, at: "kemarin" }),
    ]) {
      expect(parseLastRead(bad)).toBeNull();
    }
  });
});
