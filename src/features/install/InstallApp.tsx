import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "../../components/ui/dialog";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const Context = createContext({ installed: false, showInstall: () => {} });
export const useInstallApp = () => useContext(Context);
const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

export function InstallProvider({ children }: { children: ReactNode }) {
  const [installed, setInstalled] = useState(standalone);
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef<InstallEvent | null>(null);
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const update = () => setInstalled(standalone());
    const ready = (event: Event) => {
      event.preventDefault();
      pending.current = event as InstallEvent;
      setAvailable(true);
    };
    const complete = () => {
      pending.current = null;
      setAvailable(false);
      setInstalled(true);
      setOpen(false);
      toast.success(
        "Casebook installed. Open it from your home screen or apps.",
      );
    };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", complete);
    media.addEventListener("change", update);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", complete);
      media.removeEventListener("change", update);
    };
  }, []);
  async function install() {
    const event = pending.current;
    if (!event) return;
    pending.current = null;
    setAvailable(false);
    setBusy(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") setOpen(false);
    } catch {
      toast.error(
        "Use your browser’s Install app or Add to Home Screen option.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Context.Provider value={{ installed, showInstall: () => setOpen(true) }}>
      {children}
      <Dialog
        open={open && !installed}
        onOpenChange={setOpen}
        title="Install Casebook"
        description="Add Casebook to your device for quick access from your home screen or apps."
      >
        <img
          src="/icons/casebook-192.png"
          alt="Casebook"
          width={64}
          height={64}
        />
        {available ? (
          <button
            className="primary"
            disabled={busy}
            onClick={() => void install()}
          >
            <Download size={18} /> Install app
          </button>
        ) : ios ? (
          <p>
            Open this website in Safari. Tap Share, then Add to Home Screen.
            Enable Open as Web App if shown, then tap Add.
          </p>
        ) : (
          <p>
            Open your browser’s menu and choose Install Casebook, Install app,
            or Add to Home Screen. On a computer, look for the install icon in
            the address bar. If the option is missing, open this website in
            Chrome or Edge and try again.
          </p>
        )}
        <p className="small muted">
          Once installed, open Casebook using its logo. An internet connection
          is required to view and save cases.
        </p>
        <button onClick={() => setOpen(false)}>Not now</button>
      </Dialog>
    </Context.Provider>
  );
}

export function InstallSuggestion() {
  const { installed, showInstall } = useInstallApp();
  useEffect(() => {
    if (installed || sessionStorage.getItem("casebook-install-offered")) return;
    sessionStorage.setItem("casebook-install-offered", "true");
    showInstall();
  }, [installed, showInstall]);
  return null;
}
