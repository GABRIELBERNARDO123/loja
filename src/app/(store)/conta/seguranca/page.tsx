import type { Metadata } from "next";
import { PasswordForm, ResendVerificationButton, SessionsActions } from "@/components/account-forms";
import { KeyIcon, LockIcon, ShieldIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Segurança", robots: { index: false, follow: false } };

function browserLabel(userAgent: string | null): string {
  if (!userAgent) return "Dispositivo desconhecido";
  if (/iphone|ipad|ios/i.test(userAgent)) return "Safari / iOS";
  if (/android/i.test(userAgent)) return "Navegador Android";
  if (/firefox/i.test(userAgent)) return "Firefox";
  if (/edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/chrome/i.test(userAgent)) return "Google Chrome";
  if (/safari/i.test(userAgent)) return "Safari";
  return "Navegador";
}

export default async function SecurityPage() {
  const user = await requireUser("/conta/seguranca");
  const current = await getCurrentSession();
  const sessions = await prisma.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Proteção</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Segurança da conta</h1>
        <p className="mt-2 text-sm text-zinc-500">Gerencie sua senha, sessões ativas e confirmação de e-mail.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/40 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-white">
            <KeyIcon className="text-brand" /> Alterar senha
          </h2>
          <p className="mb-5 mt-1 text-xs text-zinc-500">
            Senhas são armazenadas como hash Argon2id. Ao alterar, as demais sessões serão encerradas.
          </p>
          <PasswordForm />
        </section>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">E-mail</h2>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="truncate text-sm text-zinc-300">{user.email}</span>
              <ResendVerificationButton verified={Boolean(user.emailVerifiedAt)} />
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              <ShieldIcon className="text-emerald-500" /> Sessões
            </h2>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Encerre dispositivos que não reconhece. A sessão atual será mantida ao encerrar as outras.
            </p>
            <div className="mt-4">
              <SessionsActions />
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-ink-850/40 p-5">
        <h2 className="font-display text-base font-semibold text-white">Sessões ativas</h2>
        <ul className="mt-4 divide-y divide-white/[0.08]">
          {sessions.map((session) => {
            const isCurrent = current?.session.id === session.id;
            return (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm text-zinc-200">
                    {browserLabel(session.userAgent)} {isCurrent && <span className="ml-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">atual</span>}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-600">
                    Iniciada em {formatDateTime(session.createdAt)} · expira em {formatDateTime(session.expiresAt)}
                  </p>
                </div>
                <LockIcon className="text-zinc-600" />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
