import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/forms";
import { getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Redefinir senha", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({
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
      title="Criar nova senha"
      subtitle="Escolha uma senha forte. Ao concluir, todas as sessões ativas serão encerradas."
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
