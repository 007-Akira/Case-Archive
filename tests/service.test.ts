import { beforeEach, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const name of [
    "select",
    "eq",
    "or",
    "gte",
    "lte",
    "order",
    "range",
    "upsert",
    "update",
    "delete",
    "single",
  ])
    q[name] = vi.fn();
  return q;
});
vi.mock("../src/lib/supabase/client", () => ({
  db: () => ({ from: vi.fn(() => mock) }),
}));
import {
  listCases,
  defaultFilters,
  saveCase,
  favoriteCase,
  deleteCase,
} from "../src/features/cases/service";
import { emptyValues } from "../src/features/cases/model";
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(mock)) mock[key].mockReturnValue(mock);
  mock.range.mockResolvedValue({ data: [], count: 37, error: null });
  mock.upsert.mockResolvedValue({ error: null });
  mock.eq.mockReturnValue(mock);
});
it("applies server search, filters and the exact second page range", async () => {
  const f = {
    ...defaultFilters,
    search: "CB-042",
    department: "Medicine",
    ward: "B",
    status: "draft",
    sex: "Female",
    favorite: true,
    minAge: "18",
    maxAge: "80",
    from: "2026-01-01",
    to: "2026-11-02",
  };
  const result = await listCases(f, 1);
  expect(mock.or).toHaveBeenCalledWith(
    expect.stringContaining("case_number.eq.42"),
  );
  expect(mock.eq).toHaveBeenCalledWith("department", "Medicine");
  expect(mock.eq).toHaveBeenCalledWith("is_favorite", true);
  expect(mock.gte).toHaveBeenCalledWith("age", 18);
  expect(mock.lte).toHaveBeenCalledWith("encounter_date", "2026-11-02");
  expect(mock.range).toHaveBeenCalledWith(12, 23);
  expect(result.count).toBe(37);
});
it("sends stable identity and nullable structured values when saving a draft", async () => {
  await saveCase("stable-id", "owner", emptyValues(), "draft");
  expect(mock.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "stable-id",
      user_id: "owner",
      status: "draft",
      age: null,
      encounter_date: null,
      final_diagnosis: "",
    }),
    { onConflict: "id" },
  );
});
it("surfaces database failures rather than reporting persistence", async () => {
  mock.upsert.mockResolvedValue({ error: new Error("failed") });
  await expect(saveCase("id", "owner", emptyValues(), "draft")).rejects.toThrow(
    "failed",
  );
});
it("updates a favorite by case identity", async () => {
  mock.eq.mockResolvedValue({ error: null });
  await favoriteCase("case-id", true);
  expect(mock.update).toHaveBeenCalledWith({ is_favorite: true });
  expect(mock.eq).toHaveBeenCalledWith("id", "case-id");
});
it("deletes the requested case", async () => {
  mock.eq.mockResolvedValue({ error: null });
  await deleteCase("case-id");
  expect(mock.delete).toHaveBeenCalled();
  expect(mock.eq).toHaveBeenCalledWith("id", "case-id");
});
