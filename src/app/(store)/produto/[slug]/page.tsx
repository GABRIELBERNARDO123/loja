import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Markdown } from "@/components/markdown";
import { ProductCard } from "@/components/product-card";
import { ShareWhatsApp } from "@/components/copy-button";
import {
  CheckIcon,
  DownloadIcon,
  FileIcon,
  LockIcon,
  ShieldIcon,
  SparklesIcon,
  ZapIcon,
} from "@/components/icons";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";
import { formatBRL, formatDate } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.name,
    description: product.shortDescription,
    alternates: { canonical: `/produto/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      type: "website",
      images: product.coverImageUrl ? [{ url: product.coverImageUrl }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, settings] = await Promise.all([
    getRelatedProducts(product.id, product.categoryId),
    getStoreSettings(),
  ]);
  const totalSize = product.files.reduce((sum, file) => sum + file.sizeBytes, 0);
  const discount =
    product.compareAtCents && product.compareAtCents > product.priceCents
      ? Math.round(((product.compareAtCents - product.priceCents) / product.compareAtCents) * 100)
      : null;

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-wine-500/[0.07] to-transparent" />
      <div className="container-page py-10 sm:py-14">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-zinc-500" aria-label="Trilha de navegação">
          <Link href="/" className="hover:text-white">Início</Link>
          <span>/</span>
          <Link href="/produtos" className="hover:text-white">Catálogo</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link href={`/produtos?categoria=${product.category.slug}`} className="hover:text-white">
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="max-w-60 truncate text-zinc-300">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
          <div>
            <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-ink-850/60 shadow-card">
              {product.coverImageUrl ? (
                <img
                  src={product.coverImageUrl}
                  alt={`Capa de ${product.name}`}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-[#181221] via-[#101019] to-[#0b0b12]">
                  <div className="absolute inset-0 grid-pattern opacity-60" />
                  <div className="absolute left-1/4 top-1/4 h-56 w-56 rounded-full bg-wine-500/15 blur-3xl" />
                  <div className="absolute bottom-1/4 right-1/4 h-56 w-56 rounded-full bg-neon-500/15 blur-3xl" />
                  <div className="relative flex flex-col items-center">
                    <span className="grid h-24 w-24 place-items-center rounded-3xl border border-white/15 bg-white/[0.05] text-4xl text-wine-300 backdrop-blur">
                      <FileIcon />
                    </span>
                    <p className="mt-6 font-display text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">
                      {product.fileFormat}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">Arquivo digital original</p>
                  </div>
                </div>
              )}
              <div className="absolute left-4 top-4 flex gap-2">
                {product.isFeatured && <span className="badge badge-brand">Destaque</span>}
                {discount && (
                  <span className="badge border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                    {discount}% off
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { icon: <ZapIcon />, label: "Entrega", value: "Automática" },
                { icon: <DownloadIcon />, label: "Downloads", value: `${product.downloadLimit}x` },
                { icon: <LockIcon />, label: "Acesso", value: `${product.downloadExpiryDays} dias` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-center">
                  <span className="mx-auto mb-1.5 flex justify-center text-wine-300">{item.icon}</span>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{item.label}</p>
                  <p className="mt-0.5 text-xs font-semibold text-zinc-200">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              <span className="badge">{product.category?.name ?? "Digital"}</span>
              <span className="badge">{product.fileFormat}</span>
              <span>Atualizado em {formatDate(product.updatedAt)}</span>
            </div>

            <h1 className="mt-5 font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[44px]">
              {product.name}
            </h1>
            <p className="mt-4 text-base leading-7 text-zinc-400">{product.shortDescription}</p>

            <div className="mt-7 rounded-2xl border border-white/10 bg-ink-850/60 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  {product.compareAtCents && product.compareAtCents > product.priceCents && (
                    <p className="text-sm text-zinc-500 line-through">{formatBRL(product.compareAtCents)}</p>
                  )}
                  <p className="font-display text-3xl font-bold text-white">{formatBRL(product.priceCents)}</p>
                  <p className="mt-1 text-xs text-zinc-500">Pagamento único via Pix · sem assinatura</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Licença</p>
                  <p className="mt-1 text-xs font-medium text-zinc-300">Uso pessoal e profissional</p>
                </div>
              </div>

              <AddToCartButton productId={product.id} buyNow className="mt-5" />

              <ul className="mt-5 space-y-2.5 border-t border-white/[0.08] pt-4 text-xs text-zinc-400">
                <li className="flex items-center gap-2"><CheckIcon className="text-emerald-400" /> Acesso liberado após confirmação do Pix</li>
                <li className="flex items-center gap-2"><CheckIcon className="text-emerald-400" /> Arquivos armazenados em local privado</li>
                <li className="flex items-center gap-2"><CheckIcon className="text-emerald-400" /> Suporte por e-mail {settings.supportEmail ? `(${settings.supportEmail})` : ""}</li>
              </ul>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <AddToCartButton productId={product.id} className="sm:w-auto" />
              <ShareWhatsApp text={`Olha este produto: ${product.name}`} />
              {product.previewUrl && (
                <a
                  href={product.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="btn-ghost btn-sm"
                >
                  <SparklesIcon /> Ver prévia
                </a>
              )}
            </div>

            <dl className="mt-7 divide-y divide-white/[0.08] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              {[
                ["Formato dos arquivos", product.fileFormat],
                ["Arquivos incluídos", `${product.files.length} ${product.files.length === 1 ? "arquivo" : "arquivos"}`],
                ["Tamanho aproximado", totalSize > 0 ? `${(totalSize / 1024 / 1024).toFixed(1)} MB` : "Consultar"],
                ["Compatibilidade", product.compatibility ?? "Conforme formato informado"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="text-right font-medium text-zinc-200">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1.4fr_0.6fr]">
          <section>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-gradient-to-r from-wine-500 to-transparent" />
              <h2 className="font-display text-xl font-bold text-white">Sobre este produto</h2>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-ink-850/40 p-6 sm:p-8">
              <Markdown content={product.description} />
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-white">
                <ShieldIcon className="text-brand" /> Compra protegida
              </h2>
              <ul className="mt-4 space-y-3 text-xs leading-5 text-zinc-500">
                <li>O valor é recalculado no servidor com base no preço oficial.</li>
                <li>A entrega ocorre somente após a confirmação do provedor de pagamento.</li>
                <li>Seus downloads são vinculados à sua conta e registrados.</li>
                <li>Política de reembolso disponível nas informações legais.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
              <h2 className="font-display text-sm font-semibold text-white">Precisa de ajuda?</h2>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Antes de comprar, tire dúvidas sobre formato, compatibilidade ou licença.
              </p>
              <Link href="/paginas/contato" className="btn-secondary btn-sm mt-4 w-full">
                Falar com o suporte
              </Link>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Você também pode gostar</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-white">Produtos relacionados</h2>
              </div>
              <Link href="/produtos" className="text-sm font-semibold text-zinc-400 hover:text-white">Ver todos</Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item, index) => (
                <ProductCard key={item.id} product={item} index={index} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
