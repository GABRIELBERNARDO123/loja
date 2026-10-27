import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/forms";
import { getCurrentSession } from "@/lib/auth/session";
import { getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false, follow: false } };

export default async function RegisterPage() {
  const current = await getCurrentSession();
  if (current) redirect(current.user.role.name === "ADMIN" ? "/admin" : "/conta");
  const settings = await getStoreSettings();

  return (
    <AuthShell
      storeName={settings.storeName}
      logoUrl={settings.logoUrl}
      title="Crie sua conta"
      subtitle="Centralize seus produtos digitais, downloads e histórico de compras em um só lugar."
    >
      <RegisterForm />
    </AuthShell>
  );
}
