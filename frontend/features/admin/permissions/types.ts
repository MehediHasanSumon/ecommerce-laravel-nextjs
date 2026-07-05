import type { BaseRecord } from "@/features/admin/shared/types";

export type ManagedPermission = BaseRecord & {
  name: string;
};

export type PermissionPayload = {
  name: string;
};
