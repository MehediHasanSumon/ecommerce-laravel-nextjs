"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type { ApiEnvelope, PaginationMeta } from "@/features/admin/shared/types";
import type { OrderListItem } from "@/services/order-service";

export type CustomerStatus = "active" | "inactive";

export type CustomerListItem = {
  id: number;
  name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  status: CustomerStatus;
  due: number;
  total_due: number;
  total_spent: number;
  total_orders: number;
  created_at: string | null;
  updated_at: string | null;
};

export type CustomerDetail = CustomerListItem & {
  orders: OrderListItem[];
};

export type CreateCustomerPayload = {
  name: string;
  mobile: string;
  email?: string | null;
  address?: string | null;
  status?: CustomerStatus;
};

export type UpdateCustomerPayload = {
  name: string;
  mobile: string;
  email?: string | null;
  address?: string | null;
  status: CustomerStatus;
};

class CustomerManagementService extends AdminApiService {
  list(params: Record<string, string | number | undefined>) {
    return this.unwrap<{ customers: CustomerListItem[] }>(
      this.client.get("/admin/customers", { params: cleanParams(params) }),
    );
  }

  show(id: number | string) {
    return this.unwrap<{ customer: CustomerDetail }>(
      this.client.get(`/admin/customers/${id}`),
    );
  }

  create(payload: CreateCustomerPayload) {
    return this.unwrap<{ customer: CustomerListItem }>(
      this.client.post("/admin/customers", payload),
    );
  }

  update(id: number | string, payload: UpdateCustomerPayload) {
    return this.unwrap<{ customer: CustomerListItem }>(
      this.client.put(`/admin/customers/${id}`, payload),
    );
  }

  delete(id: number | string) {
    return this.unwrap<Record<string, unknown>>(
      this.client.delete(`/admin/customers/${id}`),
    );
  }
}

export const customerManagementService = new CustomerManagementService();
export type CustomerListResponse = ApiEnvelope<{ customers: CustomerListItem[] }> & { meta: { pagination?: PaginationMeta } };
