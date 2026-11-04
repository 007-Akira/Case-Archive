import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { defaultFilters, listCases, PAGE_SIZE } from "./service";
import { Dialog } from "../../components/ui/dialog";
import { CaseCard, QueryState } from "../../components/CaseCard";
export function ArchivePage() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({
    ...defaultFilters,
    search: params.get("q") ?? "",
  });
  const [search, setSearch] = useState(filters.search);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => ({ ...f, search })), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => setPage(0), [filters]);
  const result = useQuery({
    queryKey: ["cases", "archive", filters, page],
    queryFn: () => listCases(filters, page),
    placeholderData: keepPreviousData,
  });
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>My Cases</h1>
          <p className="muted">Your personal library of clinical experience.</p>
        </div>
        <Link className="button primary" to="/cases/new">
          <Plus size={18} />
          New Case
        </Link>
      </div>
      <div className="archive-toolbar">
        <div className="search">
          <Search size={18} />
          <input
            aria-label="Search archive"
            placeholder="Search cases, diagnoses, aliases…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => setOpen(true)}>
          <SlidersHorizontal size={18} />
          Filters
        </button>
      </div>
      <div className="row archive-count">
        <span className="small muted">{result.data?.count ?? "…"} cases</span>
        <select
          aria-label="Sort cases"
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
        >
          <option value="updated_at">Recently updated</option>
          <option value="created_at">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      <QueryState
        loading={result.isLoading}
        error={result.error}
        empty={!result.data?.cases.length}
      />
      <div className="case-grid">
        {result.data?.cases.map((c) => (
          <CaseCard key={c.id} c={c} />
        ))}
      </div>
      {(result.data?.count ?? 0) > PAGE_SIZE && (
        <div className="pagination">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>Page {page + 1}</span>
          <button
            disabled={(page + 1) * PAGE_SIZE >= (result.data?.count ?? 0)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Filter cases"
        description="Narrow your archive by patient, encounter, or case status."
      >
        <div className="filter-fields">
          {(["department", "ward"] as const).map((k) => (
            <label key={k}>
              {k === "ward" ? "Ward" : "Department"}
              <input
                value={filters[k]}
                onChange={(e) =>
                  setFilters({ ...filters, [k]: e.target.value })
                }
              />
            </label>
          ))}
          <label>
            Sex
            <select
              value={filters.sex}
              onChange={(e) => setFilters({ ...filters, sex: e.target.value })}
            >
              <option value="">Any</option>
              {["Female", "Male", "Other", "Not recorded"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">All cases</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          {(["minAge", "maxAge", "from", "to"] as const).map((k) => (
            <label key={k}>
              {
                {
                  minAge: "Minimum age",
                  maxAge: "Maximum age",
                  from: "Encounter from",
                  to: "Encounter to",
                }[k]
              }
              <input
                type={k.includes("Age") ? "number" : "date"}
                min={k.includes("Age") ? 0 : undefined}
                max={k.includes("Age") ? 130 : undefined}
                value={filters[k]}
                onChange={(e) =>
                  setFilters({ ...filters, [k]: e.target.value })
                }
              />
            </label>
          ))}
          <label className="check">
            <input
              type="checkbox"
              checked={filters.favorite}
              onChange={(e) =>
                setFilters({ ...filters, favorite: e.target.checked })
              }
            />
            Favorites only
          </label>
        </div>
        <div className="row">
          <button
            onClick={() => {
              setFilters(defaultFilters);
              setSearch("");
            }}
          >
            Clear filters
          </button>
          <button className="primary" onClick={() => setOpen(false)}>
            Show results
          </button>
        </div>
      </Dialog>
    </div>
  );
}
