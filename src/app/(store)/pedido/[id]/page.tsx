import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentPanel } from "@/components/payment-panel";
import { StatusBadge } from "@/components/status-badge";
import { ArrowRight, CheckCircleIcon, DownloadIcon, FileIcon, ShieldIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth/guards";
import { getOrderForUser } from "@/lib/orders";
import { formatBRL, formatDateTime, orderStatusLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Pedido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("/conta/pedidos");
  const { id } = await params;
  const order = await getOrderForUser(id, user.id);
  if (!order) notFound();

  const payment = order.payments[0] ?? null;
  const isPaid = order.status === "PAID";

  return (
    <div className="container-page max-w-5xl py-12 sm:py-16">
      <nav className="mb-6 text-xs text-zinc-500" aria-label="Trilha">
        <Link href="/conta/pedidos" className="hover:text-white">Meus pedidos</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">{order.code}</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Pedido {order.code}</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white">
            {isPaid ? "Pagamento confirmado" : "Aguardando pagamento"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">Criado em {formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} label={orderStatusLabel(order.status)} />
      </div>

      {isPaid ? (
        <div className="mb-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-xl text-emerald-300">
              <CheckCircleIcon />
            </span>
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-white">Seus arquivos estão liberados</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                O pagamento foi validado pelo provedor e os downloads já estão disponíveis na sua biblioteca.
              </p>
              <Link href="/conta/biblioteca" className="btn-primary mt-4">
                <DownloadIcon /> Acessar biblioteca
              </Link>
            </div>
          </div>
        </div>
      ) : order.status === "PENDING" ? (
        <div className="mb-8 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <PaymentPanel
            orderId={order.id}
            initialStatus={order.status}
            qrCode={payment?.qrCode ?? null}
            qrCodeBase64={payment?.qrCodeBase64 ?? null}
            ticketUrl={payment?.ticketUrl ?? null}
            expiresAt={(payment?.expiresAt ?? order.expiresAt)?.toISOString() ?? null}
          />
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-white">
              <ShieldIcon className="text-emerald-400" /> O que acontece depois?
            </h2>
            <ol className="mt-4 space-y-4 text-xs leading-5 text-zinc-500">
              <li className="flex gap-3"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/5 text-[10px] font-bold text-zinc-300">1</span> Você paga o Pix gerado pelo provedor.</li>
              <li className="flex gap-3"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/5 text-[10px] font-bold text-zinc-300">2</span> O provedor envia a confirmação assinada ao servidor.</li>
              <li className="flex gap-3"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/5 text-[10px] font-bold text-zinc-300">3</span> Validamos valor, conta recebedora e referência do pedido.</li>
              <li className="flex gap-3"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/5 text-[10px] font-bold text-zinc-300">4</span> Os downloads são liberados na sua biblioteca.</li>
            </ol>
            <p className="mt-4 border-t border-white/[0.08] pt-4 text-[11px] leading-5 text-zinc-600">
              Se o Pix expirar, gere uma nova cobrança no painel ao lado. Em caso de instabilidade, fale com o suporte.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5 text-sm leading-6 text-amber-200">
          Este pedido não foi concluído ({orderStatusLabel(order.status)}). Se você acredita que houve um erro, entre em
          contato com o suporte informando o código {order.code}.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
          <h2 className="font-display text-base font-semibold text-white">Itens do pedido</h2>
          <ul className="mt-4 divide-y divide-white/[0.08]">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-wine-300">
                  <FileIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-200">{item.productName}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                    {item.fileFormat} · {item.quantity} licença
                  </p>
                </div>
                <span className="text-sm font-semibold text-white">{formatBRL(item.totalCents)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-white/[0.08] pt-4 text-sm">
            <div className="flex justify-between text-zinc-500"><dt>Subtotal</dt><dd className="text-zinc-300">{formatBRL(order.subtotalCents)}</dd></div>
            {order.discountCents > 0 && (
              <div className="flex justify-between text-emerald-400"><dt>Desconto {order.couponCode ? `(${order.couponCode})` : ""}</dt><dd>-{formatBRL(order.discountCents)}</dd></div>
            )}
            <div className="flex items-end justify-between pt-2"><dt className="font-medium text-white">Total</dt><dd className="font-display text-xl font-bold text-white">{formatBRL(order.totalCents)}</dd></div>
          </dl>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Comprador</h2>
            <p className="mt-3 text-sm font-medium text-white">{order.customerName}</p>
            <p className="mt-1 break-all text-xs text-zinc-500">{order.customerEmail}</p>
          </div>
          {payment && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Pagamento</h2>
              <p className="mt-3 text-sm text-zinc-300">Pix · {payment.status}</p>
              {payment.approvedAt && <p className="mt-1 text-xs text-zinc-500">Aprovado em {formatDateTime(payment.approvedAt)}</p>}
            </div>
          )}
          <Link href="/paginas/contato" className="btn-secondary w-full">
            Preciso de ajuda <ArrowRight />
          </Link>
        </div>
      </div>
    </div>
  );
}
