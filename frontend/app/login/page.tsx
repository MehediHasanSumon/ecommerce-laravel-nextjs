import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { routePaths } from "@/constants/routes";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in to continue to your account."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            className="font-semibold text-foreground hover:text-primary hover:underline"
            href={routePaths.register}
            title="Create a new account"
          >
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <LoginForm />
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
