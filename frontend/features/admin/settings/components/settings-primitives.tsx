"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, ChevronRight, ImagePlus, Loader2, RotateCcw, Save, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { routePaths } from "@/constants/routes";
import { cn } from "@/utils/cn";

export type SettingNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
};

export function SettingsPageShell({
  title,
  description,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-4 pb-4">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-muted/30 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link href={routePaths.adminOrders} className="transition-colors hover:text-foreground">Dashboard</Link>
              <ChevronRight className="h-4 w-4" />
              <Link href={routePaths.adminSettingsCompany} className="transition-colors hover:text-foreground">Settings</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-foreground">{title}</span>
            </div>
            <div className="mt-2 flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            </div>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export function SettingsGrid({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function SettingsSubnav({ items, pathname }: { items: SettingNavItem[]; pathname: string }) {
  void items;
  void pathname;

  return null;
}

export function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn("rounded-lg", className)}>
      <div className="flex items-start gap-3 border-b border-border p-3.5 sm:p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className={cn("p-3.5 sm:p-4", bodyClassName)}>{children}</div>
    </Card>
  );
}

export function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3.5 md:grid-cols-2">{children}</div>;
}

export function TextInput({
  label,
  required,
  helper,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean; helper?: string; error?: string }) {
  const inputId = props.id ?? props.name;
  return (
    <label className="block space-y-2" htmlFor={inputId}>
      <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
        {label}{required ? <span className="text-destructive">*</span> : null}
      </span>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-11 w-full rounded-lg border border-transparent bg-muted px-3 text-sm transition placeholder:text-muted-foreground hover:bg-muted/80 focus:border-primary focus:bg-background",
          error && "border-destructive focus:border-destructive",
        )}
        {...props}
      />
      {helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </label>
  );
}

export function TextareaInput({
  label,
  required,
  helper,
  error,
  rows = 4,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; required?: boolean; helper?: string; error?: string; rows?: number }) {
  const inputId = props.id ?? props.name;
  return (
    <label className="block space-y-2" htmlFor={inputId}>
      <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
        {label}{required ? <span className="text-destructive">*</span> : null}
      </span>
      <textarea
        id={inputId}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={cn(
          "w-full rounded-lg border border-transparent bg-muted px-3 py-2 text-sm transition placeholder:text-muted-foreground hover:bg-muted/80 focus:border-primary focus:bg-background",
          error && "border-destructive focus:border-destructive",
        )}
        {...props}
      />
      {helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </label>
  );
}

export function SelectInput({
  label,
  value,
  options,
  required,
  helper,
  error,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  required?: boolean;
  helper?: string;
  error?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
        {label}{required ? <span className="text-destructive">*</span> : null}
      </span>
      <Select value={value} onValueChange={onChange} required={required} disabled={disabled}>
        <SelectTrigger
          aria-invalid={Boolean(error)}
          className={cn(
            "h-11 rounded-lg border-border bg-background px-3 text-sm transition hover:bg-muted/60 focus:ring-2 focus:ring-ring",
            error && "border-destructive focus:border-destructive",
          )}
        >
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </label>
  );
}

export function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-background p-3 text-left transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span> : null}
      </span>
      <span className={cn("relative h-6 w-11 rounded-full transition", checked ? "bg-primary" : "bg-muted")}>
        <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-background shadow-sm transition", checked ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

export function ImageDropzone({
  label,
  value,
  onChange,
  onUpload,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onUpload?: (file: File) => Promise<string>;
}) {
  const [error, setError] = React.useState("");
  const [uploading, setUploading] = React.useState(false);

  async function handleFile(file: File | null) {
    setError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/x-icon"].includes(file.type)) {
      setError("Upload PNG, JPG, WebP, or ICO files.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Image must be 3MB or smaller.");
      return;
    }
    if (!onUpload) {
      onChange(URL.createObjectURL(file));
      return;
    }
    try {
      setUploading(true);
      onChange(await onUpload(file));
      toast.success(`${label} uploaded.`);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      <label
        className={cn("relative flex h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/50 p-3 text-center transition hover:bg-muted", error && "border-destructive")}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFile(event.dataTransfer.files.item(0));
        }}
      >
        {uploading ? (
          <div>
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold">Uploading image</p>
            <p className="mt-1 text-xs text-muted-foreground">Validating and storing the file.</p>
          </div>
        ) : value ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={`${label} preview`} className="mx-auto max-h-20 rounded-md object-contain" />
            <p className="text-xs text-muted-foreground">Drop or click to replace</p>
          </div>
        ) : (
          <div>
            <UploadCloud className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold">Upload image</p>
            <p className="mt-1 text-xs text-muted-foreground">Drag and drop or click to browse.</p>
          </div>
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/x-icon"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(event) => {
            handleFile(event.target.files?.item(0) ?? null);
            event.currentTarget.value = "";
          }}
        />
      </label>
      {value ? (
        <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${label}`} icon={<X className="h-4 w-4" />} onClick={() => onChange("")}>
          Remove image
        </Button>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function ResetConfirmation({
  open,
  title = "Reset settings?",
  message = "This will restore the default values on this page.",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Close reset confirmation" onClick={onClose} />
      <div role="alertdialog" aria-modal="true" className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-background p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="danger" size="sm" onClick={onConfirm}>Reset</Button>
        </div>
      </div>
    </div>
  );
}

export function useUnsavedChanges(isDirty: boolean) {
  React.useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}

export function FormActions({
  isSaving,
  isDirty,
  onReset,
}: {
  isSaving: boolean;
  isDirty: boolean;
  onReset: () => void;
}) {
  return (
    <>
      {isDirty ? <span className="inline-flex items-center rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">Unsaved changes</span> : null}
      <Button type="button" variant="secondary" size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={onReset}>Reset</Button>
      <Button type="submit" size="sm" isLoading={isSaving} icon={<Save className="h-4 w-4" />}>Save Settings</Button>
    </>
  );
}

export function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", ok ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export function saveWithToast(setSaving: (value: boolean) => void, onSaved?: () => void) {
  setSaving(true);
  window.setTimeout(() => {
    setSaving(false);
    onSaved?.();
    toast.success("Settings saved successfully.");
  }, 650);
}

export function testWithToast(setTesting: (value: boolean) => void, message: string) {
  setTesting(true);
  window.setTimeout(() => {
    setTesting(false);
    toast.success(message);
  }, 900);
}

export function LoadingInline({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </span>
  );
}
