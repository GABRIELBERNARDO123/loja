import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ArrowRight, DownloadIcon, PackageIcon, ShieldIcon, SparklesIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatBRL, formatDate, formatDateTime, orderStatusLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await requireUser("/conta");
  const [orders, paidAggregate, entitlements, downloads, recentOrders, recentEntitlements] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.order.aggregate({ _sum: { totalCents: true }, where: { userId: user.id, status: "PAID" } }),
    prisma.downloadEntitlement.count({ where: { userId: user.id, status: "ACTIVE" } }),
    prisma.downloadLog.count({ where: { userId: user.id, success: true } }),
    prisma.order.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.downloadEntitlement.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: { product: true, productFile: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Área do cliente</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Olá, {user.name.split(" ")[0]}</h1>
        <p className="mt-2 text-sm text-zinc-500">Acompanhe pedidos, acesse seus arquivos e mantenha sua conta segura.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Pedidos", value: String(orders), icon: <PackageIcon />, href: "/conta/pedidos" },
          { label: "Total confirmado", value: formatBRL(paidAggregate._sum.totalCents ?? 0), icon: <SparklesIcon />, href: "/conta/pedidos" },
          { label: "Arquivos liberados", value: String(entitlements), icon: <DownloadIcon />, href: "/conta/biblioteca" },
          { label: "Downloads realizados", value: String(downloads), icon: <ShieldIcon />, href: "/conta/seguranca" },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5 transition-colors hover:border-white/[0.16] hover:bg-ink-800/60"
          >
            <span className="mb-4 grid h-9 w-9 place-items-center rounded-lg bg-white/[0.04] text-wine-300">{card.icon}</span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{card.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{card.value}</p>
          </Link>
        ))}
      </div>

      {!user.emailVerifiedAt && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-200">
          Seu e-mail ainda não foi confirmado.{" "}
          <Link href="/conta/seguranca" className="font-semibold underline underline-offset-2">
            Reenviar confirmação
          </Link>
          .
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white">Pedidos recentes</h2>
            <Link href="/conta/pedidos" className="text-xs font-semibold text-zinc-500 hover:text-white">Ver todos</Link>
          </div>
          {recentOrders.length > 0 ? (
            <ul className="divide-y divide-white/[0.08]">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link href={`/pedido/${order.id}`} className="flex items-center justify-between gap-3 py-3 transition-colors hover:opacity-80">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-200">{order.code}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">{formatDate(order.createdAt)} · {order.items.length} item(ns)</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-white">{formatBRL(order.totalCents)}</span>
                      <StatusBadge status={order.status} label={orderStatusLabel(order.status)} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
              <p className="text-sm text-zinc-500">Você ainda não fez nenhum pedido.</p>
              <Link href="/produtos" className="btn-secondary btn-sm mt-3">Explorar catálogo</Link>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white">Biblioteca</h2>
            <Link href="/conta/biblioteca" className="text-xs font-semibold text-zinc-500 hover:text-white">Abrir</Link>
          </div>
          {recentEntitlements.length > 0 ? (
            <ul className="divide-y divide-white/[0.08]">
              {recentEntitlements.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-200">{item.product.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">{item.productFile.originalName}</p>
                  </div>
                  <a
                    href={`/api/download/${item.id}`}
                    className="btn-secondary btn-sm shrink-0"
                    aria-label={`Baixar ${item.productFile.originalName}`}
                  >
                    <DownloadIcon /> Baixar
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
              <p className="text-sm text-zinc-500">Seus arquivos comprados aparecerão aqui.</p>
            </div>
          )}
        </section>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-r from-wine-500/10 to-neon-500/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-white">Mantenha sua conta protegida</h2>
            <p className="mt-1 text-xs text-zinc-500">Revise sessões ativas e altere sua senha periodicamente.</p>
          </div>
          <Link href="/conta/seguranca" className="btn-secondary btn-sm">
            Segurança da conta <ArrowRight />
          </Link>
        </div>
      </div>

      <p className="text-[11px] text-zinc-600">Último acesso registrado em {formatDateTime(user.lastLoginAt ?? user.createdAt)}.</p>
    </div>
  );
}
