"use client";

import axios from "axios";
import type { ApiEnvelope } from "@/features/admin/shared/types";
import { marketingEventHeaders, marketingTracker } from "@/lib/marketing-tracker";

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
  const eventId = marketingTracker.createEventId("contact");
  const response = await axios.post<ApiEnvelope<Record<string, unknown>>>(
    `${apiBaseUrl}/contact-messages`,
    payload,
    {
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...marketingEventHeaders(eventId),
      },
    },
  );
  marketingTracker.track("contact", {}, { eventId, serverMirror: false, serverTracked: true });

  return response.data;
}
