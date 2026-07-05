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
  409: "This information conflicts with an existing record.",
  422: "Please check the highlighted fields.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "Something went wrong on the server.",
};

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return typeof value === "object" && value !== null;
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const payload = error.response?.data;

    if (isApiErrorPayload(payload)) {
      return new AppError(
        payload.message ??
          (status ? fallbackMessages[status] : undefined) ??
          "Request failed.",
        status,
        payload.errors,
      );
    }

    if (status) {
      return new AppError(fallbackMessages[status] ?? "Request failed.", status);
    }

    return new AppError("Network error. Please check your connection.");
  }

  return new AppError("Unexpected error. Please try again.");
}
