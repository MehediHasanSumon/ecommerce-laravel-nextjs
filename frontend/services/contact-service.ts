"use client";

import axios from "axios";
import type { ApiEnvelope } from "@/features/admin/shared/types";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

export type ContactPayload = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
};

export async function submitContactMessage(payload: ContactPayload) {
  const response = await axios.post<ApiEnvelope<Record<string, unknown>>>(
    `${apiBaseUrl}/contact-messages`,
    payload,
    {
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  return response.data;
}
