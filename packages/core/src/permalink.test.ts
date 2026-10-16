import { describe, expect, test } from "vite-plus/test";

import {
  editionPermalink,
  pagePermalink,
  passagePermalink,
  sectionPermalink,
} from "./permalink.ts";

describe("permalink", () => {
  const def = { workSlug: "ihya", editionSlug: "dar-al-marifah", isDefault: true };
  const other = { workSlug: "ihya", editionSlug: "openiti", isDefault: false };
  test("bentuk ADR-029", () => {
    expect(editionPermalink(def)).toBe("/kitab/ihya");
    expect(editionPermalink(other)).toBe("/kitab/ihya@openiti");
    expect(pagePermalink(def, 1, 200)).toBe("/kitab/ihya/1/200");
    expect(passagePermalink(def, 1, 200, 10_002_824)).toBe("/kitab/ihya/1/200#p2824");
    expect(sectionPermalink(def, 100_074)).toBe("/kitab/ihya/bab/100074");
    expect(sectionPermalink(other, 100_074)).toBe("/kitab/ihya@openiti/bab/100074");
  });
});
