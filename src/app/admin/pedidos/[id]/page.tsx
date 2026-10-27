import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge } from "@/components/status-badge";
import { AlertIcon, ChevronLeft, DownloadIcon, RefreshIcon, ShieldIcon } from "@/components/icons";
import { prisma } from "@/lib/db";
import { formatBRL, formatDateTime, orderStatusLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Detalhe do pedido" };
export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      items: true,
      coupon: true,
      payments: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" }, take: 20 },
      entitlements: { include: { productFile: true, product: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/pedidos" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white">
          <ChevronLeft /> Voltar para pedidos
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">{order.code}</h1>
            <p className="mt-1 text-sm text-zinc-500">Criado em {formatDateTime(order.createdAt)}</p>
          </div>
          <StatusBadge status={order.status} label={orderStatusLabel(order.status)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {order.payments[0] && (
          <ActionButton
            url={`/api/admin/orders/${order.id}/reconcile`}
            method="POST"
            className="btn-secondary btn-sm"
            pendingLabel="Consultando provedor..."
          >
            <RefreshIcon /> Conciliar com o provedor
          </ActionButton>
        )}
        {order.status === "PAID" && (
          <>
            <ActionButton
              url={`/api/admin/orders/${order.id}/entitlements`}
              method="POST"
              body={{ action: "sync" }}
              className="btn-secondary btn-sm"
            >
              <DownloadIcon /> Sincronizar downloads
            </ActionButton>
            <ActionButton
              url={`/api/admin/orders/${order.id}/entitlements`}
              method="POST"
              body={{ action: "reactivate" }}
              className="btn-secondary btn-sm"
              confirmMessage="Reativar todos os downloads revogados deste pedido?"
            >
              Reativar acessos
            </ActionButton>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-sky-400/15 bg-sky-400/[0.04] p-4 text-xs leading-5 text-sky-200/90">
        <p className="flex items-start gap-2">
          <ShieldIcon className="mt-0.5 shrink-0" />
          Não existe ação de marcar como pago manualmente. A confirmação depende da consulta server-side ao provedor e da
          validação de valor, moeda, referência e conta recebedora.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
            <h2 className="font-display text-base font-semibold text-white">Itens e valores</h2>
            <ul className="mt-4 divide-y divide-white/[0.08]">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm text-zinc-200">{item.productName}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-600">{item.fileFormat} · licença {item.quantity} · {item.downloadLimit} downloads/{item.expiryDays} dias</p>
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
              <div className="flex justify-between pt-2"><dt className="font-medium text-white">Total</dt><dd className="font-display text-xl font-bold text-white">{formatBRL(order.totalCents)}</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
            <h2 className="font-display text-base font-semibold text-white">Downloads</h2>
            {order.entitlements.length === 0 ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 text-xs text-amber-200">
                <AlertIcon className="mt-0.5 shrink-0" />
                Nenhum download gerado. Se o pedido está pago, envie os arquivos do produto e clique em “Sincronizar downloads”.
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.08]">
                {order.entitlements.map((entitlement) => (
                  <li key={entitlement.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-200">{entitlement.productFile.originalName}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-600">
                        {entitlement.product.name} · {entitlement.downloadCount}/{entitlement.maxDownloads} downloads · expira {formatDateTime(entitlement.expiresAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={entitlement.status} label={entitlement.status === "ACTIVE" ? "Ativo" : "Revogado"} />
                      <ActionButton
                        url={`/api/admin/entitlements/${entitlement.id}`}
                        method="PATCH"
                        body={{ status: entitlement.status === "ACTIVE" ? "REVOKED" : "ACTIVE" }}
                        className={entitlement.status === "ACTIVE" ? "btn-danger btn-sm" : "btn-secondary btn-sm"}
                      >
                        {entitlement.status === "ACTIVE" ? "Revogar" : "Reativar"}
                      </ActionButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-ink-850/50 p-5">
            <h2 className="font-display text-base font-semibold text-white">Eventos de pagamento</h2>
            <div className="mt-4 space-y-2">
              {order.events.length > 0 ? order.events.map((event) => (
                <div key={event.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-[11px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-200">{event.type} → {event.result}</span>
                    <span className="text-zinc-600">{formatDateTime(event.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-zinc-600">provider payment {event.providerPaymentId ?? "—"} · assinatura {event.signatureValid ? "válida" : "inválida"}</p>
                </div>
              )) : <p className="text-xs text-zinc-500">Nenhum evento registrado.</p>}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Cliente</h2>
            <p className="mt-3 text-sm font-medium text-white">{order.user.name}</p>
            <p className="mt-1 break-all text-xs text-zinc-500">{order.user.email}</p>
            <p className="mt-3 text-[10px] text-zinc-600">ID {order.user.id}</p>
          </div>

          {order.payments.map((payment) => (
            <div key={payment.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Pagamento</h2>
              <dl className="mt-3 space-y-2 text-[11px]">
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Status</dt><dd className="text-zinc-300">{payment.status}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Detalhe</dt><dd className="max-w-40 truncate text-right text-zinc-400">{payment.statusDetail ?? "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Valor</dt><dd className="text-zinc-300">{formatBRL(payment.amountCents)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Provider ID</dt><dd className="max-w-40 truncate text-right font-mono text-[10px] text-zinc-500">{payment.providerPaymentId}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Criado</dt><dd className="text-zinc-400">{formatDateTime(payment.createdAt)}</dd></div>
                {payment.approvedAt && <div className="flex justify-between gap-3"><dt className="text-zinc-600">Aprovado</dt><dd className="text-emerald-400">{formatDateTime(payment.approvedAt)}</dd></div>}
              </dl>
            </div>
          ))}

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-[11px] leading-5 text-zinc-500">
            Pedido criado com snapshot imutável de preços. Alterações posteriores no catálogo não modificam este pedido.
          </div>
        </aside>
      </div>
    </div>
  );
}
