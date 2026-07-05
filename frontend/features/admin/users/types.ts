import type { BaseRecord, Option } from "@/features/admin/shared/types";

export type UserStatus = "active" | "deactive" | "suspended" | "disabled";

export type ManagedUser = BaseRecord & {
  name: string;
  email: string;
  status: UserStatus;
  email_verified_at: string | null;
  roles: Option[];
};

export type UserPayload = {
  name: string;
  email: string;
  password?: string;
  password_confirmation?: string;
  status: UserStatus;
  email_verified_at?: string | null;
  roles: string[];
};
