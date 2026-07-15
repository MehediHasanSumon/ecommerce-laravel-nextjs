"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      className="max-w-[calc(100vw-2rem)]"
      richColors
      closeButton
      position="top-right"
      toastOptions={{ duration: 4200 }}
    />
  );
}
