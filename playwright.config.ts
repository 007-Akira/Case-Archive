import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  // Live scenarios share one disposable account; avoid cross-scenario auth interference.
  workers: process.env.E2E_EMAIL ? 1 : undefined,
  use: { baseURL: "http://127.0.0.1:5173" },
  webServer: {
    env:
      process.env.E2E_MOCK === "1"
        ? {
            VITE_SUPABASE_URL: "https://casebook-test.supabase.co",
            VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
          }
        : undefined,
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "narrow-mobile", use: { viewport: { width: 320, height: 740 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
  ],
});
