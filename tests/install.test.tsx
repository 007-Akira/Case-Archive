import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  InstallProvider,
  InstallSuggestion,
  useInstallApp,
} from "../src/features/install/InstallApp";
function SettingsButton() {
  const { installed, showInstall } = useInstallApp();
  return (
    <button disabled={installed} onClick={showInstall}>
      {installed ? "App installed" : "Install Casebook"}
    </button>
  );
}
beforeEach(() => sessionStorage.clear());
afterEach(cleanup);
describe("PWA installation", () => {
  it("recognizes fullscreen launches as installed and suppresses the offer", () => {
    const media = vi
      .spyOn(window, "matchMedia")
      .mockImplementation((query) => ({
        matches: query.includes("display-mode: fullscreen"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    try {
      render(
        <InstallProvider>
          <InstallSuggestion />
          <SettingsButton />
        </InstallProvider>,
      );
      expect(screen.getByText("App installed")).toBeDisabled();
      expect(screen.queryByRole("dialog")).toBeNull();
    } finally {
      media.mockRestore();
    }
  });
  it("offers after dashboard entry once per session, with settings available after dismissal", () => {
    const view = render(
      <InstallProvider>
        <InstallSuggestion />
        <SettingsButton />
      </InstallProvider>,
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.click(screen.getByText("Not now"));
    view.rerender(
      <InstallProvider>
        <InstallSuggestion />
        <SettingsButton />
      </InstallProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByText("Install Casebook"));
    expect(screen.getByRole("dialog")).toBeVisible();
  });
  it("uses a captured native prompt once and confirms actual installation", async () => {
    render(
      <InstallProvider>
        <SettingsButton />
      </InstallProvider>,
    );
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByText("Install Casebook"));
    fireEvent.click(screen.getByRole("button", { name: /^Install app$/ }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Install Casebook")).not.toBeDisabled();
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(screen.getByText("App installed")).toBeDisabled();
  });
  it("does not repeatedly prompt after native dismissal", async () => {
    render(
      <InstallProvider>
        <SettingsButton />
      </InstallProvider>,
    );
    const event = new Event("beforeinstallprompt");
    const prompt = vi.fn().mockResolvedValue(undefined);
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    act(() => {
      window.dispatchEvent(event);
    });
    fireEvent.click(screen.getByText("Install Casebook"));
    fireEvent.click(screen.getByRole("button", { name: /^Install app$/ }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /^Install app$/ }),
      ).toBeNull(),
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(prompt).toHaveBeenCalledTimes(1);
  });
});
