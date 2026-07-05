"use client";

import { useCallback, useMemo, useState } from "react";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

type ConfirmDeleteOptions = {
  title?: string;
  message?: string;
  onConfirm: () => void | Promise<void>;
};

type PendingDelete = ConfirmDeleteOptions | null;

export function useDeleteConfirmation() {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  const confirmDelete = useCallback((options: ConfirmDeleteOptions) => {
    setPendingDelete(options);
  }, []);

  const closeDeleteConfirmation = useCallback(() => {
    setPendingDelete(null);
  }, []);

  const dialog = useMemo(() => (
    <DeleteConfirmationDialog
      open={Boolean(pendingDelete)}
      title={pendingDelete?.title}
      message={pendingDelete?.message}
      onClose={closeDeleteConfirmation}
      onConfirm={async () => {
        await pendingDelete?.onConfirm();
        closeDeleteConfirmation();
      }}
    />
  ), [closeDeleteConfirmation, pendingDelete]);

  return { confirmDelete, deleteConfirmationDialog: dialog };
}
