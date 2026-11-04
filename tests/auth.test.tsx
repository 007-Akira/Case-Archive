import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const auth = vi.hoisted(() => ({
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
vi.mock("../src/lib/supabase/client", () => ({
  configured: true,
  supabase: { auth },
  db: () => ({ auth }),
}));
import {
  AuthProvider,
  AuthPage,
  ProtectedRoute,
} from "../src/features/auth/Auth";
afterEach(cleanup);
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
