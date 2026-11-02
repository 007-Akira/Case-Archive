import { useCallback, useEffect, useRef, useState } from "react";
export type SaveState =
  "Not saved yet" | "Unsaved changes" | "Saving" | "Saved" | "Save failed";
// One writer drains snapshots in order. A newer edit is never replaced by an older response.
export function useAutosave<T>(
  value: T,
  enabled: boolean,
  write: (value: T) => Promise<void>,
  initiallySaved = true,
) {
  const serialized = JSON.stringify(value);
  const latest = useRef(value);
  latest.current = value;
  const writer = useRef(write);
  writer.current = write;
  const confirmed = useRef(serialized);
  const pending = useRef<Promise<boolean> | null>(null);
  const savedEver = useRef(initiallySaved);
  const [state, setState] = useState<SaveState>(
    initiallySaved ? "Saved" : "Not saved yet",
  );
  const [dirty, setDirty] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const flush = useCallback(async (force = false): Promise<boolean> => {
    if (pending.current) return pending.current;
    const work = async () => {
      let forceWrite = force;
      while (
        forceWrite ||
        JSON.stringify(latest.current) !== confirmed.current
      ) {
        forceWrite = false;
        const snapshot = latest.current;
        const text = JSON.stringify(snapshot);
        if (mounted.current) setState("Saving");
        try {
          await writer.current(snapshot);
          confirmed.current = text;
          savedEver.current = true;
        } catch {
          if (mounted.current) {
            setState("Save failed");
            setDirty(true);
          }
          return false;
        }
      }
      if (mounted.current) {
        setState("Saved");
        setDirty(false);
      }
      return true;
    };
    const task = work();
    pending.current = task;
    try {
      return await task;
    } finally {
      if (pending.current === task) pending.current = null;
    }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    if (serialized === confirmed.current) {
      if (!pending.current) {
        setDirty(false);
        setState(savedEver.current ? "Saved" : "Not saved yet");
      }
      return;
    }
    setDirty(true);
    setState("Unsaved changes");
    const timer = setTimeout(() => void flush(), 1250);
    return () => clearTimeout(timer);
  }, [serialized, enabled, flush]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(latest.current) !== confirmed.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);
  return { state, dirty, flush };
}
