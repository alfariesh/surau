// Glosarium istilah sebagai DATA berkunci (X15b, ADR-097, ADR-098). Isinya diturunkan dari
// `GLOSSARY_V1` (dijaga tes: setiap pasangan v1 ada di sini), ditambah kunci stabil `key`
// (`glossary_term.term_key`, enum skema Intisari) dan bentuk lisan untuk audio X17. `GLOSSARY_V2` =
// teks glosarium yang DIBANGKITKAN dari data ini untuk prompt Intisari. Prompt lama (terjemahan,
// ringkasan, judul) tetap memakai `GLOSSARY_V1` yang dibekukan; prompt yang pindah ke v2 naik versi.
// Mengubah data = mengubah `GLOSSARY_V2` = versi prompt Intisari baru. Kunci tidak boleh diganti
// setelah dimuat ke korpus (dirujuk `digest_term`); istilah baru = kunci baru.
//
// Beda isi dengan v1: "radhiyallahu 'anhu/'anha/'anhum → ra." dipecah tiga, karena Intisari
// dibacakan suara AI (X17) dan "ra." dibaca "radhiyallahu 'anhu": bentuk perempuan dan jamak ditulis
// lengkap.

export const GLOSSARY_GROUPS = {
  sebutan: "Sebutan dan doa",
  orang: "Orang dan golongan",
  ilmu: "Ilmu dan sumber",
  hukum: "Hukum",
  ibadah: "Ibadah",
  hati: "Hati dan jiwa",
  muhlikat: "Sifat yang membinasakan (al-muhlikat)",
  munjiyat: "Sifat yang menyelamatkan (al-munjiyat)",
  jalan: "Jalan dan keadaan",
  akhirat: "Akhirat",
} as const;
export type GlossaryGroup = keyof typeof GLOSSARY_GROUPS;

export interface GlossaryEntry {
  /** Kunci stabil `[a-z][a-z0-9-]*` (kolom `term_key`). */
  key: string;
  group: GlossaryGroup;
  /** Bentuk transliterasi sumber (kiri panah). */
  source: string;
  /** Bentuk tulis Indonesia (kanan panah). */
  label: string;
  /** Padanan dalam kurung, hanya pada kemunculan pertama. */
  note?: string;
  /** Bentuk lisan untuk audio (X17) bila berbeda dari `label` (singkatan). */
  spoken?: string;
  /**
   * Boleh dipilih sebagai istilah Intisari (`digest_term`, definisi di `glossary_term`). Sebutan dan
   * doa tidak: itu aturan penulisan, bukan istilah yang perlu dijelaskan.
   */
  term: boolean;
}

type Row = [key: string, source: string, label: string, note?: string];

const rows = (group: GlossaryGroup, term: boolean, list: readonly Row[]): GlossaryEntry[] =>
  list.map(([key, source, label, note]) => ({
    key,
    group,
    source,
    label,
    ...(note === undefined ? {} : { note }),
    term,
  }));

const SPOKEN: Readonly<Record<string, string>> = {
  "allah-swt": "Allah subhanahu wa ta'ala",
  saw: "shallallahu 'alaihi wa sallam",
  as: "'alaihis salam",
  ra: "radhiyallahu 'anhu",
};

