import { describe, expect, it } from "vite-plus/test";

import { selectedSection } from "./sections";

const OPTIONS = [
  { id: 1, title: "أ", children: [] },
  {
    id: 2,
    title: "ب",
    children: [
      { id: 3, title: "ج", children: [] },
      { id: 4, title: "د", children: [] },
    ],
  },
];

describe("selectedSection", () => {
  it("rub', kitab beserta rub'-nya, atau kosong", () => {
    expect(selectedSection(OPTIONS, null)).toEqual({ rub: null, kitab: null });
    expect(selectedSection(OPTIONS, 2).rub?.id).toBe(2);
    expect(selectedSection(OPTIONS, 2).kitab).toBeNull();
    expect(selectedSection(OPTIONS, 4)).toMatchObject({ rub: { id: 2 }, kitab: { id: 4 } });
    expect(selectedSection(OPTIONS, 99)).toEqual({ rub: null, kitab: null });
  });
});
