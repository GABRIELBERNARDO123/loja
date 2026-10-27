"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { Logo } from "@/components/logo";
import {
  CartIcon,
  ChevronDown,
  DownloadIcon,
  LayoutIcon,
  LogOutIcon,
  MenuIcon,
  PackageIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
  XIcon,
} from "@/components/icons";

type HeaderUser = { name: string; email: string; isAdmin: boolean } | null;

const NAV = [
  { href: "/", label: "Início" },
  { href: "/produtos", label: "Catálogo" },
  { href: "/produtos?categoria=planilhas", label: "Planilhas" },
  { href: "/produtos?categoria=documentos", label: "Documentos" },
  { href: "/paginas/contato", label: "Suporte" },
];

export function Header({
  storeName,
  logoUrl,
  user,
  cartCount,
}: {
  storeName: string;
  logoUrl: string | null;
  user: HeaderUser;
  cartCount: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" } });
      setUserOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-ink-950/75 backdrop-blur-2xl">
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo name={storeName} logoUrl={logoUrl} />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("?")[0] ?? "");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                    active ? "text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <form action="/produtos" className="hidden items-center sm:flex" role="search">
            <label className="relative block">
              <span className="sr-only">Buscar produtos</span>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                name="q"
                placeholder="Buscar..."
                className="h-10 w-40 rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 transition-all focus:w-56 focus:border-white/20"
              />
            </label>
          </form>

          <Link
            href="/carrinho"
            className="relative grid h-10 w-10 place-items-center rounded-xl text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            aria-label={`Carrinho${cartCount > 0 ? `, ${cartCount} itens` : ""}`}
          >
            <CartIcon className="text-xl" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-wine-500 px-1 text-[10px] font-bold text-white shadow-glow">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setUserOpen((value) => !value)}
                className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] pl-2 pr-3 text-sm text-zinc-200 transition-colors hover:bg-white/[0.08]"
                aria-expanded={userOpen}
                aria-haspopup="menu"
              >
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-wine-500 to-neon-500 text-[11px] font-bold text-white">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-24 truncate md:block">{user.name.split(" ")[0]}</span>
                <ChevronDown className={clsx("text-xs transition-transform", userOpen && "rotate-180")} />
              </button>
              {userOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Fechar menu"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setUserOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-ink-850/95 p-2 shadow-card backdrop-blur-2xl"
                  >
                    <div className="mb-1 border-b border-white/[0.08] px-3 py-2.5">
                      <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                      <p className="truncate text-xs text-zinc-500">{user.email}</p>
                    </div>
                    <MenuLink href="/conta" icon={<UserIcon />} onClick={() => setUserOpen(false)}>
                      Minha conta
                    </MenuLink>
                    <MenuLink href="/conta/biblioteca" icon={<DownloadIcon />} onClick={() => setUserOpen(false)}>
                      Biblioteca
                    </MenuLink>
                    <MenuLink href="/conta/pedidos" icon={<PackageIcon />} onClick={() => setUserOpen(false)}>
                      Meus pedidos
                    </MenuLink>
                    {user.isAdmin && (
                      <MenuLink href="/admin" icon={<LayoutIcon />} onClick={() => setUserOpen(false)}>
                        Painel administrativo
                      </MenuLink>
                    )}
                    <MenuLink href="/conta/seguranca" icon={<SettingsIcon />} onClick={() => setUserOpen(false)}>
                      Segurança
                    </MenuLink>
                    <button
                      type="button"
                      onClick={logout}
                      disabled={loggingOut}
                      className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                      role="menuitem"
                    >
                      <LogOutIcon /> {loggingOut ? "Saindo..." : "Sair"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/entrar" className="btn-secondary btn-sm hidden sm:inline-flex">
              Entrar
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-xl text-zinc-300 hover:bg-white/5 lg:hidden"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <XIcon className="text-xl" /> : <MenuIcon className="text-xl" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/[0.08] bg-ink-950/95 backdrop-blur-2xl lg:hidden">
          <nav className="container-page flex flex-col gap-1 py-4" aria-label="Navegação mobile">
            <form action="/produtos" className="mb-2 flex gap-2" role="search">
              <input name="q" placeholder="Buscar produtos..." className="input h-11" />
              <button className="btn-secondary h-11 px-4" aria-label="Buscar">
                <SearchIcon className="text-lg" />
              </button>
            </form>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 divider" />
            {user ? (
              <>
                <Link href="/conta" onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm text-zinc-300 hover:bg-white/5">
                  Minha conta
                </Link>
                <Link href="/conta/biblioteca" onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm text-zinc-300 hover:bg-white/5">
                  Biblioteca
                </Link>
                {user.isAdmin && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm text-zinc-300 hover:bg-white/5">
                    Painel administrativo
                  </Link>
                )}
                <button type="button" onClick={logout} className="rounded-xl px-3 py-3 text-left text-sm text-zinc-400 hover:bg-white/5">
                  Sair
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/entrar" onClick={() => setMobileOpen(false)} className="btn-secondary">
                  Entrar
                </Link>
                <Link href="/criar-conta" onClick={() => setMobileOpen(false)} className="btn-primary">
                  Criar conta
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function MenuLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white [&_svg]:text-base [&_svg]:text-zinc-500"
    >
      {icon}
      {children}
    </Link>
  );
}
