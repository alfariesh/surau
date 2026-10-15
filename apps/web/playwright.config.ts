import { defineConfig, devices } from "@playwright/test";

// Smoke e2e Surau (KONVENSI: Tes): chromium saja, alur utama saja.
// Lokal: `pnpm test:e2e` menyalakan `next dev` di :3004 (atau memakai yang sudah jalan).
// CI preview: BASE_URL diisi URL preview PR, jadi server lokal tidak dijalankan.
const baseURL = process.env.BASE_URL ?? "http://localhost:3004";

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "chromium-ponsel", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
