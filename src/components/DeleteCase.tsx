import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog } from "./ui/dialog";
import { deleteCase } from "../features/cases/service";
import { numberOf, type CaseRecord } from "../features/cases/model";
type Props = {
  record: Pick<CaseRecord, "id" | "status" | "case_number">;
  beforeDelete?: () => Promise<void>;
  onFailed?: () => void;
  onDeleted?: () => void;
};
export function DeleteCaseDialog({
  record,
  open,
  onOpenChange,
  beforeDelete,
  onFailed,
  onDeleted,
}: Props & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const kind = record.status === "draft" ? "draft" : "case";
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          setError("");
          onOpenChange(value);
        }
      }}
      title={`Delete this ${kind}?`}
      description={`Permanently delete ${numberOf(record.case_number)} and all its notes? This cannot be undone.`}
    >
      {error && (
        <p className="error small" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button disabled={busy} onClick={() => onOpenChange(false)}>
          Cancel
        </button>
        <button
          className="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await beforeDelete?.();
              await deleteCase(record.id);
              onOpenChange(false);
              onDeleted?.();
              await client.invalidateQueries({ queryKey: ["cases"] });
              toast.success(
                kind === "draft" ? "Draft deleted" : "Case deleted",
              );
            } catch {
              onFailed?.();
              setError("Could not delete. Check your connection and retry.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
    </Dialog>
  );
}
export function DeleteCaseButton({
  iconOnly = false,
  ...props
}: Props & { iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={iconOnly ? "icon-button danger" : "danger"}
        aria-label={
          props.record.status === "draft" ? "Delete draft" : "Delete case"
        }
        onClick={() => setOpen(true)}
      >
        <Trash2 size={17} />
        {!iconOnly &&
          (props.record.status === "draft" ? "Delete draft" : "Delete case")}
      </button>
      <DeleteCaseDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}
