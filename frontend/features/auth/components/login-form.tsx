"use client";

import Link from "next/link";
import { useState } from "react";
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
  const { login, isLoading, error, clearError } = useAuthStore();
  const redirectTo = safeRedirect(searchParams.get("redirect"));
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
      router.refresh();
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {sessionExpired ? <Alert type="info" message="Your session expired. Please sign in again." /> : null}
      {error ? <Alert type="error" message={error} /> : null}

      <div className="relative">
        <Mail className="absolute left-4 top-[calc(50%+0.875rem)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          disabled={isLoading}
          error={form.formState.errors.email?.message}
          className="pl-11"
          placeholder="john@example.com"
          {...form.register("email")}
        />
      </div>

      <div>
        <div className="relative">
          <Lock className="absolute left-4 top-[calc(50%+0.875rem)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            disabled={isLoading}
            error={form.formState.errors.password?.message}
            className="pl-11 pr-12"
            placeholder="Enter your password"
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-[calc(50%+0.875rem)] -translate-y-1/2 rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
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
