import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailForm } from "@/components/auth/forms";
import { getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Confirmar e-mail", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.slice(0, 200) : "";
  const settings = await getStoreSettings();

  return (
    <AuthShell
      storeName={settings.storeName}
      logoUrl={settings.logoUrl}
      title="Confirme seu e-mail"
      subtitle="A confirmação protege sua conta e libera recursos que exigem um endereço validado."
    >
      <VerifyEmailForm token={token} />
    </AuthShell>
  );
}
