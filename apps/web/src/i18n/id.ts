// Semua string UI Surau (bahasa Indonesia) dikumpulkan di sini (KONVENSI: Bahasa).
// Komponen tidak menulis string UI langsung; ambil dari objek `id`.

import { meta } from "./id/meta";
import { brand } from "./id/brand";
import { nav } from "./id/nav";
import { theme } from "./id/theme";
import { common } from "./id/common";
import { footer } from "./id/footer";
import { home } from "./id/home";
import { landing } from "./id/landing";
import { mcp } from "./id/mcp";
import { about } from "./id/about";
import { license } from "./id/license";
import { listen } from "./id/listen";
import { reader } from "./id/reader";
import { readMode } from "./id/readMode";
import { search } from "./id/search";
import { error } from "./id/error";
import { notFound } from "./id/notFound";
import { devBook } from "./id/devBook";
import { intisari } from "./id/intisari";

// Objek lengkap untuk server component dan modul server. Komponen klien mengimpor bagiannya
// langsung dari `./id/<bagian>` (X09): objek ini menarik seluruh kamus ke bundle browser.
export const id = {
  meta,
  brand,
  nav,
  theme,
  common,
  footer,
  home,
  landing,
  mcp,
  about,
  license,
  listen,
  reader,
  readMode,
  search,
  error,
  notFound,
  devBook,
  intisari,
} as const;

export const SOURCE_URL = "https://github.com/alfariesh/surau";
export const MCP_URL = "https://mcp.surau.org/mcp";
/** Laporan publik (koreksi, takedown) sampai ada email kontak (T-10 butir 3, dijawab 2026-10-16). */
export const ISSUES_URL = `${SOURCE_URL}/issues/new`;
