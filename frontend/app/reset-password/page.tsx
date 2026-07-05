import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { routePaths } from "@/constants/routes";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a New Password"
      subtitle="Choose a strong password to get back into your account."
      footer={
        <Link
          className="font-semibold text-foreground hover:text-primary hover:underline"
          href={routePaths.login}
        >
          Back to login
        </Link>
      }
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}

function AuthFormSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-2xl" />
    </div>
  );
}
