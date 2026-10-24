import type { DigestTermView } from "@surau/core";

import { Typography } from "@heroui/react";

import { intisari as intisariText } from "../../i18n/id/intisari";
import { modelName } from "../../lib/model-names";

const t = intisariText;

/**
 * Istilah Intisari (X16): label transliterasi + definisi singkat AI dari glosarium berkunci
 * (model Intisari hanya memilih kunci, ADR-097). Satu label AI untuk daftar ini, dengan modelnya.
 */
export function TermList({ terms }: { terms: readonly DigestTermView[] }) {
  if (terms.length === 0) return null;
  const models = [...new Set(terms.map((term) => modelName(term.model)))].join(", ");
  return (
    <div className="flex flex-col gap-3">
      <dl className="intisari-terms grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(7rem,auto)_1fr]">
        {terms.map((term) => (
          <div key={term.key} className="contents">
            <dt>
              <Typography lang={term.lang} weight="semibold">
                {term.label}
              </Typography>
            </dt>
            <dd className="m-0">
              <Typography lang={term.lang} type="body-sm">
                {term.gloss}
              </Typography>
            </dd>
          </div>
        ))}
      </dl>
      <Typography color="muted" type="body-xs">
        <span className="ai-badge ms-0">{t.aiBadge}</span> {t.termsNote} ({models})
      </Typography>
    </div>
  );
}
