import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SearchIcon, XIcon } from "@/components/icons";
import { listCategories, listProducts, type ProductSort } from "@/lib/products";
import { getStoreSettings } from "@/lib/settings";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const category = typeof params.categoria === "string" ? params.categoria : "";
  const title = q ? `Busca: ${q}` : category ? `Categoria: ${category}` : "Catálogo de produtos digitais";
  return {
    title,
    description: "Planilhas, documentos e materiais digitais com download imediato e pagamento seguro via Pix.",
    robots: { index: !q, follow: true },
  };
}

function first(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

const SORT_LABELS: Record<ProductSort, string> = {
  relevance: "Relevância",
  price_asc: "Menor preço",
  price_desc: "Maior preço",
  newest: "Mais recentes",
};

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = first(params.q).slice(0, 100);
  const category = first(params.categoria).slice(0, 80);
  const sortParam = first(params.sort);
  const sort: ProductSort = ["price_asc", "price_desc", "newest"].includes(sortParam)
    ? (sortParam as ProductSort)
    : "relevance";
  const page = Math.max(1, Number.parseInt(first(params.page), 10) || 1);

  const [categories, settings, result] = await Promise.all([
    listCategories(),
    getStoreSettings(),
    listProducts({ q, category, sort, page, perPage: 12 }),
  ]);

  const activeCategory = categories.find((item) => item.slug === category);

  function hrefWith(overrides: Record<string, string | number | undefined>) {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (category) search.set("categoria", category);
    if (sort !== "relevance") search.set("sort", sort);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "" || value === 0) search.delete(key);
      else search.set(key, String(value));
    }
    const query = search.toString();
    return query ? `/produtos?${query}` : "/produtos";
  }

  return (
    <div className="container-page py-12 sm:py-16">
      <nav className="mb-6 text-xs text-zinc-500" aria-label="Trilha de navegação">
        <Link href="/" className="hover:text-white">Início</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Catálogo</span>
        {activeCategory && (
          <>
            <span className="mx-2">/</span>
            <span className="text-zinc-300">{activeCategory.name}</span>
          </>
        )}
      </nav>

      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">
            {settings.storeName}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {activeCategory ? activeCategory.name : q ? `Resultados para “${q}”` : "Catálogo completo"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            {activeCategory?.description ??
              "Encontre planilhas, documentos e materiais digitais prontos para acelerar o seu trabalho."}
          </p>
        </div>
        <p className="text-xs text-zinc-500">
          {result.total} {result.total === 1 ? "produto encontrado" : "produtos encontrados"}
        </p>
      </div>

      <div className="mb-8 grid gap-4 rounded-2xl border border-white/[0.08] bg-ink-850/50 p-4 lg:grid-cols-[1fr_auto_auto]">
        <form action="/produtos" className="relative" role="search">
          {category && <input type="hidden" name="categoria" value={category} />}
          {sort !== "relevance" && <input type="hidden" name="sort" value={sort} />}
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Pesquisar por nome, formato ou assunto..."
            className="input h-12 pl-11 pr-24"
            aria-label="Pesquisar produtos"
          />
          <button type="submit" className="btn-primary btn-sm absolute right-1.5 top-1/2 -translate-y-1/2">
            Buscar
          </button>
        </form>

        <form action="/produtos" method="get" className="flex flex-wrap gap-2">
          {q && <input type="hidden" name="q" value={q} />}
          <select name="categoria" defaultValue={category} className="input h-12 min-w-0 flex-1 sm:min-w-40" aria-label="Filtrar por categoria">
            <option value="">Todas as categorias</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>{item.name}</option>
            ))}
          </select>
          <select name="sort" defaultValue={sort} className="input h-12 min-w-0 flex-1 sm:min-w-36" aria-label="Ordenar por">
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button type="submit" className="btn-secondary h-12 px-4">Aplicar</button>
        </form>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Link
          href={hrefWith({ categoria: undefined, page: undefined })}
          className={`badge transition-colors ${!category ? "badge-brand" : "hover:border-white/25 hover:text-white"}`}
        >
          Todas
        </Link>
        {categories.map((item) => (
          <Link
            key={item.id}
            href={hrefWith({ categoria: item.slug, page: undefined })}
            className={`badge transition-colors ${category === item.slug ? "badge-brand" : "hover:border-white/25 hover:text-white"}`}
          >
            {item.name}
          </Link>
        ))}
        {(q || category) && (
          <Link href="/produtos" className="badge border-red-400/20 bg-red-400/10 text-red-300 hover:bg-red-400/20">
            <XIcon /> Limpar filtros
          </Link>
        )}
      </div>

      {result.items.length > 0 ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>

          {result.totalPages > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Paginação">
              {page > 1 && (
                <Link href={hrefWith({ page: page - 1 })} className="btn-secondary btn-sm">
                  Anterior
                </Link>
              )}
              {Array.from({ length: result.totalPages }, (_, index) => index + 1)
                .filter((number) => Math.abs(number - page) <= 2 || number === 1 || number === result.totalPages)
                .map((number, index, list) => {
                  const previous = list[index - 1];
                  return (
                    <span key={number} className="flex items-center gap-2">
                      {previous && number - previous > 1 && <span className="text-zinc-600">…</span>}
                      <Link
                        href={hrefWith({ page: number })}
                        aria-current={number === page ? "page" : undefined}
                        className={
                          number === page
                            ? "grid h-9 min-w-9 place-items-center rounded-lg bg-white px-2 text-sm font-bold text-black"
                            : "grid h-9 min-w-9 place-items-center rounded-lg border border-white/10 px-2 text-sm text-zinc-400 hover:border-white/25 hover:text-white"
                        }
                      >
                        {number}
                      </Link>
                    </span>
                  );
                })}
              {page < result.totalPages && (
                <Link href={hrefWith({ page: page + 1 })} className="btn-secondary btn-sm">
                  Próxima
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-20 text-center">
          <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl text-zinc-500">
            <SearchIcon />
          </span>
          <h2 className="font-display text-xl font-semibold text-white">Nenhum produto encontrado</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
            Tente ajustar a pesquisa, remover filtros ou navegar por outra categoria.
          </p>
          <Link href="/produtos" className="btn-secondary mt-6">Ver todos os produtos</Link>
        </div>
      )}
    </div>
  );
}
