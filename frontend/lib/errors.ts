import axios from "axios";
import type { ApiErrorPayload, ApiValidationErrors } from "@/types/auth";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly validationErrors?: ApiValidationErrors,
  ) {
    super(message);
    this.name = "AppError";
  }
}

const fallbackMessages: Record<number, string> = {
  400: "The request could not be completed.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to perform this action.",
  404: "The requested resource was not found.",
  409: "This information conflicts with an existing record.",
  422: "Please check the highlighted fields.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "Something went wrong on the server.",
  502: "Bad gateway. Please try again in a moment.",
  503: "Service is temporarily unavailable.",
};

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return typeof value === "object" && value !== null;
}

function sanitizeErrorMessage(message: unknown): string | null {
  if (typeof message !== "string" || !message.trim()) {
    return null;
  }
  const clean = message.trim();
  if (
    clean.startsWith("<!DOCTYPE") ||
    clean.startsWith("<html") ||
    clean.includes("SQLSTATE[") ||
    clean.includes("Stack trace:") ||
    clean.includes("No query results for model") ||
    clean.includes("Class \"") ||
    clean.includes("Call to undefined") ||
    clean.includes("Fatal error:") ||
    clean.includes("Uncaught ") ||
    clean.includes("vendor/laravel") ||
    clean.includes("ErrorException")
  ) {
    return null;
  }
  return clean;
}

export function firstValidationMessage(errors: ApiValidationErrors | undefined): string | undefined {
  if (!errors) {
    return undefined;
  }

  return Object.values(errors).flat().find((message): message is string => Boolean(message));
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const payload = error.response?.data;

    if (isApiErrorPayload(payload)) {
      const sanitizedMessage = sanitizeErrorMessage(payload.message);
      const validationMsg = firstValidationMessage(payload.errors);

      let message = sanitizedMessage;
      if (!message || message.toLowerCase() === "validation failed." || message.toLowerCase() === "validation failed") {
        message = validationMsg ?? (status ? fallbackMessages[status] : undefined) ?? "Request failed.";
      }

      return new AppError(
        message,
        status,
        payload.errors,
      );
    }

    if (status) {
      return new AppError(fallbackMessages[status] ?? "Request failed.", status);
    }

    return new AppError("Network error. Please check your connection.");
  }

  if (error instanceof Error) {
    const clean = sanitizeErrorMessage(error.message);
    if (clean) {
      return new AppError(clean);
    }
  }

  return new AppError("Unexpected error. Please try again.");
}

export function isValidationError(error: unknown): boolean {
  return toAppError(error).status === 422;
}

export function flattenValidationErrors(errors: ApiValidationErrors | undefined): Record<string, string> {
  if (!errors) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(errors)
      .map(([field, messages]) => [field, messages.find(Boolean)] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );
}

export function shouldToastError(error: unknown): boolean {
  return !isValidationError(error);
}
