"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";
import type { Channel as PusherChannel, ChannelAuthorizationCallback } from "pusher-js";

type ConnectionStatus = "idle" | "connecting" | "connected" | "unavailable" | "failed" | "disconnected";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth").replace(/\/auth\/?$/, "");

let echo: Echo<"reverb"> | null = null;
let currentStatus: ConnectionStatus = "idle";
const listeners = new Set<(status: ConnectionStatus) => void>();

function setStatus(status: ConnectionStatus) {
  currentStatus = status;
  listeners.forEach((listener) => listener(status));
}

export function subscribeToRealtimeStatus(listener: (status: ConnectionStatus) => void) {
  listeners.add(listener);
  listener(currentStatus);
  return () => listeners.delete(listener);
}

export function getRealtimeStatus() {
  return currentStatus;
}

export function getReverbClient() {
  if (typeof window === "undefined") return null;
  if (echo) return echo;

  window.Pusher = Pusher;

  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http";
  const wsPort = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? (scheme === "https" ? 443 : 8080));

  echo = new Echo({
    broadcaster: "reverb",
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY ?? "local-key",
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? window.location.hostname,
    wsPort,
    wssPort: wsPort,
    forceTLS: scheme === "https",
    enabledTransports: ["ws", "wss"],
    authorizer: (channel: PusherChannel) => ({
      authorize: (socketId: string, callback: ChannelAuthorizationCallback) => {
        fetch(`${apiBaseUrl}/broadcasting/auth`, {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
          }),
        })
          .then(async (response) => {
            const data = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(data?.message || "Broadcast authentication failed.");
            }
            callback(null, data);
          })
          .catch((error: Error) => callback(error, null));
      },
    }),
  });

  const connection = echo.connector.pusher.connection;
  connection.bind("connecting", () => setStatus("connecting"));
  connection.bind("connected", () => setStatus("connected"));
  connection.bind("unavailable", () => setStatus("unavailable"));
  connection.bind("failed", () => setStatus("failed"));
  connection.bind("disconnected", () => setStatus("disconnected"));

  return echo;
}

export function disconnectReverbClient() {
  echo?.disconnect();
  echo = null;
  setStatus("disconnected");
}

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}
