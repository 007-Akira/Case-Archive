import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Navigate,
  Outlet,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Captcha, captchaConfigured } from "./Captcha";
import { supabase, db, configured } from "../../lib/supabase/client";
const Context = createContext<{
  session: Session | null;
  loading: boolean;
  error: string;
  approved: boolean;
}>({ session: null, loading: true, error: "", approved: false });
export const useAuth = () => useContext(Context);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const client = useQueryClient();
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let live = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (live) {
          setSession(data.session);
          setError(error?.message ?? "");
          setLoading(false);
        }
      })
      .catch(() => {
        if (live) {
          setError("Unable to initialize your session. Reload to retry.");
          setLoading(false);
        }
      });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      client.clear();
      setSession(s);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY")
        window.location.replace("/reset-password");
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, [client]);
  const access = useQuery({
    queryKey: ["archive-access", session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await db().rpc("has_archive_access");
      if (error) throw error;
      return data === true;
    },
    retry: 1,
  });
  return (
    <Context.Provider
      value={{
        session,
        loading: loading || Boolean(session && access.isPending),
        error:
          error ||
          (access.error
            ? "Unable to verify archive access. Please reload to retry."
            : ""),
        approved: access.data === true,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function ProtectedRoute() {
  const { session, loading, error, approved } = useAuth();
  if (loading) return <p className="center">Opening your workspace…</p>;
  if (error)
    return (
      <p role="alert" className="center">
        {error}
      </p>
    );
  if (session && !approved)
    return (
      <div className="center">
        <h1>Access needs approval.</h1>
        <p>
          Your account has not been approved for this private archive. Contact
          your administrator.
        </p>
        <button onClick={() => void db().auth.signOut()}>Sign out</button>
      </div>
    );
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}
export function AuthPage() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const forgot = location.pathname === "/forgot-password";
  const reset = location.pathname === "/reset-password";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  if (session && !forgot && !reset) return <Navigate to="/" replace />;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      if (!reset && captchaConfigured && !captchaToken)
        throw new Error("Please complete security verification.");
      if (forgot) {
        const { error } = await db().auth.resetPasswordForEmail(
          String(f.get("email")),
          {
            redirectTo: `${window.location.origin}/reset-password`,
            ...(captchaConfigured ? { captchaToken } : {}),
          },
        );
        if (error) throw error;
        setSent(true);
      } else if (reset) {
        const password = String(f.get("password"));
        if (password !== f.get("confirm"))
          throw new Error("Passwords must match.");
        const { error } = await db().auth.updateUser({ password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await db().auth.signInWithPassword({
          email: String(f.get("email")),
          password: String(f.get("password")),
          ...(captchaConfigured ? { options: { captchaToken } } : {}),
        });
        if (error) throw error;
        navigate("/");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setCaptchaToken("");
      setCaptchaKey((key) => key + 1);
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <Link to="/" className="brand">
        <i />
        Casebook
      </Link>
      <section className="auth-card">
        <span className="eyebrow">YOUR PERSONAL CLINICAL ARCHIVE</span>
        <h1>
          {forgot
            ? "A fresh start."
            : reset
              ? "Set your password."
              : "Welcome back."}
        </h1>
        <p className="muted">
          {forgot
            ? "We’ll email you a secure password recovery link."
            : reset
              ? "Choose a strong password for your private workspace."
              : "A quiet place for your clinical experience."}
        </p>
        {!configured && (
          <div className="notice" role="status">
            Workspace setup needed. Add your Supabase URL and publishable key to
            .env, then restart the app. No demo backend is enabled.
          </div>
        )}
        {sent ? (
          <p role="status">
            If an authorized account exists for that address, a recovery email
            will arrive shortly.
          </p>
        ) : (
          <form onSubmit={submit}>
            {!reset && (
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
            )}
            {!forgot && (
              <label>
                {reset ? "New password" : "Password"}
                <input
                  name="password"
                  type="password"
                  autoComplete={reset ? "new-password" : "current-password"}
                  minLength={reset ? 12 : 1}
                  required
                />
              </label>
            )}
            {reset && (
              <label>
                Confirm password
                <input
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                />
              </label>
            )}
            {!reset && captchaConfigured && (
              <Captcha
                key={captchaKey}
                onToken={setCaptchaToken}
                onError={() =>
                  setError("Security verification failed. Reload to retry.")
                }
              />
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button
              className="primary"
              disabled={busy || loading || !configured}
            >
              {busy
                ? "Please wait…"
                : forgot
                  ? "Send recovery link"
                  : reset
                    ? "Update password"
                    : "Sign in"}
            </button>
          </form>
        )}
        <Link to={forgot || reset ? "/login" : "/forgot-password"}>
          {forgot || reset ? "Back to sign in" : "Forgot password?"}
        </Link>
        <p className="small muted">
          Private, invite-only workspace. Contact your administrator for access.
        </p>
      </section>
      <p className="small muted">Casebook · Personal Clinical Case Archive</p>
    </div>
  );
}
