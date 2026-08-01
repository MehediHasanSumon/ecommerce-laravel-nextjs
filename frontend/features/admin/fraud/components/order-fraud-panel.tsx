"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FraudCheckModal, FraudRiskBadge } from "@/features/admin/fraud/components/fraud-check-modal";
import { fraudService } from "@/features/admin/fraud/services/fraud-service";
import type { FraudCheck } from "@/features/admin/fraud/types";
import { hasPermission } from "@/lib/permissions";
import { toAppError } from "@/lib/errors";

export function OrderFraudPanel({
  orderNumber,
  customer,
  check,
  onChanged,
}: {
  orderNumber: string;
  customer: { name?: string | null; email?: string | null; phone?: string | null };
  check?: FraudCheck | null;
  onChanged: () => void;
}) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [approving, setApproving] = React.useState(false);
  const canCheck = hasPermission("can_create_fraud_check");
  const canApprove = hasPermission("can_edit_fraud_check");
  const highRisk = check && ["high", "critical"].includes(check.risk_level);
  const needsApproval = Boolean(check?.decision.requires_admin_approval);

  async function approve() {
    setApproving(true);
    try {
      const response = await fraudService.approveOrder(orderNumber);
      toast.success(response.message || "Fraud hold released.");
      onChanged();
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setApproving(false);
    }
  }

  return (
    <>
      {highRisk ? <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">High-risk order requires review</p><p className="mt-1">{check.recommendation || "Review the fraud result before COD confirmation or shipment."}</p></div></div> : null}
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="font-bold">Fraud Status</h2><p className="mt-1 text-sm text-muted-foreground">Aggregated fraud intelligence and fulfillment controls.</p></div>
          <div className="flex flex-wrap gap-2">
            {canCheck ? <Button size="sm" variant="secondary" icon={<ShieldCheck className="h-4 w-4" />} onClick={() => setModalOpen(true)}>{check ? "Check Again" : "Run Fraud Check"}</Button> : null}
            {check ? <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>View Details</Button> : null}
            {canApprove && needsApproval ? <Button size="sm" icon={<CheckCircle2 className="h-4 w-4" />} isLoading={approving} onClick={() => void approve()}>Approve Order</Button> : null}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Fraud Badge" value={<FraudRiskBadge level={check?.risk_level ?? "unchecked"} score={check?.risk_score} />} />
          <Info label="Risk Score" value={check ? `${check.risk_score}/100` : "Not checked"} />
          <Info label="Checked At" value={check?.checked_at ? new Date(check.checked_at).toLocaleString() : "Not checked"} />
          <Info label="Provider Used" value={check?.providers.map((provider) => provider.provider.replaceAll("_", " ")).join(", ") || "None"} />
        </div>
      </section>
      <FraudCheckModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={{ order_id: orderNumber, phone: customer.phone, name: customer.name, email: customer.email }}
        existing={check}
        onCompleted={() => onChanged()}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-2 text-sm font-semibold capitalize">{value}</div></div>;
}
