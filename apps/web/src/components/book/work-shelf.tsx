import type { BookRingItem } from "./book-ring";
import type { WorkCoverData } from "./work-cover";

import { home as homeText } from "../../i18n/id/home";
import { reader as readerText } from "../../i18n/id/reader";
import { CITE_AUTHOR } from "../../content/works";
import { ArabicInline } from "../arabic";
import { BookPattern } from "./book";
import { BookRing } from "./book-ring";

const t = readerText;

/** Warna sampul bergiliran: zaitun, tanah liat, nila, cokelat, hijau laut (gelap, kontras teks putih). */
const COVER_COLORS = [
  "var(--book-zaitun)",
  "oklch(0.5 0.1 45)",
  "oklch(0.42 0.07 255)",
  "oklch(0.42 0.06 70)",
  "oklch(0.45 0.06 195)",
] as const;

export interface ShelfWork extends WorkCoverData {
  href: string;
}

// Rak karya (Server Component): menyusun isi BookRing dari daftar karya DB. Judul Arab selalu dari
// DB lewat ArabicInline (sampul, punggung, dan keterangan); judul Latin dan pengarang di bawahnya.
export function WorkShelf({ works, label }: { works: readonly ShelfWork[]; label: string }) {
  const items: BookRingItem[] = works.map((work, index) => {
    const latin = work.title_id ?? work.title_ar;
    const author = CITE_AUTHOR[work.slug] ?? work.author?.name_id ?? null;
    const died = work.author?.death_hijri ? t.deathHijri(work.author.death_hijri) : null;
    const byline = [author, died].filter(Boolean).join(" · ");
    return {
      key: work.slug,
      href: work.href,
      label: t.openWork(latin),
      color: COVER_COLORS[index % COVER_COLORS.length]!,
      illustration: <BookPattern id={`shelf-pattern-${work.slug}`} />,
      title: <ArabicInline>{work.title_ar}</ArabicInline>,
      subtitle: (
        <>
          {work.title_id ? <span dir="ltr">{work.title_id}</span> : null}
          {work.title_id && byline ? <br /> : null}
          {byline ? <span dir="ltr">{byline}</span> : null}
        </>
      ),
      spine: (
        <>
          <ArabicInline>{work.title_ar}</ArabicInline>
          {author ? <span className="book-spine-author">{author}</span> : null}
        </>
      ),
    };
  });
  return <BookRing items={items} label={label} ofLabel={homeText.shelfOf} />;
}
