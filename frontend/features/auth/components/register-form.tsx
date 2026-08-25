"use client";

import { useEffect, useState } from "react";
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
import { applyValidationErrors, validationSummary } from "@/lib/form-errors";
import { selectCustomerSettings, useSettingsStore } from "@/store/settings-store";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const { register: registerUser, isLoading, error: authError, clearError } = useAuthStore();
  const customerSettings = useSettingsStore(selectCustomerSettings);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", password_confirmation: "" },
  });

  const password = useWatch({ control: form.control, name: "password" }) ?? "";

  async function onSubmit(values: RegisterFormValues) {
    clearError();
    setFormError(null);
    try {
      await registerUser(values);
      toast.success("Account created successfully.");
      router.replace(routePaths.home);
    } catch (err) {
      const hasFieldErrors = applyValidationErrors(form, err);
      if (!hasFieldErrors) {
        const msg = validationSummary(err);
        setFormError(msg);
        toast.error(msg);
      }
    }
  }

  const activeError = formError || authError;

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {!customerSettings.allow_registration ? (
        <Alert type="info" message="Customer registration is currently disabled. Existing customers can still sign in." />
      ) : null}
      {activeError ? <Alert type="error" message={activeError} /> : null}

      <Input
        label="Full name"
        autoComplete="name"
        disabled={isLoading}
        error={form.formState.errors.name?.message}
        leftIcon={<User className="h-4 w-4" />}
        placeholder="Enter name"
        {...form.register("name")}
      />

      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        disabled={isLoading}
        error={form.formState.errors.email?.message}
        leftIcon={<Mail className="h-4 w-4" />}
        placeholder="Enter email"
        {...form.register("email")}
      />

      <Input
        label="Password"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
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
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        placeholder="Enter password"
        {...form.register("password")}
      />

      {password ? (
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-muted/35 p-3 text-xs">
          {[
            ["At least 12 characters", password.length >= 12],
            ["One uppercase letter", /[A-Z]/.test(password)],
            ["One number", /\d/.test(password)],
            ["One special character", /[^A-Za-z0-9]/.test(password)],
          ].map(([label, valid]) => (
            <div
              key={String(label)}
              className={valid ? "flex items-center gap-1.5 text-emerald-600" : "flex items-center gap-1.5 text-muted-foreground"}
            >
              <Check className={valid ? "h-3 w-3 opacity-100" : "h-3 w-3 opacity-30"} />
              {label}
            </div>
          ))}
        </div>
      ) : null}

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

      <Button
        className="w-full"
        type="submit"
        isLoading={isLoading}
        disabled={!customerSettings.allow_registration}
        title="Create your account"
      >
        <span>Create account</span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
