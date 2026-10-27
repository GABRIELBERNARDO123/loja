import type { Metadata } from "next";
import { ProfileForm, ResendVerificationButton } from "@/components/account-forms";
import { MailIcon, ShieldIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Meu perfil", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const user = await requireUser("/conta/perfil");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Conta</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Meu perfil</h1>
        <p className="mt-2 text-sm text-zinc-500">Atualize seus dados de identificação. O e-mail é usado nos pedidos e notificações.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/40 p-5 sm:p-6">
          <h2 className="mb-5 font-display text-base font-semibold text-white">Dados pessoais</h2>
          <ProfileForm defaultName={user.name} />

          <div className="mt-6 border-t border-white/[0.08] pt-5">
            <label className="label">E-mail</label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <MailIcon className="text-zinc-500" /> {user.email}
              </div>
              <ResendVerificationButton verified={Boolean(user.emailVerifiedAt)} />
            </div>
            <p className="mt-2 text-[11px] leading-5 text-zinc-600">
              A alteração de e-mail exige contato com o suporte para preservar o histórico de compras e a segurança da conta.
            </p>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              <ShieldIcon className="text-emerald-500" /> Informações da conta
            </h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Membro desde</dt><dd className="text-zinc-300">{formatDate(user.createdAt)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Tipo de conta</dt><dd className="text-zinc-300">{user.role.name === "ADMIN" ? "Administrador" : "Cliente"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">E-mail</dt><dd className="text-zinc-300">{user.emailVerifiedAt ? "Confirmado" : "Pendente"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Status</dt><dd className="text-emerald-400">Ativo</dd></div>
            </dl>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-[11px] leading-5 text-zinc-500">
            Seus dados são tratados conforme a LGPD. Consulte a Política de privacidade para saber como exercer seus direitos.
          </div>
        </aside>
      </div>
    </div>
  );
}
