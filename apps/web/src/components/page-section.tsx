import type { ReactNode } from "react";
import { Typography } from "@heroui/react";

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
      <Typography.Heading level={2} id={`judul-${sectionId}`} className="text-xl">
        {heading}
      </Typography.Heading>
      {children}
    </section>
  );
}
