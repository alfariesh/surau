import type { BookWidth } from "./book";

import { reader as readerText } from "../../i18n/id/reader";
import { CITE_AUTHOR } from "../../content/works";
import { ArabicInline } from "../arabic";
import { Book, BookPattern } from "./book";

const t = readerText;

export interface WorkCoverData {
  slug: string;
  title_ar: string;
  title_id: string | null;
  author: { name_ar: string; name_id: string | null; death_hijri: number | null } | null;
}

// Sampul kitab Surau: Book bergaris hijau zaitun berpola khatam, punggung di kanan seperti
// kitab Arab. Judul Arab persis dari DB (ArabicInline); judul Latin dan pengarang di bawahnya.
// Dekoratif: pembungkus tautan memberi nama aksesibel, dan judul juga ada di heading halaman.
export function WorkCover({
  work,
  width,
  textured = false,
  color = "var(--book-zaitun)",
}: {
  work: WorkCoverData;
  width?: BookWidth;
  textured?: boolean;
  /** Warna sampul; bawaan hijau zaitun (Ihya). Kitab kandidat memakai warna bidangnya. */
  color?: string;
}) {
  const author = CITE_AUTHOR[work.slug] ?? work.author?.name_id ?? null;
  const latin = work.title_id;
  return (
    <div aria-hidden="true" className="contents">
      <Book
        color={color}
        direction="rtl"
        illustration={<BookPattern id={`book-pattern-${work.slug}`} />}
        subtitle={
          latin || author ? (
            <>
              {latin ? <span dir="ltr">{latin}</span> : null}
              {latin && author ? <br /> : null}
              {author ? (
                <span dir="ltr">
                  {author}
                  {work.author?.death_hijri ? ` · ${t.deathHijri(work.author.death_hijri)}` : ""}
                </span>
              ) : null}
            </>
          ) : undefined
        }
        textured={textured}
        title={<ArabicInline>{work.title_ar}</ArabicInline>}
        width={width}
      />
    </div>
  );
}
