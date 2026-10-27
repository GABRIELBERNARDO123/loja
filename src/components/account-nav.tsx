"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { DownloadIcon, LayoutIcon, PackageIcon, SettingsIcon, UserIcon } from "@/components/icons";

const LINKS = [
  { href: "/conta", label: "Visão geral", icon: <LayoutIcon />, exact: true },
  { href: "/conta/pedidos", label: "Meus pedidos", icon: <PackageIcon /> },
  { href: "/conta/biblioteca", label: "Biblioteca", icon: <DownloadIcon /> },
  { href: "/conta/perfil", label: "Perfil", icon: <UserIcon /> },
  { href: "/conta/seguranca", label: "Segurança", icon: <SettingsIcon /> },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.08] bg-ink-850/50 p-1.5 lg:flex-col lg:overflow-visible"
      aria-label="Navegação da conta"
    >
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors [&_svg]:text-base",
              active
                ? "bg-white/[0.07] text-white [&_svg]:text-brand"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-white [&_svg]:text-zinc-500",
            )}
          >
            {link.icon}
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
