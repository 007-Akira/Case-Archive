import type { Page } from "@playwright/test";
import { emptyValues } from "../../src/features/cases/model";
export async function mockWorkspace(page: Page) {
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" }))}.test`;
  let cases = [
    {
      ...emptyValues(),
      id: "22222222-2222-4222-8222-222222222222",
      user_id: user.id,
      case_number: 1,
      patient_alias: "TEST-01",
      age: 42,
      department: "Medicine",
      chief_complaints: "Test clinical complaint",
      status: "draft",
      is_favorite: false,
      created_at: "2026-11-01T08:00:00Z",
      updated_at: "2026-11-02T08:00:00Z",
      completed_at: null,
    },
  ];
  await page.route("https://casebook-test.supabase.co/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-expose-headers": "content-range",
      "content-type": "application/json",
    };
    if (request.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (url.pathname.includes("/auth/"))
      return route.fulfill({
        json: {
          access_token: token,
          refresh_token: "test-refresh",
          expires_in: 3600,
          token_type: "bearer",
          user,
        },
        headers,
      });
    if (url.pathname.endsWith("/profiles"))
      return route.fulfill({
        json: { id: user.id, display_name: "Test Doctor" },
        headers,
      });
    if (url.pathname.endsWith("/cases")) {
      if (request.method() === "POST") {
        const payload = request.postDataJSON();
        const i = cases.findIndex((c) => c.id === payload.id);
        if (i >= 0) cases[i] = { ...cases[i], ...payload };
        else
          cases.push({
            ...cases[0],
            ...payload,
            case_number: cases.length + 1,
          });
        return route.fulfill({ status: 201, body: "", headers });
      }
      const id = url.searchParams.get("id")?.replace("eq.", "");
      let result = cases.filter(
        (c) =>
          (!id || c.id === id) &&
          (!url.searchParams.get("status") ||
            `eq.${c.status}` === url.searchParams.get("status")),
      );
      if (request.method() === "DELETE") {
        cases = cases.filter((c) => c.id !== id);
        return route.fulfill({ status: 204, headers });
      }
      if (request.method() === "PATCH") {
        cases = cases.map((c) =>
          c.id === id ? { ...c, ...request.postDataJSON() } : c,
        );
        return route.fulfill({ status: 204, headers });
      }
      if (request.method() === "HEAD")
        return route.fulfill({
          status: 200,
          body: "",
          headers: { ...headers, "content-range": `0-0/${result.length}` },
        });
      return route.fulfill({
        json: request.headers()["accept"]?.includes("vnd.pgrst.object")
          ? result[0]
          : result,
        headers: {
          ...headers,
          "content-range": `0-${result.length - 1}/${result.length}`,
        },
      });
    }
    return route.fulfill({ json: [], headers });
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("test-password-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
