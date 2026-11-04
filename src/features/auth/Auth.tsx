import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
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
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Brand } from "../../components/Brand";
import { toast } from "sonner";
import { sessionExpired, type ArchiveSessionStatus } from "./session";
import { recoveryLinkError } from "./recovery";
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
  const ownerId = useRef<string | null>(null);
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let live = true;
    const acceptSession = (value: Session | null) => {
      const nextOwner = value?.user.id ?? null;
      if (ownerId.current !== nextOwner) {
        client.clear();
        ownerId.current = nextOwner;
      }
      setSession(value);
    };
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (live) {
          acceptSession(data.session);
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
      acceptSession(s);
      setLoading(false);
      if (
        event === "PASSWORD_RECOVERY" &&
        window.location.pathname !== "/reset-password"
      )
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
      const { data, error } = await db().rpc("archive_session_status");
      if (error) throw error;
      return data as ArchiveSessionStatus;
    },
    retry: 1,
    refetchOnWindowFocus: true,
  });
  const expiresAt = access.data?.expires_at;
  useEffect(() => {
    if (!session || !access.data) return;
    const expire = () => {
      if (sessionExpired(expiresAt ?? null)) {
        setSession(null);
        client.clear();
        toast.message("Your session has ended. Sign in again.", {
          id: "session-expired",
        });
        void supabase?.auth.signOut({ scope: "local" });
      }
    };
    expire();
    if (sessionExpired(expiresAt ?? null)) return;
    const timer = setTimeout(
      expire,
      Math.max(0, Date.parse(expiresAt!) - Date.now()),
    );
    const warning = setTimeout(
      () =>
        toast.message(
          "Your session expires soon. Save your work and sign in again.",
          { id: "session-expiry-warning", duration: 15000 },
        ),
      Math.max(0, Date.parse(expiresAt!) - Date.now() - 5 * 60000),
    );
    const check = () => {
      if (document.visibilityState === "visible") expire();
    };
    window.addEventListener("focus", expire);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(timer);
      clearTimeout(warning);
      window.removeEventListener("focus", expire);
      document.removeEventListener("visibilitychange", check);
    };
  }, [session, expiresAt, access.data, client]);
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
        approved:
          access.data?.approved === true && !sessionExpired(expiresAt ?? null),
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
  const [linkError, setLinkError] = useState(() =>
    recoveryLinkError(location.search, location.hash),
  );
  useEffect(() => {
    const message = recoveryLinkError(location.search, location.hash);
    if (message) setLinkError(message);
  }, [location.search, location.hash]);
  const [error, setError] = useState(linkError);
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
        toast.success("Password updated.");
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
      <Brand />
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
        {reset && loading ? (
          <p role="status">Checking your recovery link…</p>
        ) : reset && (!session || Boolean(linkError)) ? (
          <div>
            <p role="alert" className="error">
              {linkError ||
                "Open the latest password recovery link from your email to set a new password."}
            </p>
            <Link className="button primary" to="/forgot-password">
              Request a new recovery link
            </Link>
          </div>
        ) : sent ? (
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
                <PasswordInput
                  name="password"
                  autoComplete={reset ? "new-password" : "current-password"}
                  minLength={reset ? 12 : 1}
                  required
                />
              </label>
            )}
            {reset && (
              <label>
                Confirm password
                <PasswordInput
                  name="confirm"
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
        {!forgot && !reset && (
          <p className="small muted">
            Stay signed in for up to 7 days on this device.
          </p>
        )}
        <p className="small muted">
          Private, invite-only workspace. Contact your administrator for access.
        </p>
      </section>
      <p className="small muted">Casebook · Personal Clinical Case Archive</p>
    </div>
  );
}
