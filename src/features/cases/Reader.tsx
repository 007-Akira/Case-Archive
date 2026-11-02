import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bookmark,
  Pencil,
  Printer,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { getCase, deleteCase, favoriteCase } from "./service";
import { titleOf, numberOf, dateOf, sections, label } from "./model";
import { Dialog } from "../../components/ui/dialog";
export function ReaderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [more, setMore] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["cases", id],
    queryFn: () => getCase(id!),
  });
  if (query.isLoading) return <p>Opening case…</p>;
  const c = query.data;
  if (!c)
    return (
      <p role="alert">
        Case unavailable. It may have been deleted or you may not have access.
      </p>
    );
  return (
    <div className="page reader-page">
      <div className="reader-toolbar">
        <Link to="/cases" className="text-action">
          <ArrowLeft size={17} />
          My Cases
        </Link>
        <div className="row">
          <button
            className="icon-button"
            aria-label="Favorite case"
            aria-pressed={c.is_favorite}
            onClick={async () => {
              try {
                await favoriteCase(c.id, !c.is_favorite);
                await client.invalidateQueries({ queryKey: ["cases"] });
              } catch {
                toast.error("Could not update favorite");
              }
            }}
          >
            <Bookmark
              size={19}
              fill={c.is_favorite ? "currentColor" : "none"}
            />
          </button>
          <Link className="button" to={`/cases/${id}/edit`}>
            <Pencil size={16} />
            Edit
          </Link>
          <button
            aria-label="More actions"
            className="icon-button"
            onClick={() => setMore(true)}
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>
      <article className="clinical-document">
        <header>
          <p className="eyebrow">CLINICAL CASE · {numberOf(c.case_number)}</p>
          <h1>{titleOf(c)}</h1>
          <p className="muted">
            {c.department || "Clinical archive"} ·{" "}
            {c.encounter_date ? dateOf(c.encounter_date) : dateOf(c.created_at)}{" "}
            <span className={`badge ${c.status}`}>{c.status}</span>
          </p>
        </header>
        <dl className="patient-metadata">
          {[
            "patient_alias",
            "age",
            "sex",
            "occupation",
            "department",
            "ward",
            "bed_number",
            "encounter_date",
          ].map((k) => {
            const value = c[k as keyof typeof c];
            return value !== null && value !== "" ? (
              <div key={k}>
                <dt>{label(k)}</dt>
                <dd>{String(value)}</dd>
              </div>
            ) : null;
          })}
        </dl>
        {sections.slice(2).map(([heading, names]) => {
          const populated = names.filter(
            (n) => n !== "other_history_label" && c[n],
          );
          if (
            !populated.length &&
            !(heading === "Diagnosis" && c.differential_diagnoses.length)
          )
            return null;
          return (
            <section key={heading}>
              <h2>{heading}</h2>
              {populated.map((n) => (
                <div
                  className={n === "final_diagnosis" ? "final-diagnosis" : ""}
                  key={n}
                >
                  <h3>
                    {n === "other_history"
                      ? c.other_history_label || label(n)
                      : label(n)}
                  </h3>
                  <p>{c[n]}</p>
                </div>
              ))}
              {heading === "Diagnosis" &&
                c.differential_diagnoses.length > 0 && (
                  <>
                    <h3>Differential diagnoses</h3>
                    <ul>
                      {c.differential_diagnoses.map((d, i) => (
                        <li key={i}>{d.diagnosis}</li>
                      ))}
                    </ul>
                  </>
                )}
            </section>
          );
        })}
        <footer className="small muted">
          Personal clinical archive · Updated {dateOf(c.updated_at)}
        </footer>
      </article>
      <div className="reader-print">
        <button onClick={() => window.print()}>
          <Printer size={16} />
          Print / Export PDF
        </button>
      </div>
      <Dialog open={more} onOpenChange={setMore} title="Case actions">
        <div className="stack">
          <button
            onClick={() => {
              setMore(false);
              window.print();
            }}
          >
            <Printer size={16} />
            Print / Export PDF
          </button>
          <button
            className="danger"
            onClick={() => {
              setMore(false);
              setConfirm(true);
            }}
          >
            Delete case
          </button>
        </div>
      </Dialog>
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this case?"
        description="This permanently deletes the case from your archive. This action cannot be undone."
      >
        <div className="row">
          <button onClick={() => setConfirm(false)}>Cancel</button>
          <button
            className="danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await deleteCase(c.id);
                await client.invalidateQueries({ queryKey: ["cases"] });
                navigate("/cases");
                toast.success("Case deleted");
              } catch {
                toast.error("Could not delete case");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
