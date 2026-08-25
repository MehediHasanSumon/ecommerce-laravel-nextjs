"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routePaths } from "@/constants/routes";
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/schemas/auth";
import { useAuthStore } from "@/store/auth-store";
import { applyValidationErrors, validationSummary } from "@/lib/form-errors";
import { cn } from "@/utils/cn";

export function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const hasValidLink = useMemo(() => token.length >= 20 && email.includes("@"), [token, email]);
  const { resetPassword, isLoading, error: authError, clearError } = useAuthStore();
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email, token, password: "", password_confirmation: "" },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    clearError();
    setFormError(null);
    try {
      await resetPassword({ ...values, email, token });
      toast.success("Password reset successful. Please sign in.");
      router.replace(routePaths.login);
    } catch (err) {
      const hasFieldErrors = applyValidationErrors(form, err);
      if (!hasFieldErrors) {
        const msg = validationSummary(err);
        setFormError(msg);
        toast.error(msg);
      }
    }
  }

  if (!hasValidLink) {
    return (
      <div className="space-y-5">
        <Alert type="error" title="Invalid reset link" message="The password reset link is invalid or has expired. Please request a new link." />
        <Link className={cn("inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-bold transition hover:bg-muted")} href={routePaths.forgotPassword} title="Request a new password reset link">
          Request new link
        </Link>
      </div>
    );
  }

  const activeError = formError || authError;

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {activeError ? <Alert type="error" message={activeError} /> : null}
      <Input
        label="Password"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        disabled={isLoading}
        error={form.formState.errors.password?.message}
        leftIcon={<Lock className="h-4 w-4" />}
        rightIcon={
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        placeholder="Enter password"
        {...form.register("password")}
      />
      <Input
        label="Confirm password"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        disabled={isLoading}
        error={form.formState.errors.password_confirmation?.message}
        leftIcon={<Lock className="h-4 w-4" />}
        placeholder="Confirm password"
        {...form.register("password_confirmation")}
      />
      <Button className="w-full" type="submit" isLoading={isLoading} title="Set new password">
        Reset password
      </Button>
    </form>
  );
}