export const GLOSSARY_TERMS: readonly GlossaryEntry[] = [
  ...rows("sebutan", false, [
    ["allah-taala", "Allah ta'ala", "Allah Ta'ala"],
    ["allah-swt", "Allah subhanahu wa ta'ala", "Allah Swt."],
    ["azza-wa-jalla", "'azza wa jalla", "Allah 'Azza wa Jalla"],
    [
      "saw",
      "shallallahu 'alaihi wa sallam (dan bentuk singkatnya)",
      "saw.",
      'misalnya "Rasulullah saw. bersabda"',
    ],
    ["as", "'alaihis salam", "as."],
    ["ra", "radhiyallahu 'anhu", "ra."],
    ["radhiyallahu-anha", "radhiyallahu 'anha", "radhiyallahu 'anha"],
    ["radhiyallahu-anhum", "radhiyallahu 'anhum", "radhiyallahu 'anhum"],
    ["rahimahullah", "rahimahullah", "rahimahullah"],
    ["rasulullah", "Rasulullah", "Rasulullah"],
    ["nabi", "an-Nabi", "Nabi"],
    ["mushthafa", "al-Mushthafa", "al-Mushthafa"],
    ["wallahu-alam", "wallahu a'lam", "Allah lebih mengetahui"],
    ["insya-allah", "insya Allah", "insya Allah"],
    ["bismillah", "bismillah", "bismillah"],
    ["quran", "al-Qur'an", "Al-Qur'an"],
    ["kitab-allah", "al-kitab (Al-Qur'an)", "Kitab Allah"],
    ["sunah", "as-sunnah", "sunah"],
  ]),
  ...rows("orang", true, [
    ["shahabah", "ash-shahabah", "para sahabat"],
    ["tabiin", "at-tabi'un", "para tabiin"],
    ["salaf", "as-salaf", "kaum salaf"],
    ["khalaf", "al-khalaf", "generasi belakangan"],
    ["ulama", "al-'ulama", "para ulama"],
    ["fuqaha", "al-fuqaha", "para ahli fikih"],
    ["mutakallimun", "al-mutakallimun", "para ahli kalam"],
    ["shufiyyah", "ash-shufiyyah", "kaum sufi"],
    ["arif", "al-'arif / al-'arifun", "orang 'arif", "yang mengenal Allah"],
    ["murid", "al-murid", "murid", "penempuh jalan"],
    ["abid", "al-'abid", "ahli ibadah"],
    ["zahid", "az-zahid", "orang zuhud"],
    ["shiddiq", "ash-shiddiq", "shiddiq", "orang yang sangat jujur imannya"],
    ["auliya", "al-auliya'", "para wali"],
    ["anbiya", "al-anbiya'", "para nabi"],
    ["muqarrabun", "al-muqarrabun", "orang-orang yang didekatkan", "muqarrabun"],
    ["mubtadiah", "al-mubtadi'ah", "ahli bid'ah"],
    ["ghafil", "al-ghafil", "orang yang lalai"],
  ]),
  ...rows("ilmu", true, [
    ["ilmu", "'ilm", "ilmu"],
    ["ilmu-muamalah", "'ilm al-mu'amalah", "ilmu mu'amalah", "ilmu tentang keadaan hati dan amal"],
    ["ilmu-mukasyafah", "'ilm al-mukasyafah", "ilmu mukasyafah", "ilmu penyingkapan"],
    ["fikih", "al-fiqh", "fikih"],
    ["ushul-fikih", "ushul al-fiqh", "ushul fikih"],
    ["ilmu-kalam", "al-kalam", "ilmu kalam"],
    ["tafsir", "at-tafsir", "tafsir"],
    ["hadis", "al-hadits", "hadis"],
    ["atsar", "al-atsar", "atsar", "riwayat dari sahabat atau tabiin"],
    ["khabar", "al-khabar", "riwayat"],
    ["sanad", "al-isnad", "sanad"],
    ["ijmak", "al-ijma'", "ijmak"],
    ["kias", "al-qiyas", "kias"],
    ["ijtihad", "al-ijtihad", "ijtihad"],
    ["taklid", "at-taqlid", "taklid"],
    ["akal", "al-'aql", "akal"],
    ["naqli", "an-naql", "dalil naqli"],
    ["burhan", "al-burhan", "bukti"],
  ]),
  ...rows("hukum", true, [
    ["fardu-ain", "fardhu 'ain", "fardu ain"],
    ["fardu-kifayah", "fardhu kifayah", "fardu kifayah"],
    ["wajib", "al-wajib", "wajib"],
    ["sunah-hukum", "as-sunnah (hukum)", "sunah"],
    ["mustahab", "al-mustahabb / al-mandub", "dianjurkan"],
    ["makruh", "al-makruh", "makruh"],
    ["haram", "al-haram", "haram"],
    ["halal", "al-halal", "halal"],
    ["mubah", "al-mubah", "mubah"],
    ["syubhat", "asy-syubhat", "syubhat"],
    ["bidah", "al-bid'ah", "bid'ah"],
    ["maksiat", "al-ma'shiyah", "maksiat"],
    ["dosa", "adz-dzanb", "dosa"],
  ]),
  ...rows("ibadah", true, [
    ["taharah", "ath-thaharah", "bersuci", "taharah"],
    ["wudu", "al-wudhu", "wudu"],
    ["tayamum", "at-tayammum", "tayamum"],
    ["mandi-wajib", "al-ghusl", "mandi wajib"],
    ["salat", "ash-shalah", "salat"],
    ["jamaah", "al-jama'ah", "jamaah"],
    ["salat-jumat", "al-jumu'ah", "salat Jumat"],
    ["imam", "al-imam", "imam"],
    ["zakat", "az-zakah", "zakat"],
    ["sedekah", "ash-shadaqah", "sedekah"],
    ["puasa", "ash-shaum", "puasa"],
    ["haji", "al-hajj", "haji"],
    ["umrah", "al-'umrah", "umrah"],
    ["zikir", "adz-dzikr", "zikir"],
    ["wirid", "al-wird / al-aurad", "wirid"],
    ["doa", "ad-du'a", "doa"],
    ["tilawah", "tilawah al-Qur'an", "membaca Al-Qur'an"],
    ["qiyamul-lail", "qiyam al-lail", "salat malam"],
    ["tahajud", "at-tahajjud", "tahajud"],
    ["iktikaf", "al-i'tikaf", "iktikaf"],
  ]),
  ...rows("hati", true, [
    ["qalb", "al-qalb", "hati"],
    ["nafs", "an-nafs", "nafsu", "atau jiwa, sesuai konteks"],
    ["ruh", "ar-ruh", "ruh"],
    ["hawa", "al-hawa", "hawa nafsu"],
    ["syahwat", "asy-syahwah", "syahwat"],
    ["ghadhab", "al-ghadhab", "amarah"],
    ["khawathir", "al-khawathir", "bisikan hati"],
    ["waswas", "al-waswasah", "was-was"],
    ["setan", "asy-syaithan", "setan"],
    ["iblis", "al-iblis", "Iblis"],
    ["malaikat", "al-malak / al-mala'ikah", "malaikat"],
    ["niat", "an-niyyah", "niat"],
    ["ikhlas", "al-ikhlash", "ikhlas"],
    ["shidq", "ash-shidq", "kejujuran", "shidq"],
  ]),
  ...rows("muhlikat", true, [
    ["riya", "ar-riya'", "riya'", "pamer amal"],
    ["ujub", "al-'ujb", "'ujub", "bangga diri"],
    ["takabur", "al-kibr", "takabur"],
    ["ghurur", "al-ghurur", "ghurur", "tertipu"],
    ["hasad", "al-hasad", "hasad", "dengki"],
    ["hiqd", "al-hiqd", "dendam"],
    ["bukhl", "al-bukhl", "kikir"],
    ["cinta-dunia", "hubb ad-dunya", "cinta dunia"],
    ["cinta-kedudukan", "hubb al-jah", "cinta kedudukan"],
    ["gibah", "al-ghibah", "gibah"],
    ["namimah", "an-namimah", "namimah", "adu domba"],
    ["dusta", "al-kadzib", "dusta"],
    ["rakus-makan", "syarah ath-tha'am", "rakus makan"],
    ["ghaflah", "al-ghaflah", "kelalaian"],
    ["panjang-angan", "thul al-amal", "panjang angan-angan"],
  ]),
  ...rows("munjiyat", true, [
    ["tobat", "at-taubah", "tobat"],
    ["sabar", "ash-shabr", "sabar"],
    ["syukur", "asy-syukr", "syukur"],
    ["khauf", "al-khauf", "khauf", "rasa takut kepada Allah"],
    ["raja", "ar-raja'", "raja'", "harapan kepada Allah"],
    ["faqr", "al-faqr", "kefakiran"],
    ["zuhud", "az-zuhd", "zuhud"],
    ["tauhid", "at-tauhid", "tauhid"],
    ["tawakal", "at-tawakkul", "tawakal"],
    ["mahabbah", "al-mahabbah", "mahabbah", "cinta kepada Allah"],
    ["syauq", "asy-syauq", "rindu"],
    ["uns", "al-uns", "keakraban", "uns"],
    ["rida", "ar-ridha", "rida"],
    ["muraqabah", "al-muraqabah", "muraqabah"],
    ["muhasabah", "al-muhasabah", "muhasabah", "introspeksi"],
    ["tafakur", "at-tafakkur", "tafakur"],
    ["mengingat-mati", "dzikr al-maut", "mengingat mati"],
    ["wara", "al-wara'", "wara'", "kehati-hatian dari yang syubhat"],
    ["takwa", "at-taqwa", "takwa"],
    ["khusyuk", "al-khusyu'", "khusyuk"],
    ["tawadhu", "at-tawadhu'", "tawadhu'"],
    ["yakin", "al-yaqin", "keyakinan", "yakin"],
    ["kanaah", "al-qana'ah", "kanaah"],
  ]),
  ...rows("jalan", true, [
    ["thariq", "ath-thariq", "jalan", "menuju Allah"],
    ["maqam", "al-maqam / al-maqamat", "maqam"],
    ["hal", "al-hal / al-ahwal", "hal", "keadaan batin"],
    ["makrifat", "al-ma'rifah", "ma'rifat"],
    ["mukasyafah", "al-mukasyafah", "mukasyafah", "penyingkapan"],
    ["musyahadah", "al-musyahadah", "musyahadah", "penyaksian"],
    ["mujahadah", "al-mujahadah", "mujahadah", "perjuangan melawan nafsu"],
    ["riyadhah", "ar-riyadhah", "riyadhah", "latihan jiwa"],
    ["akhlak", "al-akhlaq", "akhlak"],
    ["adab", "al-adab", "adab"],
    ["muamalah", "al-mu'amalah", "mu'amalah"],
  ]),
  ...rows("akhirat", true, [
    ["dunia", "ad-dunya", "dunia"],
    ["akhirat", "al-akhirah", "akhirat"],
    ["kubur", "al-qabr", "kubur"],
    ["kiamat", "al-qiyamah", "kiamat"],
    ["hisab", "al-hisab", "hisab"],
    ["surga", "al-jannah", "surga"],
    ["neraka", "an-nar / jahannam", "neraka"],
    ["sirat", "ash-shirath", "sirat"],
    ["mizan", "al-mizan", "mizan", "timbangan amal"],
    ["pahala", "ats-tsawab", "pahala"],
    ["siksa", "al-'iqab", "siksa"],
    ["ruyah", "ar-ru'yah", "melihat Allah", "di akhirat"],
  ]),
].map((e) => (SPOKEN[e.key] === undefined ? e : { ...e, spoken: SPOKEN[e.key] }));

