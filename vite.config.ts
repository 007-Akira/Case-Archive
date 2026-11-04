import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    tailwind(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Casebook — Personal Clinical Case Archive",
        short_name: "Casebook",
        description: "Private clinical case documentation",
        theme_color: "#F8F9FE",
        background_color: "#F8F9FE",
        display: "fullscreen",
        display_override: ["fullscreen", "standalone"],
        start_url: "/",
        icons: [
          {
            src: "/icons/casebook-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/casebook-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/casebook-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/auth/, /^\/rest/],
        runtimeCaching: [],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: ["tests/e2e/**", "tests/pwa/**", "node_modules/**"],
  },
});
