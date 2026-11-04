import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const auth = vi.hoisted(() => ({
  signOut: vi.fn().mockResolvedValue({ error: null }),
  getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
  signInWithPassword: vi
    .fn()
    .mockResolvedValue({ error: new Error("Invalid login credentials") }),
  updateUser: vi.fn().mockResolvedValue({ error: null }),
  resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
}));
const rpc = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/supabase/client", () => ({
  configured: true,
  supabase: { auth },
  db: () => ({ auth, rpc }),
}));
import {
  AuthProvider,
  AuthPage,
  ProtectedRoute,
} from "../src/features/auth/Auth";
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  auth.getSession.mockResolvedValue({ data: { session: null } });
});
function mount(path = "/login") {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/forgot-password" element={<AuthPage />} />
            <Route path="/reset-password" element={<AuthPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<p>Private workspace</p>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
it("redirects unauthenticated visitors away from private routes", async () => {
  mount("/");
  expect(await screen.findByText("Welcome back.")).toBeInTheDocument();
  expect(screen.queryByText("Private workspace")).not.toBeInTheDocument();
});
it("displays login errors without reporting success", async () => {
  mount();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
  );
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "user@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "wrong" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Sign in" }).closest("form")!,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Invalid login credentials",
  );
});
it("shows non-enumerating recovery confirmation", async () => {
  mount("/forgot-password");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Send recovery link" }),
    ).toBeEnabled(),
  );
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "user@example.com" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Send recovery link" }).closest("form")!,
  );
  expect(await screen.findByRole("status")).toHaveTextContent(
    "If an authorized account exists",
  );
});

it("validates password confirmation before sending an update", async () => {
  auth.getSession.mockResolvedValueOnce({
    data: { session: { user: { id: "recovery-user" } } },
  });
  rpc.mockResolvedValueOnce({
    data: {
      approved: true,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    },
    error: null,
  });
  mount("/reset-password");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Update password" }),
    ).toBeEnabled(),
  );
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "New-example-password1" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "Different-password12" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Update password" }).closest("form")!,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Passwords must match.",
  );
  expect(auth.updateUser).not.toHaveBeenCalled();
});
it("updates the password through Supabase for a recovery form", async () => {
  auth.getSession.mockResolvedValueOnce({
    data: { session: { user: { id: "recovery-user" } } },
  });
  rpc.mockResolvedValueOnce({
    data: {
      approved: true,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    },
    error: null,
  });
  mount("/reset-password");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Update password" }),
    ).toBeEnabled(),
  );
  for (const name of ["New password", "Confirm password"])
    fireEvent.change(screen.getByLabelText(name), {
      target: { value: "New-example-password1" },
    });
  fireEvent.submit(
    screen.getByRole("button", { name: "Update password" }).closest("form")!,
  );
  await waitFor(() =>
    expect(auth.updateUser).toHaveBeenCalledWith({
      password: "New-example-password1",
    }),
  );
});

it("toggles password visibility without submitting or losing the password", async () => {
  mount();
  const input = screen.getByLabelText("Password");
  fireEvent.change(input, {
    target: { value: "A password only for this test" },
  });
  expect(input).toHaveAttribute("type", "password");
  fireEvent.click(screen.getByRole("button", { name: "Show password" }));
  expect(input).toHaveAttribute("type", "text");
  expect(input).toHaveValue("A password only for this test");
  fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
  expect(input).toHaveAttribute("type", "password");
});

it("requires sign-in when a cached session has exceeded seven days", async () => {
  auth.getSession.mockResolvedValueOnce({
    data: { session: { user: { id: "test-owner" } } },
  });
  rpc.mockResolvedValueOnce({
    data: {
      approved: false,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    },
    error: null,
  });
  mount("/");
  expect(await screen.findByText("Welcome back.")).toBeInTheDocument();
  await waitFor(() =>
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" }),
  );
  expect(screen.queryByText("Private workspace")).not.toBeInTheDocument();
});

it("rejects a reset page without a recovery session", async () => {
  mount("/reset-password");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Open the latest password recovery link",
  );
  expect(screen.queryByRole("button", { name: "Update password" })).toBeNull();
  expect(
    screen.getByRole("link", { name: "Request a new recovery link" }),
  ).toHaveAttribute("href", "/forgot-password");
});
it("explains expired recovery links without exposing URL error text", async () => {
  mount(
    "/reset-password#error=access_denied&error_code=otp_expired&error_description=untrusted",
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "expired or has already been used",
  );
  expect(screen.queryByText("untrusted")).toBeNull();
  expect(auth.updateUser).not.toHaveBeenCalled();
});
