import { Link } from "react-router-dom";
import { Bookmark, ArrowUpRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type CaseRecord,
  titleOf,
  numberOf,
  dateOf,
} from "../features/cases/model";
import { favoriteCase } from "../features/cases/service";
import { DeleteCaseButton } from "./DeleteCase";
export function CaseCard({
  c,
  compact = false,
}: {
  c: CaseRecord;
  compact?: boolean;
}) {
  const client = useQueryClient();
  if (compact)
    return (
      <article className="compact-case">
        <Link
          className="compact-case-link"
          to={c.status === "draft" ? `/cases/${c.id}/edit` : `/cases/${c.id}`}
        >
          <div className="row">
            <h3>{titleOf(c)}</h3>
            <span className={`badge ${c.status}`}>{c.status}</span>
          </div>
          <p className="small muted">
            {numberOf(c.case_number)} · {c.age !== null ? `${c.age} · ` : ""}
            {c.department || "No department"} · Updated {dateOf(c.updated_at)}
          </p>
        </Link>
        <DeleteCaseButton record={c} iconOnly />
      </article>
    );
  return (
    <article className="case-card">
      <div className="row">
        <span className="mono">{numberOf(c.case_number)}</span>
        <span className="case-card-actions">
          <DeleteCaseButton record={c} iconOnly />
          <button
            className="icon-button"
            aria-label={c.is_favorite ? "Remove favorite" : "Add favorite"}
            aria-pressed={c.is_favorite}
            onClick={async () => {
              try {
                await favoriteCase(c.id, !c.is_favorite);
                await client.invalidateQueries({ queryKey: ["cases"] });
              } catch {
                toast.error("Could not update favorite.");
              }
            }}
          >
            <Bookmark
              size={18}
              fill={c.is_favorite ? "currentColor" : "none"}
            />
          </button>
        </span>
      </div>
      <Link
        className="case-link"
        to={c.status === "draft" ? `/cases/${c.id}/edit` : `/cases/${c.id}`}
      >
        <h3>{titleOf(c)}</h3>
        <p className="muted small">
          {c.department || "No department"}
          {c.patient_alias ? ` · ${c.patient_alias}` : ""}
        </p>
        <div className="row case-footer">
          <span>
            <span className={`badge ${c.status}`}>
              {c.status === "draft" ? "Draft" : "Completed"}
            </span>
            <span className="small muted">{dateOf(c.updated_at)}</span>
          </span>
          <ArrowUpRight size={16} />
        </div>
      </Link>
    </article>
  );
}
export function QueryState({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: unknown;
  empty?: boolean;
}) {
  if (loading)
    return (
      <p className="muted" role="status">
        Loading your archive…
      </p>
    );
  if (error)
    return (
      <p className="notice error" role="alert">
        Unable to retrieve your cases. Check your connection and try again.
      </p>
    );
  if (empty)
    return (
      <div className="empty">
        <h2>A place for your experience.</h2>
        <p className="muted">
          No cases here yet. Start with a new case or adjust your filters.
        </p>
        <Link className="button primary" to="/cases/new">
          Create a case
        </Link>
      </div>
    );
  return null;
}
