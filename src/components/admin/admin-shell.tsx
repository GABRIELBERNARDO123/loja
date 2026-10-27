"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { LogOutIcon, MenuIcon, ShieldIcon, XIcon } from "@/components/icons";

export function AdminShell({
  storeName,
  logoUrl,
  userName,
  userEmail,
  children,
}: {
  storeName: string;
  logoUrl: string | null;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" } });
      router.push("/entrar");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/[0.08] bg-ink-900/80 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex h-20 items-center border-b border-white/[0.08] px-5">
          <Logo name={storeName} logoUrl={logoUrl} />
        </div>
        <div className="flex items-center gap-2 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
          <ShieldIcon className="text-brand" /> Administração
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNav />
        </div>
        <div className="border-t border-white/[0.08] p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-wine-500 to-neon-500 text-xs font-bold text-white">
              {userName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{userName}</p>
              <p className="truncate text-[10px] text-zinc-600">{userEmail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-zinc-500 hover:bg-white/[0.04] hover:text-red-300"
          >
            <LogOutIcon /> {loggingOut ? "Saindo..." : "Encerrar sessão"}
          </button>
        </div>
      </div>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.08] bg-ink-950/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-zinc-300 lg:hidden"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            >
              {mobileOpen ? <XIcon /> : <MenuIcon />}
            </button>
            <span className="badge badge-brand hidden sm:inline-flex">Ambiente administrativo</span>
            <span className="text-xs text-zinc-500 lg:hidden">{storeName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-zinc-600 sm:block">Sessão protegida com MFA</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-wine-500 to-neon-500 text-xs font-bold text-white">
              {userName.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>

        {mobileOpen && (
          <div className="border-b border-white/[0.08] bg-ink-900 lg:hidden">
            <AdminNav />
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 border-t border-white/[0.08] px-5 py-3 text-xs text-zinc-500"
            >
              <LogOutIcon /> Encerrar sessão
            </button>
          </div>
        )}

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
