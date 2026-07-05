"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

type DeleteConfirmationDialogProps = {
  open: boolean;
  title?: string;
  message?: string;
  isProcessing?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function DeleteConfirmationDialog({
  open,
  title = "Confirm Deletion",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  isProcessing,
  onClose,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const [internalProcessing, setInternalProcessing] = useState(false);
  const processing = isProcessing ?? internalProcessing;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !processing) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, open, processing]);

  async function handleConfirm() {
    if (processing) {
      return;
    }

    setInternalProcessing(true);
    try {
      await onConfirm();
    } finally {
      setInternalProcessing(false);
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[120] flex items-center justify-center p-4 transition",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={cn("absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")}
        aria-label="Close delete confirmation"
        disabled={processing}
        onClick={onClose}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirmation-title"
        aria-describedby="delete-confirmation-message"
        className={cn(
          "relative w-full max-w-md rounded-lg border border-border bg-background p-5 text-foreground shadow-2xl transition-all duration-200",
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0",
        )}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 id="delete-confirmation-title" className="text-lg font-bold">
                {title}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Close"
                disabled={processing}
                icon={<X className="h-4 w-4" />}
                onClick={onClose}
              />
            </div>
            <p id="delete-confirmation-message" className="mt-2 text-sm leading-6 text-muted-foreground">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" size="sm" disabled={processing} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" size="sm" isLoading={processing} onClick={handleConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
