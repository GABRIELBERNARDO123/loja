import Link from "next/link";
import { Logo } from "@/components/logo";
import { CheckIcon, LockIcon, ShieldIcon, ZapIcon } from "@/components/icons";

export function AuthShell({
  storeName,
  logoUrl,
  title,
  subtitle,
  children,
  footer,
}: {
  storeName: string;
  logoUrl: string | null;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="container-page grid min-h-[calc(100vh-72px)] items-center gap-12 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
      <div className="hidden lg:block">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-wine-500/[0.12] via-ink-900 to-neon-500/[0.12] p-10">
          <div className="absolute inset-0 grid-pattern opacity-50" />
          <div className="relative">
            <Logo name={storeName} logoUrl={logoUrl} />
            <h2 className="mt-10 max-w-sm font-display text-3xl font-bold leading-tight text-white">
              Sua biblioteca digital, organizada e protegida.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-400">
              Compre uma vez, baixe quando precisar. Seus arquivos ficam disponíveis na conta com controle de
              acesso e registro de downloads.
            </p>
            <ul className="mt-9 space-y-4 text-sm text-zinc-300">
              {[
                { icon: <ZapIcon />, text: "Acesso automático após o Pix confirmado" },
                { icon: <ShieldIcon />, text: "Sessões protegidas e senhas com Argon2id" },
                { icon: <LockIcon />, text: "Downloads privados vinculados à sua compra" },
                { icon: <CheckIcon />, text: "Histórico de pedidos e reenvio autorizado" },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-wine-300">
                    {item.icon}
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="mb-7 lg:hidden">
          <Logo name={storeName} logoUrl={logoUrl} />
        </div>
        <div className="rounded-3xl border border-white/10 bg-ink-900/70 p-6 shadow-card backdrop-blur-xl sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm leading-6 text-zinc-500">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-zinc-500">{footer}</div>}
        <p className="mt-6 text-center text-[11px] leading-5 text-zinc-600">
          Ao continuar, você concorda com os{" "}
          <Link href="/paginas/termos" className="text-zinc-400 underline decoration-white/20 underline-offset-2 hover:text-white">
            Termos de uso
          </Link>{" "}
          e a{" "}
          <Link href="/paginas/privacidade" className="text-zinc-400 underline decoration-white/20 underline-offset-2 hover:text-white">
            Política de privacidade
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
