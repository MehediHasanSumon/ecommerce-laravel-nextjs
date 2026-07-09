import type { QueryState } from "@/features/admin/shared/types";

export const defaultQueryState: QueryState = {
  page: 1,
  per_page: 10,
  search: "",
  sort: "created_at",
  direction: "desc",
  status: "",
  role: "",
  email_verified: "",
  created_from: "",
  created_to: "",
  updated_from: "",
  updated_to: "",
};

export function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function statusLabel(value: string) {
  const label = value.replaceAll("_", " ").replaceAll("-", " ").trim().toLowerCase();

  if (!label) {
    return "";
  }

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function exportCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
