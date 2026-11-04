import { test, expect } from "@playwright/test";
test("production manifest, service worker and offline shell contain no API cache", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  const manifest = await page.request.get("/manifest.webmanifest");
  const data = await manifest.json();
  expect(data.display).toBe("fullscreen");
  expect(data.display_override).toEqual(["fullscreen", "standalone"]);
  expect(data.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(["192x192", "512x512"]),
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const cached = await page.evaluate(async () => {
    const entries = await Promise.all(
      (await caches.keys()).map(async (name) =>
        (await (await caches.open(name)).keys()).map((r) => r.url),
      ),
    );
    return entries.flat();
  });
  expect(cached.length).toBeGreaterThan(0);
  expect(
    cached.every(
      (url) =>
        !url.includes("supabase.co") &&
        !url.includes("/rest/v1/") &&
        !url.includes("/auth/v1/"),
    ),
  ).toBe(true);
  await context.setOffline(true);
  await page.goto("/cases");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
});
