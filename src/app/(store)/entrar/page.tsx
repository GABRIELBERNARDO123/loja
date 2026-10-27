import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import { getCurrentSession } from "@/lib/auth/session";
import { getStoreSettings } from "@/lib/settings";
import { safeNextPath } from "@/lib/http";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextParam = typeof params.next === "string" ? params.next : null;
  const nextPath = nextParam ? safeNextPath(nextParam, "/conta") : null;
  const current = await getCurrentSession();
  if (current) {
    const destination = nextPath ?? (current.user.role.name === "ADMIN" ? "/admin" : "/conta");
    if (current.user.role.name === "ADMIN" && !current.session.mfaVerified) {
      redirect(`/verificar-2fa?next=${encodeURIComponent(destination)}`);
    }
    redirect(current.user.role.name === "ADMIN" ? safeNextPath(destination, "/admin") : destination);
  }

  const settings = await getStoreSettings();

  return (
    <AuthShell
      storeName={settings.storeName}
      logoUrl={settings.logoUrl}
      title="Bem-vindo de volta"
      subtitle="Entre para acessar seus pedidos, downloads e dados da conta."
      footer={
        <>
          Problemas para entrar?{" "}
          <Link href="/paginas/contato" className="font-semibold text-zinc-300 hover:text-white">
            Fale com o suporte
          </Link>
        </>
      }
    >
      <LoginForm nextPath={nextPath ?? undefined} />
    </AuthShell>
  );
}
