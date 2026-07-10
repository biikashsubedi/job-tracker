import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <LoginForm callbackUrl={searchParams.callbackUrl} />
    </div>
  );
}
