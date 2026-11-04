import { useEffect, useRef } from "react";
type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
let ready: Promise<void> | undefined;
function load() {
  if (window.turnstile) return Promise.resolve();
  if (!ready)
    ready = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        ready = undefined;
        reject(new Error("Unable to load verification"));
      };
      document.head.appendChild(script);
    });
  return ready;
}
export const captchaConfigured = Boolean(
  import.meta.env.VITE_TURNSTILE_SITE_KEY,
);
export function Captcha({
  onToken,
  onError,
}: {
  onToken: (token: string) => void;
  onError: () => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const token = useRef(onToken);
  token.current = onToken;
  const error = useRef(onError);
  error.current = onError;
  useEffect(() => {
    let live = true;
    let id: string | undefined;
    load()
      .then(() => {
        if (live && el.current && window.turnstile)
          id = window.turnstile.render(el.current, {
            sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
            callback: (value: string) => token.current(value),
            "expired-callback": () => token.current(""),
            "error-callback": () => {
              token.current("");
              error.current();
            },
            theme: "auto",
          });
      })
      .catch(() => {
        if (live) error.current();
      });
    return () => {
      live = false;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, []);
  return <div ref={el} aria-label="Security verification" />;
}
