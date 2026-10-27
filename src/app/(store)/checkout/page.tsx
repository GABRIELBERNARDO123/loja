import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { ArrowRight, CheckIcon, FileIcon, LockIcon, ShieldIcon, ZapIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth/guards";
import { getCheckoutPreview, OrderError } from "@/lib/orders";
import { paymentConfigurationStatus } from "@/lib/payments/service";
import { formatBRL } from "@/lib/format";
import { getEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("/checkout");
  const params = await searchParams;
  const coupon = typeof params.cupom === "string" ? params.cupom.slice(0, 40) : "";

  let preview;
  let couponError = "";
  try {
    preview = await getCheckoutPreview(user.id, coupon);
  } catch (error) {
    if (error instanceof OrderError && error.message.includes("Carrinho")) redirect("/carrinho");
    if (error instanceof OrderError && coupon) {
      couponError = error.message;
      try {
        preview = await getCheckoutPreview(user.id);
      } catch {
        redirect("/carrinho");
      }
    } else {
      throw error;
    }
  }

  if (!preview) redirect("/carrinho");
  const paymentStatus = paymentConfigurationStatus();
  const env = getEnv();

  return (
    <div className="container-page py-12 sm:py-16">
      <nav className="mb-6 text-xs text-zinc-500" aria-label="Etapas">
        <Link href="/carrinho" className="hover:text-white">Carrinho</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-200">Checkout</span>
      </nav>
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Última etapa</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">Finalizar compra</h1>
        <p className="mt-2 text-sm text-zinc-500">Confirme seus dados e gere o Pix. O acesso é liberado automaticamente após a confirmação.</p>
      </div>

      {!paymentStatus.configured && (
        <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm leading-6 text-amber-200">
          <strong className="font-semibold">Pagamento indisponível no momento.</strong> A integração Pix ainda não foi
          configurada neste ambiente. Nenhuma cobrança será criada.
        </div>
      )}

      {env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerifiedAt && (
        <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-200">
          Confirme seu e-mail antes de finalizar a compra.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <CheckoutForm
          defaultName={user.name}
          defaultEmail={user.email}
          couponCode={preview.couponCode ?? ""}
          paymentsReady={paymentStatus.configured}
          emailVerified={Boolean(user.emailVerifiedAt) || !env.REQUIRE_EMAIL_VERIFICATION}
        />

        <aside className="h-fit rounded-2xl border border-white/10 bg-ink-850/60 p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-semibold text-white">Resumo do pedido</h2>
          <ul className="mt-4 space-y-3">
            {preview.lines.map((line) => (
              <li key={line.productId} className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-wine-300">
                  <FileIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-zinc-200">{line.name}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-zinc-600">{line.fileFormat}</p>
                </div>
                <span className="text-sm font-semibold text-white">{formatBRL(line.unitPriceCents)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2.5 border-t border-white/[0.08] pt-4 text-sm">
            <div className="flex justify-between text-zinc-400">
              <dt>Subtotal</dt>
              <dd className="text-zinc-200">{formatBRL(preview.subtotalCents)}</dd>
            </div>
            {preview.discountCents > 0 && (
              <div className="flex justify-between text-emerald-400">
                <dt>Desconto {preview.couponCode ? `(${preview.couponCode})` : ""}</dt>
                <dd>-{formatBRL(preview.discountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between text-zinc-400">
              <dt>Entrega</dt>
              <dd className="text-emerald-400">Digital, automática</dd>
            </div>
            <div className="divider !my-3" />
            <div className="flex items-end justify-between">
              <dt className="font-medium text-white">Total</dt>
              <dd className="font-display text-2xl font-bold text-white">{formatBRL(preview.totalCents)}</dd>
            </div>
          </dl>

          <div className="mt-5 space-y-2 border-t border-white/[0.08] pt-4 text-[11px] text-zinc-500">
            <p className="flex items-center gap-2"><LockIcon className="text-emerald-400" /> Valor recalculado no servidor</p>
            <p className="flex items-center gap-2"><ZapIcon className="text-wine-300" /> Entrega após confirmação do Pix</p>
            <p className="flex items-center gap-2"><ShieldIcon className="text-neon-400" /> Download protegido por conta</p>
          </div>
          <Link href="/carrinho" className="mt-4 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white">
            Voltar ao carrinho <ArrowRight />
          </Link>
        </aside>
      </div>

      {couponError && (
        <p className="mt-4 text-xs text-red-300">Cupom: {couponError}</p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4 text-[11px] text-zinc-600">
        <span className="flex items-center gap-1.5"><CheckIcon className="text-emerald-500" /> Compra protegida</span>
        <span className="flex items-center gap-1.5"><CheckIcon className="text-emerald-500" /> Termos aceitos no cadastro</span>
        <span className="flex items-center gap-1.5"><CheckIcon className="text-emerald-500" /> Suporte pós-compra</span>
      </div>
    </div>
  );
}
