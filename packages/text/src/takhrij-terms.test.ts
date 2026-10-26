import { describe, expect, it } from "vite-plus/test";

import { takhrijTerms } from "./takhrij-terms.ts";

// Kalimat BUATAN bergaya takhrij untuk tes (bukan teks kitab).
const kinds = (raw: string) => takhrijTerms(raw).terms.map((t) => t.kind);
const phrases = (raw: string) => takhrijTerms(raw).terms.map((t) => raw.slice(t.start, t.end));

describe("takhrijTerms", () => {
  it("istilah penilaian sesudah penanda takhrij, dengan rentang mentah yang persis", () => {
    const raw = "(٣) حديث تجريبي أخرجه فلان من حديث فلان بإسناد ضعيف";
    expect(takhrijTerms(raw)).toMatchObject({ kind: "takhrij", sources: true });
    expect(kinds(raw)).toEqual(["daif"]);
    expect(phrases(raw)).toEqual(["بإسناد ضعيف"]);
    // Berharakat: rentang tetap mencakup harakat huruf terakhir.
    const voweled = "حديث تجريبي رواه فلان بِإِسْنَادٍ ضَعِيفٍ";
    expect(phrases(voweled)).toEqual(["بِإِسْنَادٍ ضَعِيفٍ"]);
  });

  it("bagian lafaz (sebelum penanda pertama) tidak dipindai", () => {
    // "ما تقدم من ذنبه" = lafaz, bukan rujukan; "باطل" dan "حسن الخلق" di lafaz bukan penilaian.
    expect(kinds("حديث غفر له ما تقدم من ذنبه أخرجه فلان بسند صحيح")).toEqual(["sahih"]);
    expect(kinds("حديث كل شيء باطل إلا ذكر الله رواه فلان")).toEqual([]);
    expect(kinds("حديث حسن الخلق نصف الدين رواه فلان من حديث فلان")).toEqual([]);
    expect(takhrijTerms("حديث كل شيء باطل إلا ذكر الله رواه فلان").sources).toBe(true);
  });

  it("kata sifat, nama kitab, nama orang, dan negasi tidak dihitung penilaian", () => {
    expect(kinds("حديث تجريبي أخرجه فلان وقال حسن الخلق خلق عظيم")).toEqual([]);
    expect(kinds("حديث تجريبي أخرجه ابن حبان في صحيحه")).toEqual([]);
    expect(kinds("حديث تجريبي هو في صحيح مسلم")).toEqual([]);
    expect(kinds("حديث تجريبي أخرجه فلان عن الحسن البصري")).toEqual([]);
    expect(kinds("حديث تجريبي أخرجه فلان وفيه فلان وليس بضعيف")).toEqual([]);
    expect(kinds("حديث تجريبي رواه فلان من حديث مسلم بن فلان")).toEqual([]);
    // "فاعله" = pelakunya, bukan ف + "أعله" (menyatakan cacat).
    expect(kinds("حديث تجريبي رواه فلان بلفظ فله مثل أجر فاعله")).toEqual([]);
    expect(kinds("حديث تجريبي رواه فلان وأعله فلان")).toEqual(["daif"]);
  });

  it("kosakata: sahih/hasan/jayyid/gharib, lemah sampai palsu, tidak ditemukan, mursal, mauquf", () => {
    expect(kinds("حديث تجريبي أخرجه الترمذي وقال حسن صحيح")).toEqual(["hasan_sahih"]);
    expect(kinds("حديث تجريبي أخرجه الترمذي وقال حسن غريب")).toEqual(["hasan", "gharib"]);
    expect(kinds("حديث تجريبي رواه فلان بإسناد جيد")).toEqual(["jayyid"]);
    expect(kinds("حديث تجريبي رواه الحاكم وصححه")).toEqual(["sahih"]);
    expect(kinds("حديث تجريبي رواه فلان وضعفه فلان")).toEqual(["daif"]);
    expect(kinds("حديث تجريبي رواه فلان وليس إسناده بالقوي")).toEqual(["daif"]);
    expect(kinds("حديث تجريبي رواه فلان بسند ضعيف جدا")).toEqual(["sangat_lemah"]);
    expect(kinds("حديث تجريبي ذكره ابن الجوزي في الموضوعات")).toEqual(["palsu"]);
    expect(kinds("حديث تجريبي لا أصل له")).toEqual(["la_asl"]);
    expect(kinds("حديث تجريبي لم أقف له على أصل")).toEqual(["la_asl"]);
    expect(kinds("حديث تجريبي لم أجده")).toEqual(["lam_ajid"]);
    expect(phrases("حديث تجريبي رواه فلان موقوفا ولم أره مرفوعا")).toEqual([
      "موقوفا",
      "ولم أره مرفوعا",
    ]);
    expect(kinds("حديث تجريبي ذكره فلان تعليقا ولم أظفر له بإسناد")).toEqual([
      "muallaq",
      "lam_ajid",
    ]);
    expect(kinds("حديث تجريبي رواه فلان مرسلا")).toEqual(["mursal"]);
    expect(kinds("حديث تجريبي رواه فلان بإسناد لا بأس به وقال فلان معضل")).toEqual(["la_bas", "daif"]);
    expect(kinds("حديث تجريبي رواه فلان وفيه نظر")).toEqual(["daif"]);
    expect(kinds("حديث تجريبي ذكره فلان بغير إسناد")).toEqual(["muallaq"]);
    expect(kinds("حديث تجريبي أخرجه العقيلي في الضعفاء")).toEqual(["duafa"]);
    expect(kinds("حديث تجريبي رواه فلان والحديث غير ثابت")).toEqual(["daif"]);
  });

  it("al-Bukhari dan Muslim, sebagian lafaz, rujukan", () => {
    expect(kinds("حديث تجريبي متفق عليه من حديث فلان دون قوله كذا")).toEqual([
      "muttafaq",
      "sebagian",
    ]);
    expect(kinds("حديث تجريبي أخرجاه من حديث فلان")).toEqual(["muttafaq"]);
    // Panjang sama: "وللبخاري" adalah al-Bukhari, bukan sekadar penanda sumber.
    expect(kinds("حديث تجريبي وللبخاري من حديث فلان ولمسلم من حديث فلان")).toEqual([
      "bukhari",
      "muslim",
    ]);
    expect(kinds("حديث تجريبي تقدم في الباب الأول")).toEqual(["rujukan"]);
    expect(kinds("حديث تجريبي من حديث فلان المتقدم")).toEqual(["rujukan"]);
  });

  it("temuan peninjau X06: al-Bukhari/Muslim, kata kerja penilaian, rujukan, lafaz", () => {
    // "على شرط مسلم", "ولم يخرجه", "وضعفه البخاري", "قال البخاري", nama orang: bukan riwayat.
    expect(kinds("حديث تجريبي رواه الحاكم وقال صحيح على شرط مسلم")).toEqual(["sahih", "sahih"]);
    expect(phrases("حديث تجريبي رواه الحاكم وقال صحيح على شرط مسلم")).toEqual([
      "صحيح",
      "على شرط مسلم",
    ]);
    expect(kinds("حديث تجريبي رواه الحاكم ولم يخرجه البخاري")).toEqual([]);
    expect(kinds("حديث تجريبي رواه فلان وضعفه البخاري")).toEqual(["daif"]);
    expect(kinds("حديث تجريبي رواه فلان وقال البخاري منكر الحديث")).toEqual(["sangat_lemah"]);
    expect(kinds("حديث تجريبي رواه أبو مسلم الكجي ورواه فلان بن مسلم")).toEqual([]);
    expect(kinds("حديث تجريبي رواه الحاكم وقال على شرط البخاري ومسلم")).toEqual(["sahih"]);
    expect(kinds("حديث تجريبي رواه الحاكم ولم يخرجه البخاري ولا مسلم")).toEqual([]);
    expect(kinds("حديث تجريبي وهو عند مسلم من حديث فلان")).toEqual(["muslim"]);
    // Kata kerja penilaian boleh diikuti nama penilai.
    expect(kinds("حديث تجريبي رواه فلان بإسناد ضعيف وصححه الترمذي")).toEqual(["daif", "sahih"]);
    expect(kinds("حديث تجريبي رواه فلان وحسنه الترمذي")).toEqual(["hasan"]);
    // "سنة حسنة" (ة → ه) di lafaz kutipan sesudah penanda bukan "حسنه".
    expect(kinds("حديث تجريبي رواه مسلم بلفظ من سن سنة حسنة")).toEqual(["muslim"]);
    // Rujukan: "سيأتي على الناس" dan "فتقدم" di lafaz tidak membuka takhrij.
    expect(kinds("حديث سيأتي على الناس زمان رواه فلان بسند صحيح")).toEqual(["sahih"]);
    expect(kinds("حديث فتقدم فصلى رواه فلان")).toEqual([]);
    expect(kinds("حديث تجريبي سيأتي في الباب الثالث")).toEqual(["rujukan"]);
    // Hanya asalnya di al-Bukhari/Muslim, atau negasi: bukan muttafaq.
    expect(kinds("حديث تجريبي رواه فلان وأصله في الصحيحين")).toEqual([]);
    expect(kinds("حديث تجريبي رواه فلان وليس في الصحيحين")).toEqual([]);
    // "بدون إسناد" = mu'allaq; "لا يعرف إلا …" bukan "tidak dikenal".
    expect(kinds("حديث تجريبي ذكره فلان بدون إسناد")).toEqual(["muallaq"]);
    expect(kinds("حديث تجريبي رواه فلان وفيه راو لا يعرف إلا به")).toEqual([]);
    expect(kinds("حديث تجريبي لم أجده إلا عند فلان")).toEqual([]);
  });

  it("catatan penyunting, teks tanpa penanda, dan teks kosong", () => {
    expect(takhrijTerms("(١) قوله كذا أي كذا اه مصححه").kind).toBe("editor_note");
    expect(takhrijTerms("(٢) كذا في الأصل اه مصححه").kind).toBe("editor_note");
    // Takhrij yang ditutup catatan penyunting tetap takhrij.
    expect(kinds("حديث تجريبي رواه فلان بإسناد ضعيف اه مصححه")).toEqual(["daif"]);
    expect(takhrijTerms("(٤) وقال فلان كلاما تجريبيا").kind).toBe("unrecognized");
    expect(takhrijTerms("").kind).toBe("unrecognized");
    expect(takhrijTerms("حديث تجريبي رواه فلان")).toEqual({
      kind: "takhrij",
      takhrijStart: 12,
      sources: true,
      terms: [],
      segments: [{ start: 0, end: 21, takhrij: true, sources: true }],
    });
  });
});