/** Kunci istilah yang boleh dipilih model Intisari (enum skema keluaran), urut glosarium. */
export const GLOSSARY_TERM_KEYS: readonly string[] = GLOSSARY_TERMS.filter((e) => e.term).map(
  (e) => e.key,
);

/** Bentuk tulis lengkap satu entri: label + padanan dalam kurung (bentuk kanan di v1). */
export function glossaryWritten(e: Pick<GlossaryEntry, "label" | "note">): string {
  return e.note === undefined ? e.label : `${e.label} (${e.note})`;
}

/** Bentuk lisan (X17): singkatan diuraikan, selain itu label. */
export function glossarySpoken(e: Pick<GlossaryEntry, "label" | "spoken">): string {
  return e.spoken ?? e.label;
}

function glossaryText(entries: readonly GlossaryEntry[]): string {
  const groups = Object.entries(GLOSSARY_GROUPS).map(([group, title]) => {
    const lines = entries
      .filter((e) => e.group === group)
      .map((e) => `- ${e.source} → ${glossaryWritten(e)}${e.term ? ` [${e.key}]` : ""}`);
    return `${title}\n${lines.join("\n")}`;
  });
  return `Glosarium istilah (tulis bentuk di kanan panah; padanan dalam kurung hanya pada kemunculan pertama di satu teks). Kunci dalam kurung siku, misalnya [ikhlas], dipakai HANYA di daftar "istilah", tidak pernah ditulis di teks:

${groups.join("\n\n")}`;
}

/** Glosarium prompt Intisari, dibangkitkan dari `GLOSSARY_TERMS` (deterministik). */
export const GLOSSARY_V2 = glossaryText(GLOSSARY_TERMS);
