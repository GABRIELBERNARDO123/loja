import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ArrowRight, FileIcon, PackageIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth/guards";
import { listOrdersForUser } from "@/lib/orders";
import { formatBRL, formatDateTime, orderStatusLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Meus pedidos", robots: { index: false, follow: false } };

export default async function OrdersPage() {
  const user = await requireUser("/conta/pedidos");
  const orders = await listOrdersForUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Histórico</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Meus pedidos</h1>
        <p className="mt-2 text-sm text-zinc-500">Consulte pagamentos, status e downloads vinculados a cada compra.</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-20 text-center">
          <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl text-zinc-500">
            <PackageIcon />
          </span>
          <h2 className="font-display text-xl font-semibold text-white">Nenhum pedido ainda</h2>
          <p className="mt-2 text-sm text-zinc-500">Quando você comprar um produto, o pedido aparecerá aqui.</p>
          <Link href="/produtos" className="btn-primary mt-6">Explorar catálogo <ArrowRight /></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/pedido/${order.id}`}
              className="block rounded-2xl border border-white/[0.08] bg-ink-850/50 p-4 transition-colors hover:border-white/[0.16] hover:bg-ink-800/60 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{order.code}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">Criado em {formatDateTime(order.createdAt)}</p>
                </div>
                <StatusBadge status={order.status} label={orderStatusLabel(order.status)} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {order.items.map((item) => (
                  <span key={item.id} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-zinc-400">
                    <FileIcon className="shrink-0 text-wine-300" />
                    <span className="truncate">{item.productName}</span>
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3">
                <span className="text-[11px] text-zinc-500">{order.items.length} item(ns) · Pix</span>
                <span className="font-display text-base font-bold text-white">{formatBRL(order.totalCents)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
