// Tanda Surau: kitab terbuka di dalam bidang beraksen. Simbol kitab, tanpa wajah atau sosok
// (docs/05 §3). Warna mengikuti palet lewat `--accent`/`--accent-foreground`.

export function SurauMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} focusable="false" viewBox="0 0 32 32">
      <rect fill="var(--accent)" height="32" rx="9" width="32" />
      <path
        d="M8 10.6c2.7-1 5.3-.7 7.4.9v11.3c-2.1-1.5-4.7-1.8-7.4-.9zM24 10.6c-2.7-1-5.3-.7-7.4.9v11.3c2.1-1.5 4.7-1.8 7.4-.9z"
        fill="var(--accent-foreground)"
      />
    </svg>
  );
}
