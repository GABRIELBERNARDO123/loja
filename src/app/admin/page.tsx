import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertIcon,
  ArrowRight,
  ChartIcon,
  ClockIcon,
  PackageIcon,
  PlusIcon,
  ReceiptIcon,
  TagIcon,
  UsersIcon,
  WalletGlyph,
} from "@/components/icons";
import { prisma } from "@/lib/db";
import { formatBRL, formatDateTime, orderStatusLabel } from "@/lib/format";
import { paymentConfigurationStatus } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const now = new Date();
  const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const start14 = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
  start14.setHours(0, 0, 0, 0);

  const [
    revenueAll,
    revenue30,
    paidCount,
    pendingCount,
    customerCount,
    recentOrders,
    paidRecent,
    topItems,
    productCount,
  ] = await Promise.all([
    prisma.order.aggregate({ _sum: { totalCents: true }, where: { status: "PAID" } }),
    prisma.order.aggregate({ _sum: { totalCents: true }, where: { status: "PAID", paidAt: { gte: start30 } } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: { name: "CUSTOMER" } } }),
    prisma.order.findMany({
      include: { user: { select: { name: true, email: true } }, items: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.order.findMany({
      where: { status: "PAID", paidAt: { gte: start14 } },
      select: { paidAt: true, totalCents: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId", "productName"],
      where: { order: { status: "PAID" } },
      _sum: { totalCents: true, quantity: true },
      orderBy: { _sum: { totalCents: "desc" } },
      take: 5,
    }),
    prisma.product.count({ where: { isActive: true } }),
  ]);

  const payments = paymentConfigurationStatus();
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(start14.getTime() + index * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    const total = paidRecent
      .filter((order) => order.paidAt?.toISOString().slice(0, 10) === key)
      .reduce((sum, order) => sum + order.totalCents, 0);
    return { date, total };
  });
  const maxDay = Math.max(...days.map((day) => day.total), 1);
  const avgTicket = paidCount > 0 ? Math.round((revenueAll._sum.totalCents ?? 0) / paidCount) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Operação</p>
          <h1 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Visão consolidada de receita confirmada, pedidos e catálogo.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/produtos/novo" className="btn-primary btn-sm"><PlusIcon /> Novo produto</Link>
          <Link href="/admin/pedidos" className="btn-secondary btn-sm">Ver pedidos</Link>
        </div>
      </div>

      {!payments.configured && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-200">
          <AlertIcon className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Integração de pagamento pendente</p>
            <p className="mt-1 text-xs leading-5 text-amber-200/80">
              Variáveis ausentes: {payments.missing.join(", ") || "configuração incompleta"}. O checkout Pix permanecerá
              indisponível até a configuração na Vercel.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Receita confirmada", value: formatBRL(revenueAll._sum.totalCents ?? 0), hint: "pedidos pagos, histórico total", icon: <WalletGlyph />, tone: "text-emerald-300" },
          { label: "Receita (30 dias)", value: formatBRL(revenue30._sum.totalCents ?? 0), hint: "somente pagamentos confirmados", icon: <ChartIcon />, tone: "text-wine-300" },
          { label: "Pedidos pagos", value: String(paidCount), hint: `${pendingCount} pendente(s)`, icon: <ReceiptIcon />, tone: "text-sky-300" },
          { label: "Clientes", value: String(customerCount), hint: "contas de clientes", icon: <UsersIcon />, tone: "text-neon-400" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
            <div className="flex items-start justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.04] text-zinc-300">{metric.icon}</span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{metric.label}</span>
            </div>
            <p className={`mt-4 font-display text-2xl font-bold ${metric.tone}`}>{metric.value}</p>
            <p className="mt-1 text-[10px] text-zinc-600">{metric.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-white">Receita confirmada — 14 dias</h2>
              <p className="mt-1 text-[11px] text-zinc-500">Baseada em pedidos com status pago.</p>
            </div>
            <span className="badge">Ticket médio {formatBRL(avgTicket)}</span>
          </div>
          {paidRecent.length > 0 ? (
            <div className="flex h-52 items-end gap-2">
              {days.map((day) => {
                const height = Math.max(4, Math.round((day.total / maxDay) * 100));
                return (
                  <div key={day.date.toISOString()} className="group flex h-full flex-1 flex-col justify-end gap-2">
                    <div className="relative flex-1">
                      <div
                        className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-wine-600/50 via-wine-500/70 to-neon-400/80 transition-all group-hover:from-wine-500 group-hover:to-neon-400"
                        style={{ height: `${height}%` }}
                        title={`${day.date.toLocaleDateString("pt-BR")}: ${formatBRL(day.total)}`}
                      />
                    </div>
                    <span className="text-center text-[9px] text-zinc-600">{day.date.getDate()}/{day.date.getMonth() + 1}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-center">
              <div>
                <ChartIcon className="mx-auto mb-2 text-2xl text-zinc-700" />
                <p className="text-sm text-zinc-500">Nenhuma receita confirmada nos últimos 14 dias.</p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white">Catálogo</h2>
            <Link href="/admin/produtos" className="text-[11px] font-semibold text-zinc-500 hover:text-white">Gerenciar</Link>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500">Produtos ativos</dt><dd className="font-semibold text-white">{productCount}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Pedidos pendentes</dt><dd className="font-semibold text-amber-300">{pendingCount}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Clientes</dt><dd className="font-semibold text-white">{customerCount}</dd></div>
          </dl>
          <div className="mt-5 grid gap-2">
            <Link href="/admin/produtos/novo" className="btn-secondary btn-sm w-full"><PlusIcon /> Cadastrar produto</Link>
            <Link href="/admin/cupons" className="btn-ghost btn-sm w-full"><TagIcon /> Criar cupom</Link>
            <Link href="/admin/configuracoes" className="btn-ghost btn-sm w-full">Configurar loja</Link>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-850/50">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
            <h2 className="font-display text-base font-semibold text-white">Pedidos recentes</h2>
            <Link href="/admin/pedidos" className="text-xs font-semibold text-zinc-500 hover:text-white">Ver todos</Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.02] text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">Pedido</th>
                    <th className="px-5 py-3 font-medium">Cliente</th>
                    <th className="px-5 py-3 font-medium">Total</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.08]">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <Link href={`/admin/pedidos/${order.id}`} className="font-medium text-zinc-200 hover:text-white">{order.code}</Link>
                      </td>
                      <td className="px-5 py-3">
                        <p className="max-w-40 truncate text-xs text-zinc-300">{order.user.name}</p>
                        <p className="max-w-40 truncate text-[10px] text-zinc-600">{order.user.email}</p>
                      </td>
                      <td className="px-5 py-3 text-xs font-semibold text-white">{formatBRL(order.totalCents)}</td>
                      <td className="px-5 py-3"><StatusBadge status={order.status} label={orderStatusLabel(order.status)} /></td>
                      <td className="px-5 py-3 text-[11px] text-zinc-500">{formatDateTime(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-14 text-center text-sm text-zinc-500">Nenhum pedido criado ainda.</div>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
          <h2 className="font-display text-base font-semibold text-white">Mais vendidos</h2>
          {topItems.length > 0 ? (
            <ol className="mt-4 space-y-4">
              {topItems.map((item, index) => (
                <li key={`${item.productId ?? "snapshot"}-${index}`} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.04] text-[11px] font-bold text-zinc-400">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-zinc-200">{item.productName}</p>
                    <p className="text-[10px] text-zinc-600">{item._sum.quantity ?? 0} licença(s)</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-300">{formatBRL(item._sum.totalCents ?? 0)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center">
              <PackageIcon className="mb-2 text-2xl text-zinc-700" />
              <p className="text-xs text-zinc-500">As vendas confirmadas aparecerão aqui.</p>
            </div>
          )}
          <Link href="/admin/pedidos?status=PENDING" className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs text-zinc-400 hover:text-white">
            <span className="flex items-center gap-2"><ClockIcon /> Pedidos pendentes</span>
            <span className="flex items-center gap-2">{pendingCount} <ArrowRight /></span>
          </Link>
        </section>
      </div>
    </div>
  );
}
