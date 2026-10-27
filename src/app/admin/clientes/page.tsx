import type { Metadata } from "next";
import { ActionButton } from "@/components/admin/action-button";
import { SearchIcon, UserIcon } from "@/components/icons";
import { prisma } from "@/lib/db";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);

  const where: Prisma.UserWhereInput = {
    role: { name: "CUSTOMER" },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, total, revenueByUser] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { _count: { select: { orders: true, entitlements: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.count({ where }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { status: "PAID", user: { role: { name: "CUSTOMER" } } },
      _sum: { totalCents: true },
    }),
  ]);
  const revenueMap = new Map(revenueByUser.map((item) => [item.userId, item._sum.totalCents ?? 0]));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Relacionamento</p>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">Clientes</h1>
        <p className="mt-1 text-sm text-zinc-500">{total} conta(s) de cliente. Desativar uma conta encerra todas as sessões.</p>
      </div>

      <form action="/admin/clientes" className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-ink-850/50 p-4 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input name="q" defaultValue={q} className="input h-11 pl-11" placeholder="Buscar por nome ou e-mail..." />
        </div>
        <button type="submit" className="btn-secondary h-11 px-5">Buscar</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-850/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] uppercase tracking-[0.12em] text-zinc-600">
              <tr>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Pedidos</th>
                <th className="px-4 py-3 font-medium">Total pago</th>
                <th className="px-4 py-3 font-medium">Downloads</th>
                <th className="px-4 py-3 font-medium">Último acesso</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-wine-500/20 to-neon-500/20 text-xs font-bold text-wine-300">
                        {user.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="max-w-48 truncate text-xs font-medium text-zinc-200">{user.name}</p>
                        <p className="max-w-48 truncate text-[10px] text-zinc-600">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{user._count.orders}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-emerald-300">{formatBRL(revenueMap.get(user.id) ?? 0)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{user._count.entitlements}</td>
                  <td className="px-4 py-3 text-[11px] text-zinc-500">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${user.isActive ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-red-400/20 bg-red-400/10 text-red-300"}`}>
                      {user.isActive ? "Ativo" : "Desativado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ActionButton
                      url={`/api/admin/users/${user.id}`}
                      method="PATCH"
                      body={{ isActive: !user.isActive }}
                      className={user.isActive ? "btn-danger btn-sm" : "btn-secondary btn-sm"}
                      confirmMessage={user.isActive ? `Desativar ${user.email} e encerrar suas sessões?` : undefined}
                    >
                      {user.isActive ? "Desativar" : "Ativar"}
                    </ActionButton>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <UserIcon className="mx-auto mb-2 text-2xl text-zinc-700" />
                    <p className="text-sm text-zinc-500">Nenhum cliente encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-zinc-600">Cadastro em {formatDate(new Date())} · exibindo até 100 clientes por consulta.</p>
    </div>
  );
}
