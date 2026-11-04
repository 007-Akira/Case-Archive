import { it, expect } from "vitest";
import { sessionExpired } from "../src/features/auth/session";
it("accepts a session before its authoritative expiry", () => {
  expect(
    sessionExpired("2026-11-11T12:00:00Z", Date.parse("2026-11-11T11:59:59Z")),
  ).toBe(false);
});
it("expires exactly at seven-day cutoff and rejects missing or invalid dates", () => {
  const now = Date.parse("2026-11-11T12:00:00Z");
  for (const value of [
    "2026-11-11T12:00:00Z",
    "2026-11-11T11:59:59Z",
    null,
    "bad-date",
  ])
    expect(sessionExpired(value, now)).toBe(true);
});
