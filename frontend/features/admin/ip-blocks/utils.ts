import type { IpBlockStatus } from "@/features/admin/ip-blocks/types";

export const ipBlockReasons = [
  "Spam",
  "Brute Force",
  "Too Many Login Attempts",
  "API Abuse",
  "Crawler",
  "Bot",
  "Fraud Detection",
  "Suspicious Activity",
  "Custom",
] as const;

export function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatIpDate(value?: string | null, includeTime = true) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

export function effectiveIpBlockStatus(block: {
  status: IpBlockStatus;
  expires_at?: string | null;
}): IpBlockStatus {
  if (
    block.status === "active"
    && block.expires_at
    && new Date(block.expires_at).getTime() <= Date.now()
  ) {
    return "inactive";
  }

  return block.status;
}

export function isValidIpAddress(value: string) {
  const ip = value.trim();
  const ipv4Parts = ip.split(".");

  if (
    ipv4Parts.length === 4
    && ipv4Parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
  ) {
    return true;
  }

  if (!ip.includes(":") || !/^[0-9a-f:.]+$/i.test(ip)) {
    return false;
  }

  try {
    const parsed = new URL(`http://[${ip}]/`);
    return parsed.hostname.startsWith("[") && parsed.hostname.endsWith("]");
  } catch {
    return false;
  }
}

export function toDateTimeLocal(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
