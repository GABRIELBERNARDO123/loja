import type { Metadata } from "next";
import Link from "next/link";
import { RemoveCartButton } from "@/components/cart-buttons";
import { ArrowRight, CartIcon, CheckIcon, FileIcon, LockIcon, ShieldIcon, ZapIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartSummary } from "@/lib/cart";
import { formatBRL } from "@/lib/format";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false, follow: false } };

export default async function CartPage() {
  const user = await getCurrentUser();
  const cart = await getCartSummary(user?.id ?? null);
  const availableTotal = cart.lines.filter((line) => line.available).reduce((sum, line) => sum + line.unitPriceCents, 0);
  const hasUnavailable = cart.lines.some((line) => !line.available);

  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Seu pedido</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">Carrinho</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {cart.itemCount === 0
            ? "Seu carrinho está vazio."
            : `${cart.itemCount} ${cart.itemCount === 1 ? "produto" : "produtos"} · produtos digitais não consomem estoque`}
        </p>
      </div>

      {cart.lines.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-20 text-center">
          <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl text-zinc-500">
            <CartIcon />
          </span>
          <h2 className="font-display text-xl font-semibold text-white">Nada por aqui ainda</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
            Explore o catálogo e adicione arquivos prontos para usar ao seu carrinho.
          </p>
          <Link href="/produtos" className="btn-primary mt-6">
            Explorar catálogo <ArrowRight />
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.5fr_0.7fr]">
          <div className="space-y-3">
            {cart.lines.map((line) => (
              <article
                key={line.productId}
                className="flex gap-4 rounded-2xl border border-white/[0.08] bg-ink-850/50 p-4 sm:p-5"
              >
                <Link
                  href={`/produto/${line.slug}`}
                  className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-wine-500/10 to-neon-500/10 text-2xl text-wine-300"
                >
                  {line.coverImageUrl ? (
                    <img src={line.coverImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <FileIcon />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/produto/${line.slug}`} className="font-display text-base font-semibold text-white hover:text-wine-300">
                        {line.name}
                      </Link>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                        {line.fileFormat} · licença digital · 1 unidade
                      </p>
                      {!line.available && (
                        <p className="mt-2 text-xs font-semibold text-red-300">Indisponível no momento</p>
                      )}
                    </div>
                    <RemoveCartButton productId={line.productId} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
                      <CheckIcon /> download após confirmação
                    </span>
                    <span className="font-display text-lg font-bold text-white">{formatBRL(line.unitPriceCents)}</span>
                  </div>
                </div>
              </article>
            ))}
            <div className="flex items-center justify-between px-1 pt-2">
              <Link href="/produtos" className="text-sm text-zinc-400 hover:text-white">Continuar comprando</Link>
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-white/10 bg-ink-850/60 p-5 lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-semibold text-white">Resumo</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between text-zinc-400">
                <dt>Subtotal</dt>
                <dd className="text-zinc-200">{formatBRL(availableTotal)}</dd>
              </div>
              <div className="flex justify-between text-zinc-400">
                <dt>Entrega</dt>
                <dd className="text-emerald-400">Automática</dd>
              </div>
              {hasUnavailable && (
                <div className="rounded-lg border border-red-400/15 bg-red-400/5 px-3 py-2 text-xs text-red-300">
                  Remova os itens indisponíveis para continuar.
                </div>
              )}
              <div className="divider" />
              <div className="flex items-end justify-between">
                <dt className="font-medium text-white">Total</dt>
                <dd className="font-display text-2xl font-bold text-white">{formatBRL(availableTotal)}</dd>
              </div>
            </dl>

            {hasUnavailable ? (
              <button disabled className="btn-primary mt-5 w-full py-3.5">Remova itens indisponíveis</button>
            ) : (
              <Link
                href={user ? "/checkout" : "/entrar?next=/checkout"}
                className="btn-primary mt-5 w-full py-3.5"
              >
                {user ? "Ir para o checkout" : "Entrar e finalizar"} <ArrowRight />
              </Link>
            )}

            <div className="mt-5 space-y-2.5 border-t border-white/[0.08] pt-4 text-[11px] text-zinc-500">
              <p className="flex items-center gap-2"><LockIcon className="text-emerald-400" /> Checkout protegido</p>
              <p className="flex items-center gap-2"><ZapIcon className="text-wine-300" /> Liberação após o Pix</p>
              <p className="flex items-center gap-2"><ShieldIcon className="text-neon-400" /> Preço validado no servidor</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
