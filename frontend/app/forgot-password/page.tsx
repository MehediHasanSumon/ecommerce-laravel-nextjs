import Link from "next/link";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { routePaths } from "@/constants/routes";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot Password?"
      subtitle="Enter your email and we will send a reset link if the account exists."
      footer={
        <Link
          className="font-semibold text-foreground hover:text-primary hover:underline"
          href={routePaths.login}
        >
          Back to login
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
