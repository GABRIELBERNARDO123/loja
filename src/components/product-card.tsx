import Link from "next/link";
import type { Product, Category } from "@prisma/client";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ArrowRight, FileIcon } from "@/components/icons";
import { formatBRL } from "@/lib/format";

export type ProductCardData = Pick<
  Product,
  | "id"
  | "name"
  | "slug"
  | "shortDescription"
  | "priceCents"
  | "compareAtCents"
  | "coverImageUrl"
  | "fileFormat"
  | "isFeatured"
> & { category?: Pick<Category, "name" | "slug"> | null };

export function ProductCard({ product, index = 0 }: { product: ProductCardData; index?: number }) {
  const discount =
    product.compareAtCents && product.compareAtCents > product.priceCents
      ? Math.round(((product.compareAtCents - product.priceCents) / product.compareAtCents) * 100)
      : null;

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-850/60 shadow-card transition-all duration-500 hover:-translate-y-1 hover:border-white/[0.18] hover:shadow-glow-violet"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <Link href={`/produto/${product.slug}`} className="relative block aspect-[16/10] overflow-hidden">
        {product.coverImageUrl ? (
          <img
            src={product.coverImageUrl}
            alt={`Capa de ${product.name}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#17131f] via-[#101019] to-[#0d0d14]">
            <div className="absolute inset-0 grid-pattern opacity-60" />
            <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-wine-500/20 blur-3xl transition-opacity group-hover:opacity-80" />
            <div className="absolute -bottom-10 right-0 h-40 w-40 rounded-full bg-neon-500/20 blur-3xl" />
            <div className="relative flex flex-col items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-white/[0.06] text-2xl text-wine-300 backdrop-blur">
                <FileIcon />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                {product.fileFormat}
              </span>
            </div>
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          {product.isFeatured && <span className="badge badge-brand">Destaque</span>}
          {discount && <span className="badge border-emerald-400/20 bg-emerald-400/10 text-emerald-300">-{discount}%</span>}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          <span>{product.category?.name ?? "Digital"}</span>
          <span className="h-1 w-1 rounded-full bg-zinc-600" />
          <span>{product.fileFormat}</span>
        </div>
        <h3 className="font-display text-lg font-semibold leading-snug text-white">
          <Link href={`/produto/${product.slug}`} className="transition-colors hover:text-wine-300">
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-6 text-zinc-400">{product.shortDescription}</p>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            {product.compareAtCents && product.compareAtCents > product.priceCents && (
              <p className="text-[11px] text-zinc-500 line-through">{formatBRL(product.compareAtCents)}</p>
            )}
            <p className="font-display text-xl font-bold text-white">{formatBRL(product.priceCents)}</p>
          </div>
          <AddToCartButton productId={product.id} compact />
        </div>
        <Link
          href={`/produto/${product.slug}`}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:text-white"
        >
          Ver detalhes <ArrowRight className="text-sm" />
        </Link>
      </div>
    </article>
  );
}
