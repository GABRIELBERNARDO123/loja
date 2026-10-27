import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forms";
import { getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false, follow: false } };

export default async function ForgotPasswordPage() {
  const settings = await getStoreSettings();
  return (
    <AuthShell
      storeName={settings.storeName}
      logoUrl={settings.logoUrl}
      title="Recuperar acesso"
      subtitle="Informe seu e-mail. Se houver uma conta, enviaremos um link de redefinição válido por 30 minutos."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
