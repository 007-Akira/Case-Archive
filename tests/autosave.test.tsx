import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { useAutosave } from "../src/features/cases/useAutosave";
afterEach(() => vi.useRealTimers());
describe("confirmed serialized autosave", () => {
  it("does not create empty duplicate drafts on mount", () => {
    const write = vi.fn();
    renderHook(() => useAutosave({ note: "" }, true, write));
    expect(write).not.toHaveBeenCalled();
  });
  it("debounces edits and confirms only after the database responds", async () => {
    vi.useFakeTimers();
    let resolve!: () => void;
    const write = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    const hook = renderHook(({ note }) => useAutosave({ note }, true, write), {
      initialProps: { note: "" },
    });
    hook.rerender({ note: "first" });
    hook.rerender({ note: "second" });
    expect(hook.result.current.state).toBe("Unsaved changes");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1250);
    });
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith({ note: "second" });
    expect(hook.result.current.state).toBe("Saving");
    await act(async () => resolve());
    expect(hook.result.current.state).toBe("Saved");
  });
  it("preserves failed edits and supports a retry", async () => {
    const write = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    const hook = renderHook(({ note }) => useAutosave({ note }, true, write), {
      initialProps: { note: "" },
    });
    hook.rerender({ note: "Keep these notes" });
    await act(async () => {
      expect(await hook.result.current.flush()).toBe(false);
    });
    expect(hook.result.current.state).toBe("Save failed");
    expect(hook.result.current.dirty).toBe(true);
    await act(async () => {
      expect(await hook.result.current.flush()).toBe(true);
    });
    expect(write.mock.calls[1][0]).toEqual({ note: "Keep these notes" });
    expect(hook.result.current.state).toBe("Saved");
  });
  it("drains a newer edit after the earlier request completes", async () => {
    let resolve!: () => void;
    const write = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((r) => (resolve = r)))
      .mockResolvedValue(undefined);
    const hook = renderHook(({ note }) => useAutosave({ note }, true, write), {
      initialProps: { note: "" },
    });
    hook.rerender({ note: "old" });
    let pending!: Promise<boolean>;
    act(() => {
      pending = hook.result.current.flush();
    });
    hook.rerender({ note: "new" });
    await act(async () => {
      resolve();
      await pending;
    });
    expect(write.mock.calls.map((c) => c[0].note)).toEqual(["old", "new"]);
    await waitFor(() => expect(hook.result.current.state).toBe("Saved"));
  });
});

it("does not claim a new empty case is saved before persistence", async () => {
  const write = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() => useAutosave({ note: "" }, true, write, false));
  expect(hook.result.current.state).toBe("Not saved yet");
  await act(async () => {
    await hook.result.current.flush(true);
  });
  expect(write).toHaveBeenCalledWith({ note: "" });
  expect(hook.result.current.state).toBe("Saved");
});

it("waits for an in-flight save before deletion and prevents later saves from recreating it", async () => {
  let resolve!: () => void;
  const write = vi
    .fn()
    .mockImplementationOnce(() => new Promise<void>((r) => (resolve = r)))
    .mockResolvedValue(undefined);
  const hook = renderHook(({ note }) => useAutosave({ note }, true, write), {
    initialProps: { note: "" },
  });
  hook.rerender({ note: "old" });
  let saving!: Promise<boolean>;
  act(() => {
    saving = hook.result.current.flush();
  });
  hook.rerender({ note: "new" });
  let settled = false;
  let pausing!: Promise<void>;
  act(() => {
    pausing = hook.result.current.pause().then(() => {
      settled = true;
    });
  });
  expect(settled).toBe(false);
  await act(async () => {
    resolve();
    await saving;
    await pausing;
  });
  expect(settled).toBe(true);
  await act(async () => {
    await hook.result.current.flush();
  });
  expect(write).toHaveBeenCalledTimes(1);
});
