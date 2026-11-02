import { NavLink, Outlet, Link } from "react-router-dom";
import {
  Home,
  BookOpen,
  Plus,
  SlidersHorizontal,
  UserRound,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/cases", label: "My Cases", icon: BookOpen },
  { to: "/cases/new", label: "New Case", icon: Plus },
  { to: "/settings", label: "Settings", icon: SlidersHorizontal },
];
export function AppShell() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <Link to="/" className="brand">
          <i />
          Casebook
        </Link>
        <Link className="avatar" to="/settings" aria-label="Your profile">
          <UserRound size={18} />
        </Link>
      </header>
      <aside className="sidebar">
        <Link to="/" className="brand">
          <i />
          Casebook
        </Link>
        <p className="eyebrow">PERSONAL CLINICAL ARCHIVE</p>
        <nav>
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end>
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="sidebar-note">
          Experience, thoughtfully
          <br />
          documented.
        </p>
      </aside>
      <main id="content" className="workspace">
        {!online && (
          <div role="status" className="notice">
            <WifiOff size={18} /> You’re offline. Cases cannot be retrieved or
            saved until you reconnect. Keep this tab open to preserve unsaved
            work.
          </div>
        )}
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end>
            <span className={label === "New Case" ? "new-icon" : ""}>
              <Icon size={22} />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
