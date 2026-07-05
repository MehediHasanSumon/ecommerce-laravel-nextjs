export type SortDirection = "asc" | "desc";

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  meta: {
    pagination?: PaginationMeta;
  };
  errors: Record<string, string[]>;
};

export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

export type QueryState = {
  page: number;
  per_page: number;
  search: string;
  sort: string;
  direction: SortDirection;
  status: string;
  role: string;
  email_verified: string;
  created_from: string;
  created_to: string;
  updated_from: string;
  updated_to: string;
};

export type Option = {
  id: number;
  name: string;
};

export type BaseRecord = {
  id: number;
  created_at: string | null;
  updated_at: string | null;
};
