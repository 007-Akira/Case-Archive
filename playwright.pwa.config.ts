import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/pwa",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: { command: "npm run preview", url: "http://127.0.0.1:4173" },
});
