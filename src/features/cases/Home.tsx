import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus, Search, PenLine } from "lucide-react";
import { useAuth } from "../auth/Auth";
import { db } from "../../lib/supabase/client";
import { defaultFilters, listCases, summary } from "./service";
import { titleOf, numberOf } from "./model";
import { CaseCard, QueryState } from "../../components/CaseCard";
import { InstallSuggestion } from "../install/InstallApp";
export function HomePage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const profile = useQuery({
    queryKey: ["profile", session?.user.id],
    queryFn: async () => {
      const { data, error } = await db().from("profiles").select("*").single();
      if (error) throw error;
      return data as { display_name: string };
    },
  });
  const stats = useQuery({ queryKey: ["cases", "summary"], queryFn: summary });
  const recent = useQuery({
    queryKey: ["cases", "recent"],
    queryFn: () => listCases(defaultFilters),
  });
  const draft = useQuery({
    queryKey: ["cases", "draft"],
    queryFn: () => listCases({ ...defaultFilters, status: "draft" }),
  });
  const latest = draft.data?.cases[0];
  return (
    <div className="home page">
      <InstallSuggestion />
      <div className="page-heading">
        <div>
          <h1>
            Hello
            {profile.data?.display_name
              ? `, ${profile.data.display_name.split(" ")[0]}`
              : ""}
            .
          </h1>
        </div>
        <Link className="button primary" to="/cases/new">
          <Plus size={18} />
          New Case
        </Link>
      </div>
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q");
          navigate(`/cases?q=${encodeURIComponent(String(q))}`);
        }}
      >
        <Search size={19} />
        <input
          name="q"
          aria-label="Search cases"
          placeholder="Search your cases…"
        />
        <button aria-label="Search">
          <ArrowRight size={18} />
        </button>
      </form>
      <div className="summary-strip">
        {[
          ["Total cases", stats.data?.total],
          ["Completed", stats.data?.completed],
          ["Drafts", stats.data?.drafts],
        ].map(([name, value]) => (
          <div key={name}>
            <strong>{stats.isError ? "—" : (value ?? "…")}</strong>
            <span>{name}</span>
          </div>
        ))}
      </div>
      {latest && (
        <section className="continue">
          <div className="row">
            <span className="eyebrow">
              <PenLine size={14} /> CONTINUE WRITING
            </span>
            <span className="badge draft">Draft</span>
          </div>
          <h2>{titleOf(latest)}</h2>
          <p className="small muted">
            {numberOf(latest.case_number)} ·{" "}
            {latest.department || "Your next clinical note"}
          </p>
          <Link to={`/cases/${latest.id}/edit`} className="text-action">
            Resume case <ArrowRight size={16} />
          </Link>
        </section>
      )}
      <div className="row section-heading">
        <h2>Recent cases</h2>
        <Link className="text-action" to="/cases">
          View all <ArrowRight size={16} />
        </Link>
      </div>
      <QueryState
        loading={recent.isLoading}
        error={recent.error}
        empty={!recent.data?.cases.length}
      />
      <div className="case-grid">
        {recent.data?.cases.slice(0, 5).map((c) => (
          <CaseCard key={c.id} c={c} compact />
        ))}
      </div>
    </div>
  );
}
