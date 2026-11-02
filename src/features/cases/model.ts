import { z } from "zod";
export const sections = [
  ["Patient details", ["patient_alias", "age", "sex", "occupation"]],
  ["Admission details", ["department", "ward", "bed_number", "encounter_date"]],
  [
    "Presenting complaints",
    ["chief_complaints", "complaint_duration", "history_of_presenting_illness"],
  ],
  [
    "Clinical history",
    [
      "positive_history",
      "negative_history",
      "other_history_label",
      "other_history",
      "past_medical_surgical_history",
      "personal_history",
      "family_history",
    ],
  ],
  [
    "Examination & investigations",
    [
      "general_examination",
      "systemic_examination",
      "investigations",
      "important_findings",
    ],
  ],
  ["Diagnosis", ["provisional_diagnosis", "final_diagnosis"]],
  [
    "Management",
    ["treatment_management", "outcome", "follow_up", "additional_notes"],
  ],
] as const;
export const fields = sections.flatMap(([, names]) => [...names]);
export type Field = (typeof fields)[number];
export const labels: Partial<Record<Field, string>> = {
  patient_alias: "Patient alias",
  chief_complaints: "Chief presenting complaints",
  history_of_presenting_illness: "History of presenting illness",
  past_medical_surgical_history: "Past medical and surgical history",
  encounter_date: "Encounter date",
  treatment_management: "Treatment / management",
  other_history_label: "Other history section label",
};
export const label = (key: string) =>
  labels[key as Field] ??
  key.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
export const draftSchema = z
  .object(
    Object.fromEntries(
      fields.map((f) => [
        f,
        z.string().max(100000, "Please shorten this entry"),
      ]),
    ) as Record<Field, z.ZodString>,
  )
  .extend({
    age: z
      .string()
      .refine(
        (v) => v === "" || (/^\d+$/.test(v) && Number(v) <= 130),
        "Enter an age from 0 to 130",
      ),
    differential_diagnoses: z
      .array(z.object({ diagnosis: z.string().max(2000) }))
      .max(50),
  });
export type CaseValues = z.infer<typeof draftSchema>;
export type CaseRecord = Omit<CaseValues, "age"> & {
  age: number | null;
  id: string;
  user_id: string;
  case_number: number;
  last_step: number;
  status: "draft" | "completed";
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};
export const emptyValues = () =>
  ({
    ...(Object.fromEntries(fields.map((f) => [f, ""])) as Record<
      Field,
      string
    >),
    differential_diagnoses: [],
  }) as CaseValues;
export function valuesOf(c: CaseRecord): CaseValues {
  return {
    ...Object.fromEntries(fields.map((f) => [f, String(c[f] ?? "")])),
    differential_diagnoses: c.differential_diagnoses ?? [],
  } as CaseValues;
}
export function completionErrors(v: CaseValues) {
  return [
    "patient_alias",
    "department",
    "chief_complaints",
    "final_diagnosis",
  ].filter((k) => !v[k as Field].trim());
}
export const titleOf = (
  c: Pick<CaseRecord, "final_diagnosis" | "chief_complaints">,
) => c.final_diagnosis || c.chief_complaints || "Untitled case";
export const numberOf = (n: number) => `CB-${String(n).padStart(3, "0")}`;
export const dateOf = (d: string) =>
  new Date(d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
