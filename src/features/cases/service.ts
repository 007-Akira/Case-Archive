import { db } from "../../lib/supabase/client";
import { fields, type CaseRecord, type CaseValues } from "./model";
export type Filters = {
  search: string;
  department: string;
  ward: string;
  sex: string;
  status: string;
  favorite: boolean;
  minAge: string;
  maxAge: string;
  from: string;
  to: string;
  sort: string;
};
export const defaultFilters: Filters = {
  search: "",
  department: "",
  ward: "",
  sex: "",
  status: "",
  favorite: false,
  minAge: "",
  maxAge: "",
  from: "",
  to: "",
  sort: "updated_at",
};
export const PAGE_SIZE = 12;
export async function listCases(f: Filters, page = 0) {
  let q = db().from("cases").select("*", { count: "exact" });
  if (f.search.trim()) {
    const term = f.search.trim().replace(/[%_,().\\]/g, " ");
    const n = Number(term.replace(/^CB-/i, ""));
    q = q.or(
      [
        ...[
          "patient_alias",
          "chief_complaints",
          "provisional_diagnosis",
          "final_diagnosis",
        ].map((k) => `${k}.ilike.%${term}%`),
        ...(Number.isInteger(n) && n > 0 ? [`case_number.eq.${n}`] : []),
      ].join(","),
    );
  }
  for (const key of ["department", "ward", "sex", "status"] as const)
    if (f[key]) q = q.eq(key, f[key]);
  if (f.favorite) q = q.eq("is_favorite", true);
  if (f.minAge) q = q.gte("age", Number(f.minAge));
  if (f.maxAge) q = q.lte("age", Number(f.maxAge));
  if (f.from) q = q.gte("encounter_date", f.from);
  if (f.to) q = q.lte("encounter_date", f.to);
  const { data, error, count } = await q
    .order(f.sort === "oldest" ? "created_at" : f.sort, {
      ascending: f.sort === "oldest",
    })
    .order("id")
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (error) throw error;
  return { cases: data as CaseRecord[], count: count ?? 0 };
}
export async function getCase(id: string) {
  const { data, error } = await db()
    .from("cases")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as CaseRecord;
}
export async function saveCase(
  id: string,
  userId: string,
  v: CaseValues,
  status: "draft" | "completed",
  lastStep = 0,
) {
  const payload = {
    ...Object.fromEntries(
      fields.map((f) => [
        f,
        f === "age"
          ? v.age === ""
            ? null
            : Number(v.age)
          : f === "encounter_date"
            ? v[f] || null
            : v[f],
      ]),
    ),
    last_step: lastStep,
    differential_diagnoses: v.differential_diagnoses,
    status,
  };
  const { error } = await db()
    .from("cases")
    .upsert({ id, user_id: userId, ...payload }, { onConflict: "id" });
  if (error) throw error;
}
export async function favoriteCase(id: string, value: boolean) {
  const { error } = await db()
    .from("cases")
    .update({ is_favorite: value })
    .eq("id", id);
  if (error) throw error;
}
export async function deleteCase(id: string) {
  const { error } = await db().from("cases").delete().eq("id", id);
  if (error) throw error;
}
export async function allCases() {
  const result: CaseRecord[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db()
      .from("cases")
      .select("*")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    result.push(...(data as CaseRecord[]));
    if (data.length < 500) return result;
  }
}
export async function summary() {
  const client = db();
  const results = await Promise.all(
    ["", "draft", "completed"].map(async (status) => {
      let q = client.from("cases").select("id", { count: "exact", head: true });
      if (status) q = q.eq("status", status);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    }),
  );
  return { total: results[0], drafts: results[1], completed: results[2] };
}