// Versi 2 (ADR-108): pola keliru dari tinjauan agent 2026-10-26 (data/reports/
// ihya-9472-takhrij-agent-2026-10-26.md, nomor pola di judul). Kalimat BUATAN, bukan teks kitab.
describe("takhrijTerms versi 2", () => {
  it("pola 1: catatan kaki tergabung dipindai per segmen penanda (N)", () => {
    const raw = "حديث تجريبي أخرجه فلان بسند ضعيف (٤) حديث تجريبي آخر متفق عليه";
    const t = takhrijTerms(raw);
    expect(t.segments.map((s) => [s.start, s.end])).toEqual([
      [0, 33],
      [33, raw.length],
    ]);
    expect(t.terms.map((x) => [x.kind, x.segment])).toEqual([
      ["daif", 0],
      ["muttafaq", 1],
    ]);
    // Segmen kedua punya bagian lafaznya sendiri: "باطل" sebelum pembukanya tidak dipindai.
    expect(kinds("حديث تجريبي رواه فلان (٥) حديث كل شيء باطل رواه فلان")).toEqual([]);
    // Penanda di awal teks atau tanpa "حديث" sesudahnya bukan batas segmen.
    expect(takhrijTerms("(٣) حديث تجريبي رواه فلان").segments).toHaveLength(1);
    expect(takhrijTerms("حديث تجريبي رواه فلان (٢) وقال كذا").segments).toHaveLength(1);
  });

  it("pola 3: lafaz yang dikutip sesudah pembuka tidak dipindai untuk kata ambigu", () => {
    // Lafaz sesudah "من حديث فلان": kata sifat, "مسلم" (orang Islam), "لا بأس به", "موضوع".
    expect(kinds("حديث تجريبي رواه فلان من حديث فلان قال كل رجل مسلم يفعل كذا")).toEqual([]);
    expect(kinds("حديث تجريبي في الصحيحين من حديث فلان قال ليس بحرام ولا بأس به ولكن")).toEqual([
      "muttafaq",
    ]);
    expect(kinds("حديث تجريبي أخرجه فلان من رواية فلان وثيابه موضوعة على المشجب")).toEqual([]);
    expect(kinds("حديث تجريبي أخرجه فلان من حديث فلان من طال عمره وحسن عمله وقال حسن صحيح")).toEqual([
      "hasan_sahih",
    ]);
    expect(kinds("حديث تجريبي رواه فلان مرسلا بلفظ يسبق حلمه جهله الحديث")).toEqual(["mursal"]);
    // Frasa yang tidak mungkin lafaz tetap dikenali di dalam lafaz dan menutupnya.
    expect(kinds("حديث تجريبي رواه فلان من حديث فلان بإسناد ضعيف")).toEqual(["daif"]);
    expect(kinds("حديث تجريبي رواه فلان من حديث فلان وهو موضوع")).toEqual(["palsu"]);
    // Kata ambigu yang langsung disusul pernyataan penakhrij tetap penilaian.
    expect(kinds("حديث تجريبي رواه فلان من حديث فلان كذا وكذا باطل ورواه فلان")).toEqual(["palsu"]);
    // "وفي رواية لمسلم": nama penghimpun sesudah penanda lafaz tetap dikenali, dan lafaz
    // sesudahnya tetap dilewati.
    expect(kinds("حديث تجريبي رواه فلان وفي رواية لمسلم كذا")).toEqual(["muslim"]);
    expect(kinds("حديث تجريبي رواه فلان وفي رواية لمسلم وثيابه موضوعة على المشجب")).toEqual([
      "muslim",
    ]);
    expect(kinds("حديث تجريبي متفق عليه ولفظ البخاري كل رجل مسلم")).toEqual([
      "muttafaq",
      "bukhari",
    ]);
  });

  it("pola 4: penilaian yang dinukil lalu dibantah penakhrij", () => {
    expect(kinds("حديث تجريبي رواه فلان وضعفه وصححه فلان في كتابه وليس كذلك")).toEqual([
      "daif",
      "dibantah",
    ]);
    expect(phrases("حديث تجريبي رواه الحاكم وقال صحيح الإسناد قلت بل منقطع")).toEqual([
      "صحيح الإسناد قلت بل",
      "منقطع",
    ]);
    expect(kinds("حديث تجريبي رواه فلان بسند صحيح وضعفه فلان وليس بجيد")).toEqual([
      "sahih",
      "dibantah",
    ]);
    expect(kinds("حديث تجريبي رواه فلان وقال إنه معضل وفيه نظر")).toEqual(["dibantah"]);
    // Sesudah penilaian lemah penakhrij sendiri: penguatan, bukan bantahan.
    expect(kinds("حديث تجريبي رواه فلان وهو منكر وليس بصحيح")).toEqual(["sangat_lemah", "daif"]);
    // "قلت" saja: hanya bila positif lalu langsung penilaian lemah.
    expect(kinds("حديث تجريبي رواه الحاكم وقال صحيح الإسناد قلت فيه فلان ضعيف")).toEqual([
      "dibantah",
      "daif",
    ]);
    expect(kinds("حديث تجريبي رواه الحاكم وقال صحيح الإسناد قلت ورواه فلان")).toEqual(["sahih"]);
  });

  it("pola 5: al-Bukhari dan Muslim hanya sebagai penyebutan sumber", () => {
    expect(kinds("حديث تجريبي أخرجه البخاري في التاريخ من حديث فلان")).toEqual([]);
    expect(kinds("حديث تجريبي متفق عليه ولم يقل البخاري كذا")).toEqual(["muttafaq"]);
    expect(kinds("حديث تجريبي رواه فلان وقال البخاري في صحيحه كذا")).toEqual(["bukhari"]);
    expect(kinds("حديث تجريبي أخرجه البخاري من حديث فلان")).toEqual(["bukhari"]);
    expect(kinds("حديث تجريبي أخرجه فلان وزاد مسلم كذا")).toEqual(["muslim"]);
    expect(kinds("حديث تجريبي أخرجه فلان قال ما من مسلم يفعل كذا")).toEqual([]);
  });

  it("pola 6: tidak ditemukan, tidak ditemukan sebagai marfu', dan perawi tak dikenal", () => {
    expect(kinds("حديث تجريبي رواه فلان موقوفا ولم أجده مرفوعا")).toEqual([
      "mawquf",
      "lam_ajid_marfu",
    ]);
    expect(kinds("حديث تجريبي رواه فلان وفيه من لا أعرفه")).toEqual(["daif"]);
    expect(kinds("حديث تجريبي لم أجده إلا بلاغا لفلان")).toEqual(["lam_ajid"]);
    expect(kinds("حديث تجريبي لم أجد له أصلا في الموصولات")).toEqual(["lam_ajid"]);
  });

  it("pola 7: hasan/sahih/gharib sesudah bin/ibn adalah nama perawi", () => {
    expect(kinds("حديث تجريبي أخرجه فلان من رواية عبد الله بن حسن مرسلا")).toEqual(["mursal"]);
    expect(kinds("حديث تجريبي رواه فلان عن ابن غريب")).toEqual([]);
  });

  it("pola 8: bentuk yang terlewat versi 1", () => {
    expect(kinds("حديث تجريبي رواه فلان إلا أن فيه انقطاعا")).toEqual(["daif"]);
    expect(kinds("حديث تجريبي رواه الترمذي وقال ليس إسناده بمتصل")).toEqual(["daif"]);
    expect(kinds("حديث تجريبي رواه فلان وقال غير محفوظ")).toEqual(["daif"]);
    expect(kinds("حديث تجريبي رواه الحاكم وصحح إسناده")).toEqual(["sahih"]);
    expect(kinds("حديث تجريبي رواه فلان بإسناد آخر جيد")).toEqual(["jayyid"]);
    expect(kinds("حديث تجريبي رواه فلان وللشيخين من حديث فلان")).toEqual(["muttafaq"]);
    expect(kinds("حديث تجريبي صورته عند البخاري صورة التعليق")).toEqual(["bukhari", "muallaq"]);
    expect(kinds("حديث تجريبي أخرجه مسلم دون آخره")).toEqual(["muslim", "sebagian"]);
    expect(kinds("حديث تجريبي رواه فلان وليس فيه قوله كذا")).toEqual(["sebagian"]);
    expect(kinds("حديث تجريبي رواه الترمذي واستغربه")).toEqual(["gharib"]);
    expect(kinds("حديث تجريبي لم أقف لأوله على أصل")).toEqual(["la_asl"]);
    expect(kinds("حديث تجريبي فقد تقدم من حديث فلان")).toEqual(["rujukan"]);
    expect(kinds("حديث تجريبي رواه فلان كما سيأتي ذكره")).toEqual(["rujukan"]);
    expect(kinds("حديث تجريبي رواه فلان وفيه فلان متكلم فيه")).toEqual(["daif"]);
    expect(kinds("حديث تجريبي رواه فلان وفيه من يجهل")).toEqual(["daif"]);
    expect(kinds("حديث تجريبي رواه فلان وفيه فلان كذبه أبو فلان")).toEqual(["sangat_lemah"]);
    expect(kinds("حديث تجريبي رواه فلان وفيه فلان قال ابن حبان يروي الموضوعات")).toEqual([
      "sangat_lemah",
    ]);
    // "طريقه المتقدمة أحسن" = sifat jalur, bukan rujukan.
    expect(kinds("حديث تجريبي رواه فلان وقال إن طريقه المتقدمة أحسن")).toEqual([]);
  });

  it("pola 9: perawi tepercaya dan perawi yang diperselisihkan", () => {
    expect(kinds("حديث تجريبي رواه فلان ورجاله ثقات")).toEqual(["tsiqat"]);
    expect(kinds("حديث تجريبي رواه فلان ورجاله رجال الصحيح")).toEqual(["tsiqat"]);
    expect(kinds("حديث تجريبي رواه فلان وفيه فلان مختلف فيه")).toEqual(["mukhtalaf"]);
    expect(kinds("حديث تجريبي رواه فلان وقد اختلف في رفعه")).toEqual(["mukhtalaf"]);
    // "مع اختلاف لفظ" = perbedaan lafaz; "لما اختلف فيه" = lafaz doa.
    expect(kinds("حديث تجريبي متفق عليه مع اختلاف لفظ")).toEqual(["muttafaq"]);
    expect(kinds("حديث تجريبي رواه فلان بلفظ اهدني لما اختلف فيه")).toEqual([]);
  });

  it("pola 10: penilaian di akhir catatan kaki tanpa penanda sumber", () => {
    expect(kinds("حديث النهي عن كذا غريب")).toEqual(["gharib"]);
    expect(kinds("حديث تجريبي فذكر حديثا وقال حسن غريب")).toEqual(["hasan", "gharib"]);
    expect(kinds("(٢) ضعيف")).toEqual(["daif"]);
    // Matan yang tercetak sebagai catatan kaki: kata sifat di akhir bukan takhrij.
    expect(takhrijTerms("وعن فلان قال ما خير ما أعطي العبد قال خلق حسن").kind).toBe("unrecognized");
  });
});
