"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { routePaths } from "@/constants/routes";
import { registerSchema, type RegisterFormValues } from "@/schemas/auth";
import { useAuthStore } from "@/store/auth-store";
import { toAppError } from "@/lib/errors";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", password_confirmation: "" },
  });
  const password = useWatch({ control: form.control, name: "password" }) ?? "";

  async function onSubmit(values: RegisterFormValues) {
    clearError();
    try {
      await registerUser(values);
      toast.success("Account created.");
      router.replace(routePaths.home);
      router.refresh();
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {error ? <Alert type="error" message={error} /> : null}

      <div className="relative">
        <User className="absolute left-4 top-[calc(50%+0.875rem)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input label="Full name" autoComplete="name" disabled={isLoading} error={form.formState.errors.name?.message} className="pl-11" placeholder="John Doe" {...form.register("name")} />
      </div>

      <div className="relative">
        <Mail className="absolute left-4 top-[calc(50%+0.875rem)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input label="Email address" type="email" autoComplete="email" disabled={isLoading} error={form.formState.errors.email?.message} className="pl-11" placeholder="john@example.com" {...form.register("email")} />
      </div>

      <div className="relative">
        <Lock className="absolute left-4 top-[calc(50%+0.875rem)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input label="Password" type={showPassword ? "text" : "password"} autoComplete="new-password" disabled={isLoading} error={form.formState.errors.password?.message} className="pl-11 pr-12" placeholder="Create a strong password" {...form.register("password")} />
        <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-[calc(50%+0.875rem)] -translate-y-1/2 rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {password ? (
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-muted/35 p-3 text-xs">
          {[
            ["At least 12 characters", password.length >= 12],
            ["One uppercase letter", /[A-Z]/.test(password)],
            ["One number", /\d/.test(password)],
            ["One special character", /[^A-Za-z0-9]/.test(password)],
          ].map(([label, valid]) => (
            <div key={String(label)} className={valid ? "flex items-center gap-1.5 text-emerald-600" : "flex items-center gap-1.5 text-muted-foreground"}>
              <Check className={valid ? "h-3 w-3 opacity-100" : "h-3 w-3 opacity-30"} />
              {label}
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <Lock className="absolute left-4 top-[calc(50%+0.875rem)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input label="Confirm password" type={showPassword ? "text" : "password"} autoComplete="new-password" disabled={isLoading} error={form.formState.errors.password_confirmation?.message} className="pl-11" placeholder="Confirm your password" {...form.register("password_confirmation")} />
      </div>

      <Button className="w-full" type="submit" isLoading={isLoading}>
        <span>Create account</span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
