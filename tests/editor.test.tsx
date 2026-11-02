import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
const service = vi.hoisted(() => ({
  saveCase: vi.fn().mockResolvedValue(undefined),
  getCase: vi.fn(),
}));
vi.mock("../src/features/auth/Auth", () => ({
  useAuth: () => ({ session: { user: { id: "owner" } } }),
}));
vi.mock("../src/features/cases/service", () => service);
import { EditorPage } from "../src/features/cases/Editor";
import { emptyValues } from "../src/features/cases/model";
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());
function mount(path = "/cases/new") {
  const router = createMemoryRouter(
    [
      { path: "/cases/new", element: <EditorPage /> },
      { path: "/cases/:id/edit", element: <EditorPage /> },
      { path: "/cases/:id", element: <p>Case saved</p> },
      { path: "/cases", element: <p>Archive</p> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}
it("navigates seven sections without requiring a diagnosis for drafts", async () => {
  mount();
  fireEvent.change(screen.getByLabelText("Patient alias"), {
    target: { value: "PT-42" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(
    screen.getByRole("heading", { name: "Admission details" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(service.saveCase).toHaveBeenCalledWith(
      expect.any(String),
      "owner",
      expect.objectContaining({ patient_alias: "PT-42", final_diagnosis: "" }),
      "draft",
      expect.any(Number),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByLabelText("Patient alias")).toHaveValue("PT-42");
});
it("resumes an existing draft and keeps its identity on edit", async () => {
  service.getCase.mockResolvedValue({
    ...emptyValues(),
    id: "existing",
    user_id: "owner",
    case_number: 42,
    age: null,
    status: "draft",
    patient_alias: "Existing alias",
  });
  mount("/cases/existing/edit");
  expect(await screen.findByLabelText("Patient alias")).toHaveValue(
    "Existing alias",
  );
  fireEvent.change(screen.getByLabelText("Patient alias"), {
    target: { value: "Updated alias" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(service.saveCase).toHaveBeenCalledWith(
      "existing",
      "owner",
      expect.objectContaining({ patient_alias: "Updated alias" }),
      "draft",
      expect.any(Number),
    ),
  );
});
it("blocks navigation while changes are unsaved", async () => {
  const router = mount();
  fireEvent.change(screen.getByLabelText("Patient alias"), {
    target: { value: "Unsaved" },
  });
  void router.navigate("/cases");
  expect(await screen.findByRole("dialog")).toHaveTextContent(
    "Unsaved changes",
  );
  fireEvent.click(screen.getByRole("button", { name: "Keep writing" }));
  expect(screen.getByLabelText("Patient alias")).toHaveValue("Unsaved");
});
it("shows required completion fields and returns to their section", async () => {
  mount("/cases/new?step=6");
  fireEvent.click(screen.getByRole("button", { name: "Complete case" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Required to complete",
  );
  expect(service.saveCase).not.toHaveBeenCalled();
});
