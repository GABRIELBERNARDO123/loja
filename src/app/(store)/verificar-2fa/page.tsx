import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { TwoFactorForm } from "@/components/auth/forms";
import { getCurrentSession } from "@/lib/auth/session";
import { getStoreSettings } from "@/lib/settings";
import { safeNextPath } from "@/lib/http";

export const metadata: Metadata = { title: "Verificação em duas etapas", robots: { index: false, follow: false } };

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(typeof params.next === "string" ? params.next : "/admin", "/admin");
  const current = await getCurrentSession();
  if (!current) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  if (current.user.role.name !== "ADMIN") redirect("/conta");
  if (current.session.mfaVerified) redirect(nextPath);
  const settings = await getStoreSettings();
  const masked = current.user.email.replace(/^(.{2}).*(@.*)$/, "$1***$2");

  return (
    <AuthShell
      storeName={settings.storeName}
      logoUrl={settings.logoUrl}
      title="Verificação em duas etapas"
      subtitle={`Digite o código de 6 dígitos do aplicativo autenticador para a conta ${masked}.`}
    >
      <TwoFactorForm nextPath={nextPath} />
    </AuthShell>
  );
}
