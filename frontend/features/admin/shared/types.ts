export type SortDirection = "asc" | "desc";

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  meta: {
    pagination?: PaginationMeta;
    timeline_pagination?: PaginationMeta;
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
  payment_status: string;
  shipping_status: string;
  payment_method: string;
  shipping_method: string;
  date_from: string;
  date_to: string;
  amount_min: string;
  amount_max: string;
  fraud_status: string;
  fraud_checked: string;
  fraud_provider: string;
  permission_search: string;
  type?: string;
  brand_id?: string;
  category_id?: string;
  product_id?: string;
  rating?: string;
  customer_id?: string;
  guest?: string;
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
