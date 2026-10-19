import type { ReactNode } from "react";

/** Bagian halaman teks (Tentang, Lisensi): judul h2 + isi, dengan jangkar `#<id>`. */
export function PageSection({
  children,
  heading,
  id: sectionId,
}: {
  children: ReactNode;
  heading: string;
  id: string;
}) {
  return (
    <section
      aria-labelledby={`judul-${sectionId}`}
      className="flex scroll-mt-24 flex-col gap-3"
      id={sectionId}
    >
      <h2 className="text-foreground text-xl font-semibold" id={`judul-${sectionId}`}>
        {heading}
      </h2>
      {children}
    </section>
  );
}
