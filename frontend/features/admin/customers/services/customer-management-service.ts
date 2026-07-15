"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type { ApiEnvelope, PaginationMeta } from "@/features/admin/shared/types";
import type { OrderListItem } from "@/services/order-service";

export type CustomerType = "registered" | "guest";
export type CustomerStatus = "active" | "inactive" | "blocked";

export type CustomerListItem = {
  id: string;
  record_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  type: CustomerType;
  total_orders: number;
  total_spending: number;
  last_order_at: string | null;
  status: CustomerStatus;
  created_at: string | null;
};

export type CustomerDetail = Omit<CustomerListItem, "record_id" | "total_spending"> & {
  lifetime_spending: number;
  billing_address: Record<string, string | null> | null;
  shipping_address: Record<string, string | null> | null;
  notes: string | null;
  orders: OrderListItem[];
};

class CustomerManagementService extends AdminApiService {
  list(params: Record<string, string | number | undefined>) {
    return this.unwrap<{ customers: CustomerListItem[] }>(
      this.client.get("/admin/customers", { params: cleanParams(params) }),
    );
  }

  show(customer: string) {
    return this.unwrap<{ customer: CustomerDetail }>(
      this.client.get(`/admin/customers/${encodeURIComponent(customer)}`),
    );
  }

  updateGuest(id: number, payload: { status: CustomerStatus; notes: string | null }) {
    return this.unwrap<{ customer: CustomerDetail }>(
      this.client.put(`/admin/guest-customers/${id}`, payload),
    );
  }
}

export const customerManagementService = new CustomerManagementService();
export type CustomerListResponse = ApiEnvelope<{ customers: CustomerListItem[] }> & { meta: { pagination?: PaginationMeta } };
