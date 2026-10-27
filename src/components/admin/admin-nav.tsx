"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  ChartIcon,
  ExternalIcon,
  FolderIcon,
  PackageIcon,
  ReceiptIcon,
  SettingsIcon,
  TagIcon,
  UsersIcon,
} from "@/components/icons";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: <ChartIcon />, exact: true },
  { href: "/admin/produtos", label: "Produtos", icon: <FolderIcon /> },
  { href: "/admin/categorias", label: "Categorias", icon: <PackageIcon /> },
  { href: "/admin/cupons", label: "Cupons", icon: <TagIcon /> },
  { href: "/admin/pedidos", label: "Pedidos", icon: <ReceiptIcon /> },
  { href: "/admin/clientes", label: "Clientes", icon: <UsersIcon /> },
  { href: "/admin/configuracoes", label: "Configurações", icon: <SettingsIcon /> },
  { href: "/admin/auditoria", label: "Auditoria", icon: <ShieldGlyph /> },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible" aria-label="Navegação administrativa">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all [&_svg]:text-base",
              active
                ? "bg-gradient-to-r from-wine-500/15 to-neon-500/5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] [&_svg]:text-brand"
                : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200 [&_svg]:text-zinc-600",
            )}
          >
            {link.icon}
            <span>{link.label}</span>
          </Link>
        );
      })}
      <div className="my-2 hidden h-px bg-white/[0.08] lg:block" />
      <Link
        href="/"
        className="flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-200 [&_svg]:text-zinc-600"
      >
        <ExternalIcon /> Ver loja
      </Link>
    </nav>
  );
}

function ShieldGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.4-3.6" />
    </svg>
  );
}
