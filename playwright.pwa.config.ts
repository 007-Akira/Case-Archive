import { defineConfig } from "@playwright/test";
const externalBase = process.env.E2E_BASE_URL;
export default defineConfig({
  testDir: "./tests/pwa",
  use: { baseURL: externalBase ?? "http://127.0.0.1:4173" },
  webServer: externalBase
    ? undefined
    : { command: "npm run preview", url: "http://127.0.0.1:4173" },
});
