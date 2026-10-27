import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/admin/action-button";
import { EditIcon, FileIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { prisma } from "@/lib/db";
import { formatBRL } from "@/lib/format";
import { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Produtos" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const status = typeof params.status === "string" ? params.status : "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const perPage = 20;

  const where: Prisma.ProductWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, _count: { select: { files: true, orderItems: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Catálogo</p>
          <h1 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">Produtos</h1>
          <p className="mt-1 text-sm text-zinc-500">{total} produto(s) no catálogo.</p>
        </div>
        <Link href="/admin/produtos/novo" className="btn-primary btn-sm"><PlusIcon /> Novo produto</Link>
      </div>

      <form action="/admin/produtos" className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-ink-850/50 p-4 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input name="q" defaultValue={q} className="input h-11 pl-11" placeholder="Buscar por nome ou slug..." />
        </div>
        <select name="status" defaultValue={status} className="input h-11 sm:w-44">
          <option value="">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <button type="submit" className="btn-secondary h-11 px-5">Filtrar</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-850/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] uppercase tracking-[0.12em] text-zinc-600">
              <tr>
                <th className="px-5 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Preço</th>
                <th className="px-4 py-3 font-medium">Arquivos</th>
                <th className="px-4 py-3 font-medium">Vendas</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {products.map((product) => (
                <tr key={product.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03] text-wine-300">
                        {product.coverImageUrl ? (
                          <img src={product.coverImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <FileIcon />
                        )}
                      </span>
                      <div className="min-w-0">
                        <Link href={`/admin/produtos/${product.id}`} className="block max-w-56 truncate font-medium text-zinc-200 hover:text-white">
                          {product.name}
                        </Link>
                        <p className="max-w-56 truncate text-[10px] text-zinc-600">/{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{product.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-white">{formatBRL(product.priceCents)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{product._count.files}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{product._count.orderItems}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${product.isActive ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-zinc-500/20 bg-zinc-500/10 text-zinc-400"}`}>
                      {product.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/produtos/${product.id}`} className="btn-ghost btn-sm"><EditIcon /> Editar</Link>
                      <ActionButton
                        url={`/api/admin/products/${product.id}`}
                        method="PATCH"
                        body={{ isActive: !product.isActive }}
                        className="btn-secondary btn-sm"
                      >
                        {product.isActive ? "Desativar" : "Ativar"}
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-zinc-500">
                    Nenhum produto encontrado. <Link href="/admin/produtos/novo" className="text-white underline">Cadastre o primeiro</Link>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="Paginação">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
            <Link
              key={number}
              href={`/admin/produtos?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(number) })}`}
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
