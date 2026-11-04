import { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useBlocker,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../auth/Auth";
import {
  draftSchema,
  emptyValues,
  valuesOf,
  sections,
  label,
  completionErrors,
  numberOf,
  type CaseRecord,
  type CaseValues,
} from "./model";
import { getCase, saveCase } from "./service";
import { useAutosave } from "./useAutosave";
import { DeleteCaseButton } from "../../components/DeleteCase";
import { Dialog } from "../../components/ui/dialog";
export function EditorPage() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["cases", id],
    queryFn: () => getCase(id!),
    enabled: !!id,
  });
  if (id && query.isLoading) return <p>Opening case…</p>;
  if (query.error)
    return (
      <p role="alert">This case is unavailable or you do not have access.</p>
    );
  return <CaseEditor key={id ?? "new"} record={query.data} />;
}
function CaseEditor({ record }: { record?: CaseRecord }) {
  const { session } = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const step = Math.max(
    0,
    Math.min(6, Number(params.get("step") ?? record?.last_step ?? 0) || 0),
  );
  const [id] = useState(() => record?.id ?? crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const allowNavigation = useRef(false);
  const persisted = useRef(Boolean(record));
  const form = useForm<CaseValues>({
    defaultValues: record ? valuesOf(record) : emptyValues(),
    resolver: zodResolver(draftSchema),
    mode: "onBlur",
  });
  const values = useWatch({ control: form.control }) as CaseValues;
  const differentials = useFieldArray({
    control: form.control,
    name: "differential_diagnoses",
  });
  const status = record?.status ?? "draft";
  const { state, dirty, flush, pause, resume } = useAutosave(
    values,
    !completed,
    async (snapshot) => {
      const validated = draftSchema.parse(snapshot);
      await saveCase(id, session!.user.id, validated, status, step);
      persisted.current = true;
      void client.invalidateQueries({ queryKey: ["cases"] });
    },
    Boolean(record),
  );
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowNavigation.current &&
      dirty &&
      currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    document.querySelectorAll("textarea").forEach((t) => {
      t.style.height = "auto";
      t.style.height = `${Math.max(112, t.scrollHeight)}px`;
    });
  }, [values, step]);
  async function save(complete = false) {
    setBusy(true);
    try {
      if (!(await form.trigger()))
        throw new Error("Please correct the highlighted fields.");
      if (complete) {
        const missing = completionErrors(form.getValues());
        if (missing.length) {
          for (const name of missing)
            form.setError(name as keyof CaseValues, {
              message: "Required to complete this case",
            });
          const target = sections.findIndex(([, names]) =>
            names.some((n) => missing.includes(n)),
          );
          setParams({ step: String(target) }, { replace: true });
          throw new Error(
            "Add a patient alias, department, presenting complaint, and final diagnosis to complete.",
          );
        }
      }
      if (!(await flush(!persisted.current)))
        throw new Error(
          "Save failed. Your notes are still here. Reconnect and retry.",
        );
      if (complete) {
        await saveCase(
          id,
          session!.user.id,
          form.getValues(),
          "completed",
          step,
        );
        setCompleted(true);
        allowNavigation.current = true;
        await client.invalidateQueries({ queryKey: ["cases"] });
        toast.success("Case completed");
        navigate(`/cases/${id}`);
      } else toast.success("Draft saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save case.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page editor-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {record ? numberOf(record.case_number) : "NEW CLINICAL NOTE"}
          </p>
          <h1>{record ? "Edit case" : "New Case"}</h1>
        </div>
        <span
          className={`save-status ${state === "Save failed" ? "error" : ""}`}
          role="status"
        >
          {state === "Saved" ? <Check size={14} /> : null}
          {state}
        </span>
      </div>
      <p className="notice small">
        Use de-identified aliases. Remove identifying information from all
        notes; an alias alone does not ensure de-identification.
      </p>
      {record && (
        <div className="editor-delete">
          <DeleteCaseButton
            record={record}
            beforeDelete={pause}
            onFailed={resume}
            onDeleted={() => {
              allowNavigation.current = true;
              navigate("/cases");
            }}
          />
        </div>
      )}
      <div className="form-layout">
        <nav className="stepper" aria-label="Case sections">
          {sections.map(([name], i) => (
            <button
              key={name}
              className={step === i ? "active" : ""}
              aria-current={step === i ? "step" : undefined}
              onClick={() => setParams({ step: String(i) }, { replace: true })}
            >
              <span>{i + 1}</span>
              <span>{name}</span>
            </button>
          ))}
        </nav>
        <form
          className="clinical-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 6)
              setParams({ step: String(step + 1) }, { replace: true });
            else void save(true);
          }}
        >
          <p className="eyebrow">STEP {step + 1} OF 7</p>
          <h2>{sections[step][0]}</h2>
          {step === 0 && (
            <p className="small muted">
              Case ID:{" "}
              {record
                ? numberOf(record.case_number)
                : "Assigned automatically when saved"}
            </p>
          )}
          <div className="fields">
            {sections[step][1].map((name) => (
              <label key={name}>
                {name === "other_history"
                  ? values.other_history_label || label(name)
                  : label(name)}
                {name === "sex" ? (
                  <select {...form.register(name)}>
                    <option value="">Select sex</option>
                    {["Female", "Male", "Other", "Not recorded"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                ) : [
                    "patient_alias",
                    "age",
                    "occupation",
                    "department",
                    "ward",
                    "bed_number",
                    "encounter_date",
                    "complaint_duration",
                    "other_history_label",
                  ].includes(name) ? (
                  <input
                    {...form.register(name)}
                    type={
                      name === "age"
                        ? "number"
                        : name === "encounter_date"
                          ? "date"
                          : "text"
                    }
                    min={name === "age" ? 0 : undefined}
                    max={name === "age" ? 130 : undefined}
                  />
                ) : (
                  <textarea {...form.register(name)} rows={4} />
                )}{" "}
                {form.formState.errors[name] && (
                  <span role="alert" className="error small">
                    {form.formState.errors[name]?.message}
                  </span>
                )}
              </label>
            ))}
          </div>
          {step === 5 && (
            <div className="differentials">
              <h3>Differential diagnoses</h3>
              {differentials.fields.map((field, i) => (
                <div className="row" key={field.id}>
                  <input
                    aria-label={`Differential diagnosis ${i + 1}`}
                    {...form.register(`differential_diagnoses.${i}.diagnosis`)}
                  />
                  <button
                    type="button"
                    aria-label={`Remove diagnosis ${i + 1}`}
                    onClick={() => differentials.remove(i)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => differentials.append({ diagnosis: "" })}
              >
                <Plus size={16} />
                Add diagnosis
              </button>
            </div>
          )}
          <div className="form-actions">
            <button
              type="button"
              disabled={step === 0}
              onClick={() =>
                setParams({ step: String(step - 1) }, { replace: true })
              }
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button type="button" disabled={busy} onClick={() => void save()}>
              Save {status === "completed" ? "changes" : "draft"}
            </button>
            <button className="primary" disabled={busy} type="submit">
              {busy ? "Saving…" : step === 6 ? "Complete case" : "Continue"}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
      <Dialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.state === "blocked") blocker.reset();
        }}
        title="Unsaved changes"
        description="Your latest changes have not been confirmed by the database."
      >
        <div className="stack">
          <button
            className="primary"
            onClick={async () => {
              if ((await flush()) && blocker.state === "blocked")
                blocker.proceed();
            }}
          >
            Save and leave
          </button>
          <button
            onClick={() => {
              if (blocker.state === "blocked") blocker.reset();
            }}
          >
            Keep writing
          </button>
          <button
            className="danger"
            onClick={() => {
              if (blocker.state === "blocked") blocker.proceed();
            }}
          >
            Discard unsaved changes
          </button>
        </div>
      </Dialog>
    </div>
  );
}
