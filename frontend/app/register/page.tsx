import Link from "next/link";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";
import { routePaths } from "@/constants/routes";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create Your Account"
      subtitle="Join us and start your journey today."
      footer={
        <>
          Already have an account?{" "}
          <Link
            className="font-semibold text-foreground hover:text-primary hover:underline"
            href={routePaths.login}
          >
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
