"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { routePaths } from "@/constants/routes";
import { loginSchema, type LoginFormValues } from "@/schemas/auth";
import { useAuthStore } from "@/store/auth-store";
import { applyValidationErrors, validationSummary } from "@/lib/form-errors";
import { safeRedirect } from "@/utils/sanitize";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error: authError, clearError } = useAuthStore();
  const redirectTo = safeRedirect(searchParams.get("redirect"), routePaths.account);
  const sessionExpired = searchParams.get("session") === "expired";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    clearError();
    setFormError(null);
    try {
      await login(values);
      router.replace(redirectTo);
    } catch (err) {
      const hasFieldErrors = applyValidationErrors(form, err, {
        fieldAliases: {
          identifier: "email",
          phone: "email",
          login: "email",
        },
      });

      if (!hasFieldErrors) {
        setFormError(validationSummary(err));
      }
    }
  }

  const activeError = formError || authError;

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {sessionExpired ? (
        <Alert type="info" message="Your session expired. Please sign in again." />
      ) : null}
      {activeError ? <Alert type="error" message={activeError} /> : null}

      <Input
        label="Email or Phone number"
        type="text"
        autoComplete="username"
        disabled={isLoading}
        error={form.formState.errors.email?.message}
        leftIcon={<Mail className="h-4 w-4" />}
        placeholder="Enter email or phone number"
        {...form.register("email")}
      />

      <div>
        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          disabled={isLoading}
          error={form.formState.errors.password?.message}
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
          placeholder="Enter password"
          {...form.register("password")}
        />
        <div className="mt-2 text-right">
          <Link
            href={routePaths.forgotPassword}
            title="Reset your password"
            className="text-xs font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <Button className="w-full" type="submit" isLoading={isLoading} title="Sign in to your account">
        <span>Sign in</span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
