"use client";

// Ekspor bernama statis supaya bundler hanya membawa PaperTexture (paket `sideEffects: false`).
// Impor dinamis langsung ke "@paper-design/shaders-react" membawa SEMUA shader paket (±82 KB gzip).
export { PaperTexture } from "@paper-design/shaders-react";
