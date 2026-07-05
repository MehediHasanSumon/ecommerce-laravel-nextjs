import type { BaseRecord } from "@/features/admin/shared/types";

export type HomeFeatureCard = BaseRecord & {
  icon: string;
  title: string;
  description: string;
  sort_order: number;
  status: boolean;
};

export type HomeFeatureCardPayload = {
  icon: string;
  title: string;
  description: string;
  sort_order: number;
  status: boolean;
};
