import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { SearchIcon } from "@/components/icons";
import { prisma } from "@/lib/db";
import { formatBRL, formatDateTime, orderStatusLabel } from "@/lib/format";
import { Prisma, type OrderStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = ["PENDING", "PAID", "EXPIRED", "CANCELED", "FAILED", "REFUNDED", "CHARGEBACK"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const status = typeof params.status === "string" && STATUSES.includes(params.status as OrderStatus) ? (params.status as OrderStatus) : undefined;
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const perPage = 20;

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { customerEmail: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [orders, total, summary] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { user: { select: { name: true, email: true } }, items: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const counts = Object.fromEntries(summary.map((item) => [item.status, item._count._all]));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Vendas</p>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">Pedidos</h1>
        <p className="mt-1 text-sm text-zinc-500">Pagamentos confirmados apenas via validação do provedor. Não há alteração manual de status.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/pedidos" className={`badge ${!status ? "badge-brand" : "hover:text-white"}`}>
          Todos {counts.PENDING || counts.PAID ? <span className="text-zinc-500">({total})</span> : null}
        </Link>
        {STATUSES.map((item) => (
          <Link
            key={item}
            href={`/admin/pedidos?status=${item}`}
            className={`badge ${status === item ? "badge-brand" : "hover:text-white"}`}
          >
            {orderStatusLabel(item)} {counts[item] ? `(${counts[item]})` : ""}
          </Link>
        ))}
      </div>

      <form action="/admin/pedidos" className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-ink-850/50 p-4 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input name="q" defaultValue={q} className="input h-11 pl-11" placeholder="Código, nome ou e-mail do cliente..." />
        </div>
        {status && <input type="hidden" name="status" value={status} />}
        <button type="submit" className="btn-secondary h-11 px-5">Buscar</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-850/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] uppercase tracking-[0.12em] text-zinc-600">
              <tr>
                <th className="px-5 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Itens</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Pagamento</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Criado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <Link href={`/admin/pedidos/${order.id}`} className="font-medium text-zinc-200 hover:text-white">{order.code}</Link>
                    {order.couponCode && <p className="text-[10px] text-emerald-400">cupom {order.couponCode}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-44 truncate text-xs text-zinc-300">{order.customerName}</p>
                    <p className="max-w-44 truncate text-[10px] text-zinc-600">{order.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{order.items.length}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-white">{formatBRL(order.totalCents)}</td>
                  <td className="px-4 py-3 text-[10px] text-zinc-500">{order.payments[0]?.status ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} label={orderStatusLabel(order.status)} /></td>
                  <td className="px-4 py-3 text-[11px] text-zinc-500">{formatDateTime(order.createdAt)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-zinc-500">Nenhum pedido encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <nav className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
            <Link
              key={number}
              href={`/admin/pedidos?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(number) })}`}
              className={number === page ? "grid h-8 min-w-8 place-items-center rounded-lg bg-white text-xs font-bold text-black" : "grid h-8 min-w-8 place-items-center rounded-lg border border-white/10 text-xs text-zinc-400 hover:text-white"}
            >
              {number}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
