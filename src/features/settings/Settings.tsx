import { applyAppearance } from "../../app/appearance";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Download, KeyRound } from "lucide-react";
import { useAuth } from "../auth/Auth";
import { db } from "../../lib/supabase/client";
import { allCases } from "../cases/service";
import {
  fields,
  label,
  titleOf,
  numberOf,
  type CaseRecord,
} from "../cases/model";
import { Dialog } from "../../components/ui/dialog";
export function markdown(c: CaseRecord) {
  return (
    `# ${titleOf(c)}\n\n${numberOf(c.case_number)} · ${c.status}\n\n` +
    fields
      .filter((f) => c[f] !== null && c[f] !== "")
      .map((f) => `## ${label(f)}\n\n${c[f]}\n`)
      .join("\n") +
    `\n## Differential diagnoses\n\n${c.differential_diagnoses.map((d) => `- ${d.diagnosis}`).join("\n")}`
  );
}
export function SettingsPage() {
  const { session } = useAuth();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [theme, setTheme] = useState(
    localStorage.getItem("casebook-theme") ?? "system",
  );
  const [size, setSize] = useState(
    localStorage.getItem("casebook-reading") ?? "default",
  );
  const profile = useQuery({
    queryKey: ["profile", session?.user.id],
    queryFn: async () => {
      const { data, error } = await db()
        .from("profiles")
        .select("display_name")
        .single();
      if (error) throw error;
      return data as { display_name: string };
    },
  });
  useEffect(() => {
    applyAppearance();
    const media = matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyAppearance);
    return () => media.removeEventListener("change", applyAppearance);
  }, []);
  async function exportArchive(format: "json" | "md") {
    setBusy(true);
    try {
      const records = await allCases();
      const text =
        format === "json"
          ? JSON.stringify(
              { exported_at: new Date().toISOString(), cases: records },
              null,
              2,
            )
          : records.map(markdown).join("\n\n---\n\n");
      const url = URL.createObjectURL(
        new Blob([text], {
          type: format === "json" ? "application/json" : "text/markdown",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `casebook-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Export failed. Please retry when connected.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page settings-page">
      <h1>Settings</h1>
      <p className="muted">Preferences and account management.</p>
      <section className="settings-section">
        <div className="row">
          <div>
            <h3>{profile.data?.display_name || "Your profile"}</h3>
            <p className="small muted">{session?.user.email}</p>
            {profile.error && <p className="error">Unable to load profile.</p>}
          </div>
          <button
            onClick={() => {
              setName(profile.data?.display_name ?? "");
              setEditing(true);
            }}
          >
            Edit profile
          </button>
        </div>
      </section>
      <section className="settings-section">
        <h3>Account & security</h3>
        <button
          className="wide-row"
          onClick={async () => {
            try {
              const { error } = await db().auth.resetPasswordForEmail(
                session!.user.email!,
                { redirectTo: `${location.origin}/reset-password` },
              );
              if (error) throw error;
              toast.success("Password recovery email sent");
            } catch {
              toast.error("Could not send password recovery email");
            }
          }}
        >
          <KeyRound size={18} />
          Change password <span className="small muted">Via secure email</span>
        </button>
      </section>
      <section className="settings-section">
        <h3>Appearance</h3>
        <label>
          Theme
          <div className="segmented">
            {["light", "dark", "system"].map((v) => (
              <button
                key={v}
                aria-pressed={theme === v}
                onClick={() => {
                  setTheme(v);
                  localStorage.setItem("casebook-theme", v);
                  applyAppearance();
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </label>
        <label>
          Editorial text size
          <div className="segmented">
            {["default", "comfort"].map((v) => (
              <button
                key={v}
                aria-pressed={size === v}
                onClick={() => {
                  setSize(v);
                  localStorage.setItem("casebook-reading", v);
                  applyAppearance();
                }}
              >
                {v} ({v === "default" ? 16 : 18}px)
              </button>
            ))}
          </div>
        </label>
      </section>
      <section className="settings-section">
        <h3>Data & export</h3>
        <p className="small muted">
          Download your complete personal archive. Exports contain sensitive
          clinical material; store them securely and avoid shared devices.
        </p>
        <div className="row">
          <button
            className="primary"
            disabled={busy}
            onClick={() => void exportArchive("json")}
          >
            <Download size={16} />
            Export JSON
          </button>
          <button disabled={busy} onClick={() => void exportArchive("md")}>
            Markdown
          </button>
        </div>
      </section>
      <section className="settings-section">
        <button
          className="danger wide-row"
          onClick={async () => {
            const { error } = await db().auth.signOut();
            if (error) toast.error("Could not log out. Please retry.");
            else client.clear();
          }}
        >
          <LogOut size={18} />
          Log out
        </button>
      </section>
      <p className="quiet-footer">Casebook · Personal Clinical Case Archive</p>
      <Dialog
        open={editing}
        onOpenChange={setEditing}
        title="Edit profile"
        description="Choose the name displayed in your workspace."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const { error } = await db()
                .from("profiles")
                .update({ display_name: name.trim() })
                .eq("id", session!.user.id);
              if (error) throw error;
              await client.invalidateQueries({ queryKey: ["profile"] });
              setEditing(false);
              toast.success("Profile updated");
            } catch {
              toast.error("Could not update profile");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Display name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </label>
          <button className="primary" disabled={busy}>
            Save profile
          </button>
        </form>
      </Dialog>
    </div>
  );
}
