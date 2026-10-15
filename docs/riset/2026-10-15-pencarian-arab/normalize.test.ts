import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeArabic, toRawSpan, stemToken, stemTokenAggressive, expandQueryToken, splitFootnotes, findQuote, buildFtsMatch } from "./normalize.ts";

test("harakat, tatweel, hamza-alef, ى, ة", () => {
  assert.equal(normalizeArabic("الصَّبْرُ").text, "الصبر");
  assert.equal(normalizeArabic("إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ").text, "انما الاعمال بالنيات");
  assert.equal(normalizeArabic("صلاة العيدين").text, "صلاه العيدين");
  assert.equal(normalizeArabic("مُوسَى").text, "موسي");
  assert.equal(normalizeArabic("ـــالعلم").text, "العلم");
  assert.equal(normalizeArabic("الرَّحْمٰنِ").text, "الرحمن");
  assert.equal(normalizeArabic("آمنوا ٱلله").text, "امنوا الله");
  assert.equal(normalizeArabic("مسئول مسؤول").text, "مسيول مسوول");
  assert.equal(normalizeArabic("مسئول", { hamzaSeats: false }).text, "مسئول");
});

test("HTML, catatan kaki, tanda baca, spasi", () => {
  const raw = "قَالَ (١) {يَرْفَعِ اللَّهُ}\r<span data-type=\"title\" id=toc-6>فَضِيلَةُ التَّعَلُّمِ</span>\rأَمَّا";
  assert.equal(normalizeArabic(raw).text, "قال يرفع الله فضيله التعلم اما");
  assert.equal(normalizeArabic("رشده (١٢) وقال", { dropFootnoteRefs: false }).text, "رشده 12 وقال");
  assert.equal(normalizeArabic("  ،،  ").text, "");
  assert.equal(normalizeArabic("ﷺ").text, "صلي الله عليه وسلم");
});

test("peta offset: setiap karakter normal menunjuk ke karakter mentah yang setara", () => {
  const raw = "وَقَالَ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ الْعُلَمَاءُ وَرَثَةُ الْأَنْبِيَاءِ (٢) وَمَعْلُومٌ";
  const n = normalizeArabic(raw);
  assert.equal(n.map.length, n.text.length);
  for (let j = 0; j < n.text.length; j++) {
    if (n.text[j] === " ") continue;
    const r = raw[n.map[j]];
    assert.equal(normalizeArabic(r).text, n.text[j], `pos ${j}`);
  }
  const idx = n.text.indexOf("العلماء ورثه الانبياء");
  const [rs, re] = toRawSpan(raw, n, idx, idx + "العلماء ورثه الانبياء".length);
  assert.equal(raw.slice(rs, re), "الْعُلَمَاءُ وَرَثَةُ الْأَنْبِيَاءِ");
});

test("findQuote: kutipan tanpa harakat -> substring mentah verbatim; batas kata dihormati", () => {
  const raw = "فَقَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ (١) وَقَالَ";
  const hit = findQuote(raw, "من يرد الله به خيرا يفقهه في الدين");
  assert.ok(hit);
  assert.equal(hit!.rawText, "مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ");
  assert.equal(findQuote(raw, "يرد الله به خير"), null); // "خير" != "خيرا" (batas kata)
  assert.ok(findQuote(raw, "في الدين وقال")); // melompati penanda (١)
  assert.equal(findQuote(raw, "من يريد الله"), null);
});

test("stem konservatif vs agresif", () => {
  const cases: [string, string][] = [
    ["الصبر", "صبر"], ["والصبر", "صبر"], ["بالصبر", "صبر"], ["للصبر", "صبر"], ["فالصبر", "صبر"],
    ["كالصبر", "صبر"], ["صبر", "صبر"], ["وصبر", "وصبر"], ["فضيله", "فضيله"], ["الفضيله", "فضيله"],
    ["الله", "الله"], ["والله", "الله"], ["لله", "الله"], ["الذين", "الذين"], ["الا", "الا"],
    ["وجوب", "وجوب"], ["الوجوب", "وجوب"],
  ];
  for (const [i, o] of cases) assert.equal(stemToken(i), o, i);
  assert.equal(stemTokenAggressive("فضيله"), "ضيله"); // bukti: agresif merusak kata dasar ف-
  assert.equal(stemTokenAggressive("وجوب"), "جوب");
  assert.deepEqual(expandQueryToken("صبر").slice(0, 3), ["صبر", "وصبر", "فصبر"]);
});

test("pemisah catatan kaki Shamela", () => {
  const s = splitFootnotes("متن\r_________\r(١) حديث ...");
  assert.equal(s.body, "متن");
  assert.equal(s.footnotes, "(١) حديث ...");
});

test("buildFtsMatch: kata tunggal, frasa, kunyah, injeksi", () => {
  assert.equal(buildFtsMatch("الصَّبْرُ"), buildFtsMatch("والصبر"));
  assert.match(buildFtsMatch("الصبر")!, /^\{sbody sfoot\} : \("صبر" OR "وصبر" OR /);
  assert.equal(buildFtsMatch("أبو هريرة")!.split(" OR ").length, 33);
  assert.match(buildFtsMatch("طلب العلم")!, /"لطلب علم"/);
  assert.match(buildFtsMatch("النية", { suffix: true })!, /"نيت"\*/);
  assert.equal(buildFtsMatch('"(*)" ،'), null); // tanda baca saja -> tidak ada token
  assert.match(buildFtsMatch('" OR NEAR(')!, /^\{sbody sfoot\} : \("or near" OR /); // operator jadi literal ter-quote
  assert.match(buildFtsMatch("AND OR")!, /^\{sbody sfoot\} : \("and or" OR "وand or"/);
});
