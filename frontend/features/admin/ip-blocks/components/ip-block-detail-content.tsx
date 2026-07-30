"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Edit3, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { routePaths } from "@/constants/routes";
import { ipBlockService } from "@/features/admin/ip-blocks/services/ip-block-service";
import type { IpBlock } from "@/features/admin/ip-blocks/types";
import { toAppError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth-store";

function dateLabel(value?: string | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";
}

function title(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function IpBlockDetailContent({ id }: { id: string }) {
  const [block, setBlock] = useState<IpBlock | null>(null);
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const load = useCallback(async () => {
    try { setBlock((await ipBlockService.show(id)).data.ip_block); } catch (error) { toast.error(toAppError(error).message); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  if (!block) return <div className="h-96 animate-pulse rounded-lg bg-muted" />;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><Link href={routePaths.adminDashboard}>Dashboard</Link><ChevronRight className="h-4 w-4" /><Link href={routePaths.adminIpBlocks}>Security</Link><ChevronRight className="h-4 w-4" /><span className="font-medium text-foreground">{block.ip_address}</span></div>
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="font-mono text-2xl font-extrabold tracking-tight">{block.ip_address}</h1><p className="mt-1 text-sm text-muted-foreground">{title(block.type)} block - {title(block.status)}</p></div><div className="flex gap-2"><Link href={routePaths.adminIpBlocks}><Button variant="secondary" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>Back</Button></Link>{permissions.includes("can-update-ip-block") ? <Link href={`${routePaths.adminIpBlocks}/${block.id}/edit`}><Button size="sm" icon={<Edit3 className="h-4 w-4" />}>Edit</Button></Link> : null}</div></section>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Status" value={title(block.status)} /><Metric label="Block Count" value={String(block.block_count)} /><Metric label="Blocked At" value={dateLabel(block.blocked_at)} /><Metric label="Expires At" value={block.expires_at ? dateLabel(block.expires_at) : "Permanent"} /></div>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Block Information" icon={ShieldAlert}><Info label="Reason" value={block.reason} /><Info label="Notes" value={block.notes} /><Info label="Created By" value={block.created_by?.name ?? "System"} /><Info label="Updated By" value={block.updated_by?.name ?? "Not set"} /><Info label="Created" value={dateLabel(block.created_at)} /><Info label="Last Activity" value={dateLabel(block.last_activity_at)} /></Panel><Panel title="Location & Client" icon={ShieldAlert}><Info label="Country" value={block.country ?? block.country_code} /><Info label="City" value={block.city} /><Info label="ISP" value={block.isp} /><Info label="Device" value={block.device_type} /><Info label="Browser" value={block.browser} /><Info label="Operating System" value={block.operating_system} /><Info label="User Agent" value={block.user_agent} /></Panel></div>
    <section className="rounded-lg border border-border bg-card p-5"><h2 className="mb-4 font-bold">Block History</h2><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">Event</th><th>Reason</th><th>Actor</th><th>Date</th></tr></thead><tbody>{block.events?.length ? block.events.map((event) => <tr key={event.id} className="border-t border-border"><td className="py-3 font-semibold">{title(event.event_type)}</td><td>{event.reason ?? "-"}</td><td>{event.actor?.name ?? "System"}</td><td>{dateLabel(event.occurred_at)}</td></tr>) : <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">No history found.</td></tr>}</tbody></table></div></section>
  </div>;
}

function Panel({ title: heading, icon: Icon, children }: { title: string; icon: typeof ShieldAlert; children: React.ReactNode }) { return <section className="rounded-lg border border-border bg-card p-5"><h2 className="mb-4 flex items-center gap-2 font-bold"><Icon className="h-4 w-4" />{heading}</h2>{children}</section>; }
function Info({ label, value }: { label: string; value?: string | null }) { return <div className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm last:border-0"><span className="shrink-0 text-muted-foreground">{label}</span><span className="max-w-[70%] break-words text-right font-medium">{value || "Not set"}</span></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>; }
