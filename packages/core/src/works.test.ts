import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import { ED, seedCore } from "../test/fixture.ts";
import { InvalidCitation, NotFound } from "./errors.ts";
import { workList, workView } from "./schema.ts";
import { getWork, listWorks } from "./works.ts";

const db = env.CORPUS;

beforeAll(async () => {
  await seedCore(db);
});

describe("listWorks / getWork", () => {
  test("karya + penulis + edisi (default dulu) dengan lisensi, atribusi, dan permalink", async () => {
    const list = await listWorks(db);
    expect(workList.parse(list)).toEqual(list);
    expect(list.works).toHaveLength(1);
    const [work] = list.works;
    expect(work).toMatchObject({
      slug: "uji",
      title_ar: "كتاب تجريبي",
      author: { name_ar: "مؤلف تجريبي", name_id: "Penulis Uji", death_hijri: 505 },
      attribution_status: "authentic",
      openiti_uri: "0505Uji.KitabUji",
    });
    expect(work?.editions.map((e) => [e.id, e.is_default, e.permalink, e.license])).toEqual([
      [ED, true, "/kitab/uji", "CC BY-NC-SA 4.0"],
      [ED + 1, false, "/kitab/uji@openiti", "CC BY-NC-SA 4.0"],
    ]);
  });

  test("getWork sama dengan entri listWorks", async () => {
    const work = await getWork(db, "uji");
    expect(workView.parse(work)).toEqual(work);
    expect(work).toEqual((await listWorks(db)).works[0]);
  });

  test("NotFound untuk slug yang tidak ada; InvalidCitation untuk slug salah bentuk", async () => {
    await expect(getWork(db, "tidak-ada")).rejects.toBeInstanceOf(NotFound);
    for (const slug of ["", "Ihya", "ihya/1", "a".repeat(65), "-x", "x--y"]) {
      await expect(getWork(db, slug), slug).rejects.toBeInstanceOf(InvalidCitation);
    }
  });

  test("karya tanpa penulis → author null", async () => {
    await db.prepare("UPDATE work SET author_id = NULL WHERE id = 1").run();
    try {
      expect((await getWork(db, "uji")).author).toBeNull();
      expect((await listWorks(db)).works[0]?.author).toBeNull();
    } finally {
      await db.prepare("UPDATE work SET author_id = 1 WHERE id = 1").run();
    }
  });
});
