import { describe, expect, it } from "vite-plus/test";

import { NAV_ITEMS, findActiveNavItem, navTitle } from "./nav-items";

// Menu Cari dihapus (ADR-088): /cari menyorot Beranda di sidebar, tetapi judul navbar tetap "Cari".
describe("menu aktif", () => {
  it("tidak ada menu Cari; /cari menyorot Beranda dengan judul Cari", () => {
    expect(NAV_ITEMS.some((item) => item.href === "/cari")).toBe(false);
    expect(findActiveNavItem("/cari")?.id).toBe("home");
    expect(navTitle("/cari")).toBe("Cari");
  });

  it("menu lain tidak berubah", () => {
    expect(findActiveNavItem("/home")?.id).toBe("home");
    expect(navTitle("/home")).toBe("Beranda");
    expect(findActiveNavItem("/kitab/ihya/1/200")?.id).toBe("books");
    expect(navTitle("/tentang")).toBe("Tentang");
    expect(findActiveNavItem("/carian")).toBeUndefined();
  });
});
