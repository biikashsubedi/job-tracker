import type { Metadata } from "next";
import { auth } from "@/auth";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {session?.user?.email}
        </p>
      </header>

      <section aria-label="Change password">
        <h2 className="mb-3 text-sm font-semibold">Change password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
