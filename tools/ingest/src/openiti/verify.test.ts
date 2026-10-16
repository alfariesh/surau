import { describe, expect, test } from "vite-plus/test";

import { jkTakhrijSegments, tokens } from "./verify.ts";

describe("jkTakhrijSegments", () => {
  test("hanya potongan ` + ` yang dibuka حديث atau menyebut sumbernya", () => {
    const segments = jkTakhrijSegments(
      "كلام المصنف + حديث الصبر ضياء + كلام آخر + وفي رواية أخرجه فلان + ",
    );
    expect(segments).toEqual([tokens("حديث الصبر ضياء"), tokens("وفي رواية أخرجه فلان")]);
  });

  test("tokens: bentuk normal tanpa harakat dan tanpa penanda (١)", () => {
    expect(tokens("الصَّبْرُ ضِيَاءٌ (١)")).toEqual(["الصبر", "ضياء"]);
  });
});
