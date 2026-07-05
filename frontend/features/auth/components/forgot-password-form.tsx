"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Check, Mail } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routePaths } from "@/constants/routes";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/schemas/auth";
import { useAuthStore } from "@/store/auth-store";
import { toAppError } from "@/lib/errors";
import { cn } from "@/utils/cn";

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState<string | null>(null);
  const { forgotPassword, isLoading, error, clearError } = useAuthStore();
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    clearError();
    setSuccess(null);
    try {
      const message = await forgotPassword(values);
      setSuccess(message);
      toast.success("Check your email.");
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  }

  if (success) {
    return (
      <div className="space-y-5">
        <div className="rounded-[24px] border border-emerald-200/70 bg-emerald-50/80 px-6 py-7 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <Check className="h-7 w-7 text-emerald-500" />
          </div>
          <h2 className="mb-2 text-xl font-extrabold">Check your inbox!</h2>
          <p className="text-sm text-muted-foreground">{success}</p>
        </div>
        <Link className={cn("inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-bold transition hover:bg-muted")} href={routePaths.login}>
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {error ? <Alert type="error" message={error} /> : null}
      <Input label="Email address" type="email" autoComplete="email" disabled={isLoading} error={form.formState.errors.email?.message} leftIcon={<Mail className="h-4 w-4" />} placeholder="john@example.com" {...form.register("email")} />
      <Button className="w-full" type="submit" isLoading={isLoading}>
        Send reset link
      </Button>
    </form>
  );
}
