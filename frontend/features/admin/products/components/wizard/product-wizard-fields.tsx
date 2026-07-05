"use client";

import { GripVertical, ImagePlus, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import * as React from "react";
import type { ReactNode } from "react";
import type { FieldErrors, UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Option } from "@/features/admin/shared/types";
import type { ProductMediaItem, ProductWizardValues } from "@/features/admin/products/components/wizard/product-wizard-types";
import { cn } from "@/utils/cn";

export const imageLimits = {
  maxSizeMb: 5,
  maxGallery: 10,
  types: ["image/jpeg", "image/png", "image/webp"],
};

export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-border pb-4">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

export function TextAreaField({
  label,
  error,
  rows = 4,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; rows?: number }) {
  const inputId = props.id ?? props.name;
  return (
    <label className="block space-y-2" htmlFor={inputId}>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <textarea
        id={inputId}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={cn(
          "w-full resize-y rounded-xl border border-transparent bg-muted px-4 py-3 text-sm text-foreground transition placeholder:text-muted-foreground hover:bg-muted/80 focus:border-primary focus:bg-background",
          error && "border-destructive focus:border-destructive",
        )}
        {...props}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </label>
  );
}

export function SelectField({
  label,
  value,
  placeholder,
  options,
  error,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ id: string | number; name: string }>;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn("h-12 rounded-xl bg-muted px-4", error && "border-destructive")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={String(option.id)} value={String(option.id)}>{option.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </label>
  );
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-border"
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  );
}

export function MultiSelectField({
  title,
  options,
  values,
  onChange,
}: {
  title: string;
  options: Option[];
  values: number[];
  onChange: (values: number[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      <div className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-border bg-background p-2 sm:grid-cols-2">
        {options.length ? options.map((option) => {
          const checked = values.includes(Number(option.id));
          return (
            <label key={option.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? values.filter((value) => value !== Number(option.id)) : [...values, Number(option.id)])}
                className="h-4 w-4 rounded border-border"
              />
              <span>{option.name}</span>
            </label>
          );
        }) : <p className="px-2 py-2 text-sm text-muted-foreground">No options available.</p>}
      </div>
    </div>
  );
}

function fileToMedia(file: File, type: ProductMediaItem["type"], sortOrder: number): ProductMediaItem {
  return {
    id: crypto.randomUUID(),
    url: URL.createObjectURL(file),
    file,
    alt_text: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
    type,
    sort_order: sortOrder,
    is_primary: type === "featured",
    progress: 100,
    status: "ready",
  };
}

function validateImage(file: File) {
  if (!imageLimits.types.includes(file.type)) return "Only JPG, PNG, and WebP images are supported.";
  if (file.size > imageLimits.maxSizeMb * 1024 * 1024) return `Image must be ${imageLimits.maxSizeMb}MB or smaller.`;
  return "";
}

export function ProductImageUploader({
  value,
  onChange,
}: {
  value: ProductMediaItem | null;
  onChange: (image: ProductMediaItem | null) => void;
}) {
  const [error, setError] = React.useState("");

  function handleFile(file: File | null) {
    setError("");
    if (!file) {
      onChange(null);
      return;
    }
    const message = validateImage(file);
    if (message) {
      setError(message);
      return;
    }
    onChange(fileToMedia(file, "featured", 0));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Featured Image</p>
        {value ? <Button type="button" size="sm" variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleFile(null)}>Remove</Button> : null}
      </div>
      <label
        className={cn(
          "flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-4 text-center transition hover:bg-muted",
          error && "border-destructive",
        )}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFile(event.dataTransfer.files.item(0));
        }}
      >
        {value ? (
          <div className="w-full space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.url} alt={value.alt_text || "Featured product preview"} className="mx-auto max-h-56 rounded-md object-contain" />
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              {value.status === "uploading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              <span>Click or drop an image to replace</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">Drop featured image here</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, or WebP up to {imageLimits.maxSizeMb}MB.</p>
          </div>
        )}
        <input type="file" accept={imageLimits.types.join(",")} className="sr-only" onChange={(event) => handleFile(event.target.files?.item(0) ?? null)} />
      </label>
      {value ? (
        <Input
          label="Alt Text"
          value={value.alt_text}
          onChange={(event) => onChange({ ...value, alt_text: event.target.value })}
        />
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function GalleryUploader({
  values,
  onChange,
}: {
  values: ProductMediaItem[];
  onChange: (images: ProductMediaItem[]) => void;
}) {
  const [error, setError] = React.useState("");

  function addFiles(fileList: FileList | null) {
    setError("");
    if (!fileList) return;
    const files = Array.from(fileList);
    if (values.length + files.length > imageLimits.maxGallery) {
      setError(`Upload up to ${imageLimits.maxGallery} gallery images.`);
      return;
    }
    const invalid = files.map(validateImage).find(Boolean);
    if (invalid) {
      setError(invalid);
      return;
    }
    const next = files.map((file, index) => fileToMedia(file, "gallery", values.length + index + 1));
    onChange([...values, ...next]);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((image, sort_order) => ({ ...image, sort_order })));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Product Gallery</p>
        <span className="text-xs text-muted-foreground">{values.length}/{imageLimits.maxGallery}</span>
      </div>
      <label
        className={cn("flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-4 text-center transition hover:bg-muted", error && "border-destructive")}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
      >
        <UploadCloud className="h-7 w-7 text-muted-foreground" />
        <p className="mt-2 text-sm font-semibold">Drop gallery images or click to upload</p>
        <p className="mt-1 text-xs text-muted-foreground">Multiple JPG, PNG, or WebP files supported.</p>
        <input type="file" multiple accept={imageLimits.types.join(",")} className="sr-only" onChange={(event) => addFiles(event.target.files)} />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {values.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((image, index) => (
            <div key={image.id} className="rounded-lg border border-border bg-background p-2">
              <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.alt_text || "Product gallery preview"} className="h-full w-full object-cover" loading="lazy" />
                <button type="button" className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow" aria-label="Remove image" onClick={() => onChange(values.filter((item) => item.id !== image.id))}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Move earlier" icon={<GripVertical className="h-4 w-4" />} disabled={index === 0} onClick={() => move(index, -1)} />
                <Button type="button" size="sm" variant="secondary" disabled={index === values.length - 1} onClick={() => move(index, 1)}>Move</Button>
              </div>
              <input
                className="mt-2 h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                value={image.alt_text}
                placeholder="Alt text"
                onChange={(event) => onChange(values.map((item) => item.id === image.id ? { ...item, alt_text: event.target.value } : item))}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ErrorSummary({ errors }: { errors: FieldErrors<ProductWizardValues> }) {
  const count = Object.keys(errors).length;
  if (!count) return null;
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      Resolve the highlighted fields before continuing.
    </div>
  );
}

export function useFieldValue<T extends keyof ProductWizardValues>(form: UseFormReturn<ProductWizardValues>, name: T) {
  return useWatch({ control: form.control, name }) as ProductWizardValues[T];
}
