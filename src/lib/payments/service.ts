import type { Order, OrderItem, Payment } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import {
  createPixPayment,
  PaymentNotConfiguredError,
  paymentsConfigured,
} from "@/lib/payments/mercadopago";
import { processProviderPayment } from "@/lib/payments/process";
import { sha256 } from "@/lib/security/crypto";

export { PaymentNotConfiguredError, paymentsConfigured };

export type PixCheckout = {
  payment: Payment;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: Date | null;
};

export async function createOrReusePixPayment(
  order: Order & { items: OrderItem[] },
): Promise<PixCheckout> {
  if (!paymentsConfigured()) throw new PaymentNotConfiguredError();

  const existing = await prisma.payment.findFirst({
    where: {
      orderId: order.id,
      status: { in: ["PENDING", "IN_PROCESS"] },
      qrCode: { not: null },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return {
      payment: existing,
      qrCode: existing.qrCode,
      qrCodeBase64: existing.qrCodeBase64,
      ticketUrl: existing.ticketUrl,
      expiresAt: existing.expiresAt,
    };
  }

  const attempt = (await prisma.payment.count({ where: { orderId: order.id } })) + 1;
  if (attempt > 5) {
    throw new PaymentNotConfiguredError();
  }

  const created = await createPixPayment(order, attempt);

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      providerPaymentId: created.providerPaymentId,
      status: created.status === "approved" ? "APPROVED" : created.status === "pending" ? "PENDING" : "IN_PROCESS",
      statusDetail: created.statusDetail,
      amountCents: order.totalCents,
      currency: "BRL",
      method: "pix",
      qrCode: created.qrCode,
      qrCodeBase64: created.qrCodeBase64,
      ticketUrl: created.ticketUrl,
      expiresAt: created.expiresAt ?? order.expiresAt,
    },
  });

  if (payment.status === "APPROVED") {
    // Alguns meios podem retornar aprovação imediata. A liberação continua
    // passando pela validação server-side e pela criação transacional de acessos.
    await processProviderPayment({
      payment: created.raw,
      signatureValid: true,
      payloadHash: sha256(`create:${payment.providerPaymentId}`),
    }).catch((error) => {
      console.error("Falha ao processar aprovação imediata", error instanceof Error ? error.name : "erro");
    });
  }

  return {
    payment,
    qrCode: payment.qrCode,
    qrCodeBase64: payment.qrCodeBase64,
    ticketUrl: payment.ticketUrl,
    expiresAt: payment.expiresAt,
  };
}

export function paymentConfigurationStatus(): {
  configured: boolean;
  environment: string;
  missing: string[];
} {
  const env = getEnv();
  const missing: string[] = [];
  if (!env.MERCADO_PAGO_ACCESS_TOKEN) missing.push("MERCADO_PAGO_ACCESS_TOKEN");
  if (!env.MERCADO_PAGO_WEBHOOK_SECRET) missing.push("MERCADO_PAGO_WEBHOOK_SECRET");
  if (env.MERCADO_PAGO_ENV === "production" && !env.MERCADO_PAGO_COLLECTOR_ID) {
    missing.push("MERCADO_PAGO_COLLECTOR_ID");
  }
  return {
    configured: Boolean(env.MERCADO_PAGO_ACCESS_TOKEN && env.MERCADO_PAGO_WEBHOOK_SECRET),
    environment: env.MERCADO_PAGO_ENV,
    missing,
  };
}
