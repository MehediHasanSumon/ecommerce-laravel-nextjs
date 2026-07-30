"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ChevronRight, Save, ShieldAlert } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { routePaths } from "@/constants/routes";
import { ipBlockService } from "@/features/admin/ip-blocks/services/ip-block-service";
import type { IpBlockPayload } from "@/features/admin/ip-blocks/types";
import { FormGrid, SelectInput, SettingsSection, TextareaInput, TextInput } from "@/features/admin/settings/components/settings-primitives";
import { applyValidationErrors, shouldToastFormError } from "@/lib/form-errors";
import { toAppError } from "@/lib/errors";

const schema = z.object({
  ip_address: z.string().trim().min(1, "IP address is required.").refine((value) => {
    const ipv4 = value.split(".");
    const validV4 = ipv4.length === 4 && ipv4.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
    const validV6 = value.includes(":") && /^[0-9a-f:]+$/i.test(value) && value.length <= 45;
    return validV4 || validV6;
  }, "Enter a valid IPv4 or IPv6 address."),
  reason: z.string().trim().min(1, "Reason is required.").max(80, "Reason must be 80 characters or fewer."),
  status: z.enum(["active", "inactive"]),
  type: z.enum(["manual", "automatic"]),
  expires_at: z.string().nullable(),
  notes: z.string().max(5000, "Notes must be 5000 characters or fewer.").nullable(),
});

type FormValues = z.infer<typeof schema>;

function toInputDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function IpBlockFormContent({ id }: { id?: string }) {
  const router = useRouter();
  const editing = Boolean(id);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ip_address: "", reason: "Suspicious Activity", status: "active", type: "manual", expires_at: null, notes: null },
  });
  const type = useWatch({ control: form.control, name: "type" });
  const status = useWatch({ control: form.control, name: "status" });

  useEffect(() => {
    if (!id) return;
    void ipBlockService.show(id).then((response) => {
      const block = response.data.ip_block;
      form.reset({ ip_address: block.ip_address, reason: block.reason, status: block.status, type: block.type, expires_at: toInputDate(block.expires_at), notes: block.notes });
    }).catch((error) => toast.error(toAppError(error).message)).finally(() => setLoading(false));
  }, [form, id]);

  async function submit(values: FormValues) {
    setSaving(true);
    const payload: IpBlockPayload = {
      ...values,
      ip_address: values.ip_address || undefined,
      expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
      notes: values.notes?.trim() || null,
    };
    try {
      if (id) {
        await ipBlockService.update(id, payload);
        toast.success("IP block updated successfully.");
      } else {
        await ipBlockService.create(payload);
        toast.success("IP address blocked successfully.");
      }
      router.push(routePaths.adminIpBlocks);
    } catch (error) {
      if (!applyValidationErrors(form, error) && shouldToastFormError(error)) toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="h-96 animate-pulse rounded-lg bg-muted" />;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><Link href={routePaths.adminDashboard}>Dashboard</Link><ChevronRight className="h-4 w-4" /><Link href={routePaths.adminIpBlocks}>Security</Link><ChevronRight className="h-4 w-4" /><span className="font-medium text-foreground">{editing ? "Edit IP Block" : "Block IP"}</span></div>
    <section className="rounded-lg border border-border bg-card p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-extrabold tracking-tight">{editing ? "Edit IP Block" : "Block IP Address"}</h1><p className="mt-1 text-sm text-muted-foreground">Configure the restriction using the existing security workflow.</p></div><Link href={routePaths.adminIpBlocks}><Button type="button" variant="secondary" size="sm">Back to IP Blocking</Button></Link></div></section>
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
      <SettingsSection title="Block Details" description="Choose the address, reason, status, and duration for this restriction." icon={ShieldAlert}>
        <FormGrid>
          <TextInput label="IP Address" required={!editing} disabled={editing} placeholder="203.0.113.10 or 2001:db8::10" {...form.register("ip_address")} error={form.formState.errors.ip_address?.message} helper="IPv4 and IPv6 are supported. Localhost cannot be blocked." />
          <TextInput label="Reason" required placeholder="Too Many Login Attempts" {...form.register("reason")} error={form.formState.errors.reason?.message} />
          <SelectInput label="Type" required value={type} options={[{ label: "Manual", value: "manual" }, { label: "Automatic", value: "automatic" }]} onChange={(value) => form.setValue("type", value as FormValues["type"], { shouldDirty: true })} error={form.formState.errors.type?.message} />
          <SelectInput label="Status" required value={status} options={[{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]} onChange={(value) => form.setValue("status", value as FormValues["status"], { shouldDirty: true })} error={form.formState.errors.status?.message} />
          <label className="block space-y-2"><span className="text-sm font-semibold">Expire Time</span><input type="datetime-local" {...form.register("expires_at")} className="h-11 w-full rounded-lg border border-transparent bg-muted px-3 text-sm outline-none focus:border-primary focus:bg-background" /><span className="block text-xs text-muted-foreground">Leave empty for a permanent block.</span></label>
          <TextareaInput label="Notes" rows={4} placeholder="Internal context for this restriction." {...form.register("notes")} error={form.formState.errors.notes?.message} />
        </FormGrid>
      </SettingsSection>
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><Link href={routePaths.adminIpBlocks}><Button type="button" variant="secondary">Cancel</Button></Link><Button type="submit" isLoading={saving} icon={<Save className="h-4 w-4" />}>{editing ? "Save Changes" : "Block IP"}</Button></div>
    </form>
  </div>;
}
