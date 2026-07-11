"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { routePaths } from "@/constants/routes";
import { loginSchema, type LoginFormValues } from "@/schemas/auth";
import { useAuthStore } from "@/store/auth-store";
import { toAppError } from "@/lib/errors";
import { safeRedirect } from "@/utils/sanitize";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error, clearError, fetchCurrentUser } = useAuthStore();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const redirectTo = safeRedirect(searchParams.get("redirect"), routePaths.account);
  const sessionExpired = searchParams.get("session") === "expired";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    clearError();
    try {
      await login(values);
      toast.success("Welcome back.");
      router.replace(redirectTo);
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  }

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const user = await fetchCurrentUser();
        if (active && user) {
          router.replace(redirectTo);
        }
      } catch {
        // Keep the normal login form visible when the session endpoint is unavailable.
      } finally {
        if (active) {
          setIsCheckingSession(false);
        }
      }
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, [fetchCurrentUser, redirectTo, router]);

  if (isCheckingSession) {
    return (
      <div className="space-y-5" aria-hidden="true">
        <div className="h-12 w-full animate-pulse rounded-2xl bg-muted" />
        <div className="h-12 w-full animate-pulse rounded-2xl bg-muted" />
        <div className="h-12 w-full animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {sessionExpired ? <Alert type="info" message="Your session expired. Please sign in again." /> : null}
      {error ? <Alert type="error" message={error} /> : null}

      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        disabled={isLoading}
        error={form.formState.errors.email?.message}
        leftIcon={<Mail className="h-4 w-4" />}
        placeholder="john@example.com"
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
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          placeholder="Enter your password"
          {...form.register("password")}
        />
        <div className="mt-2 text-right">
          <Link href={routePaths.forgotPassword} className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>

      <Button className="w-full" type="submit" isLoading={isLoading}>
        <span>Sign in</span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
