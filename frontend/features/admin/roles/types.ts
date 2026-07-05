import type { BaseRecord, Option } from "@/features/admin/shared/types";

export type ManagedRole = BaseRecord & {
  name: string;
  permissions_count: number;
  permissions: Option[];
};

export type RolePayload = {
  name: string;
  permissions: string[];
};
