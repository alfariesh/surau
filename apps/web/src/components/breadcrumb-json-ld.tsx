import type { Crumb } from "../lib/breadcrumb-jsonld";

import { breadcrumbJsonLd, serializeJsonLd } from "../lib/breadcrumb-jsonld";

export function BreadcrumbJsonLd({ crumbs }: { crumbs: readonly Crumb[] }) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd(crumbs)) }}
      type="application/ld+json"
    />
  );
}
