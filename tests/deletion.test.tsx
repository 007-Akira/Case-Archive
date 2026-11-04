import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
const remove = vi.hoisted(() => vi.fn());
vi.mock("../src/features/cases/service", () => ({ deleteCase: remove }));
import { DeleteCaseButton } from "../src/components/DeleteCase";
beforeEach(() => remove.mockReset().mockResolvedValue(undefined));
afterEach(cleanup);
function mount(status: "draft" | "completed" = "draft") {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DeleteCaseButton
        record={{ id: "owned-record", case_number: 42, status }}
      />
    </QueryClientProvider>,
  );
}
it("asks before deleting a draft and cancel never calls the backend", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Delete draft" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("Delete this draft?");
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(remove).not.toHaveBeenCalled();
});
it("deletes only after explicit confirmation", async () => {
  mount("completed");
  fireEvent.click(screen.getByRole("button", { name: "Delete case" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
  await waitFor(() => expect(remove).toHaveBeenCalledWith("owned-record"));
});
it("keeps the confirmation open on failure so the user can retry", async () => {
  remove.mockRejectedValueOnce(new Error("Offline"));
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Delete draft" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not delete",
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
  await waitFor(() => expect(remove).toHaveBeenCalledTimes(2));
});
