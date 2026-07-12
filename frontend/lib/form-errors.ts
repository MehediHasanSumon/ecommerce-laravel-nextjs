import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { firstValidationMessage, shouldToastError, toAppError } from "@/lib/errors";

type ApplyValidationOptions = {
  focus?: boolean;
  fieldAliases?: Record<string, string>;
};

function focusField(name: string) {
  if (typeof document === "undefined") {
    return;
  }

  const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(name) : name.replace(/"/g, '\\"');
  const target = document.querySelector<HTMLElement>(
    `[name="${escaped}"], #${escaped}`,
  );

  target?.scrollIntoView({ behavior: "smooth", block: "center" });
  target?.focus({ preventScroll: true });
}

export function applyValidationErrors<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  error: unknown,
  options: ApplyValidationOptions = {},
) {
  const appError = toAppError(error);

  if (appError.status !== 422 || !appError.validationErrors) {
    return false;
  }

  const entries = Object.entries(appError.validationErrors);
  entries.forEach(([field, messages]) => {
    const name = options.fieldAliases?.[field] ?? field;
    const message = messages.find(Boolean);

    if (message) {
      form.setError(name as Path<TValues>, { type: "server", message });
    }
  });

  if (options.focus !== false) {
    const firstField = entries.find(([, messages]) => messages.some(Boolean))?.[0];
    if (firstField) {
      window.requestAnimationFrame(() => focusField(options.fieldAliases?.[firstField] ?? firstField));
    }
  }

  return true;
}

export function validationSummary(error: unknown) {
  const appError = toAppError(error);
  return firstValidationMessage(appError.validationErrors) ?? appError.message;
}

export function shouldToastFormError(error: unknown) {
  return shouldToastError(error);
}
