import { describe, it, expect } from "vitest";
import {
  completionErrors,
  draftSchema,
  emptyValues,
  titleOf,
  numberOf,
  valuesOf,
  type CaseRecord,
} from "../src/features/cases/model";
describe("case validation", () => {
  it("allows an entirely incomplete draft", () => {
    expect(draftSchema.safeParse(emptyValues()).success).toBe(true);
  });
  it("requires meaningful minimum fields only for completion", () => {
    expect(completionErrors(emptyValues())).toEqual([
      "patient_alias",
      "department",
      "chief_complaints",
      "final_diagnosis",
    ]);
    expect(
      completionErrors({
        ...emptyValues(),
        patient_alias: "PT-12",
        department: "Medicine",
        chief_complaints: "Cough",
        final_diagnosis: "Pneumonia",
      }),
    ).toEqual([]);
  });
  it.each(["-1", "131", "3.5", "abc"])("rejects invalid age %s", (age) => {
    expect(draftSchema.safeParse({ ...emptyValues(), age }).success).toBe(
      false,
    );
  });
  it("allows a neonate and unrecorded age", () => {
    for (const age of ["0", ""])
      expect(draftSchema.safeParse({ ...emptyValues(), age }).success).toBe(
        true,
      );
  });
  it("prefers diagnosis and then complaint for titles", () => {
    expect(
      titleOf({ final_diagnosis: "Diagnosis", chief_complaints: "Complaint" }),
    ).toBe("Diagnosis");
    expect(
      titleOf({ final_diagnosis: "", chief_complaints: "Complaint" }),
    ).toBe("Complaint");
    expect(titleOf({ final_diagnosis: "", chief_complaints: "" })).toBe(
      "Untitled case",
    );
  });
  it("preserves absent nullable fields when resuming", () => {
    const values = valuesOf({
      ...emptyValues(),
      age: null,
      encounter_date: null,
    } as unknown as CaseRecord);
    expect(values.age).toBe("");
    expect(values.encounter_date).toBe("");
  });
  it("formats identifiers", () => expect(numberOf(2)).toBe("CB-002"));
});
