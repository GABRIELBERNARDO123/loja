import { Prisma, type OrderStatus, type Payment } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import {
  mapPaymentStatus,
  validateProviderPaymentAgainstOrder,
  type MpPayment,
} from "@/lib/payments/mercadopago";
import { writeAuditLog } from "@/lib/audit";

export type ProcessResult =
  | { ok: true; result: "approved" | "status_updated" | "duplicate" | "ignored" }
  | { ok: false; result: string; message: string };

function orderStatusForPayment(status: Payment["status"]): OrderStatus | null {
  switch (status) {
    case "REFUNDED":
      return "REFUNDED";
    case "CHARGED_BACK":
      return "CHARGEBACK";
    case "REJECTED":
      return "FAILED";
    case "CANCELLED":
      return "CANCELED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return null;
  }
}

export async function ensureEntitlementsForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<number> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.status !== "PAID") return 0;

  const productIds = order.items
    .map((item) => item.productId)
    .filter((id): id is string => Boolean(id));
  if (productIds.length === 0) return 0;

  const files = await tx.productFile.findMany({ where: { productId: { in: productIds } } });
  const filesByProduct = new Map<string, typeof files>();
  for (const file of files) {
    const list = filesByProduct.get(file.productId) ?? [];
    list.push(file);
    filesByProduct.set(file.productId, list);
  }

  const baseDate = order.paidAt ?? new Date();
  const entitlements = order.items.flatMap((item) => {
    if (!item.productId) return [];
    const productFiles = filesByProduct.get(item.productId) ?? [];
    return productFiles.map((file) => ({
      userId: order.userId,
      orderId: order.id,
      orderItemId: item.id,
      productId: item.productId as string,
      productFileId: file.id,
      maxDownloads: item.downloadLimit,
      expiresAt: new Date(baseDate.getTime() + item.expiryDays * 24 * 60 * 60 * 1000),
    }));
  });

  if (entitlements.length === 0) return 0;
  const created = await tx.downloadEntitlement.createMany({
    data: entitlements,
    skipDuplicates: true,
  });
  return created.count;
}

async function recordEvent(
  tx: Prisma.TransactionClient,
  params: {
    dedupeKey: string;
    providerPaymentId: string;
    orderId: string | null;
    type: string;
    signatureValid: boolean;
    payloadHash: string;
    result: string;
  },
): Promise<void> {
  await tx.paymentEvent.create({
    data: {
      dedupeKey: params.dedupeKey,
      providerPaymentId: params.providerPaymentId,
      orderId: params.orderId,
      type: params.type,
      signatureValid: params.signatureValid,
      payloadHash: params.payloadHash,
      result: params.result,
    },
  });
}

export async function processProviderPayment(params: {
  payment: MpPayment;
  signatureValid: boolean;
  payloadHash: string;
  dedupeSuffix?: string;
}): Promise<ProcessResult> {
  const env = getEnv();
  const providerPaymentId = String(params.payment.id);
  const mappedStatus = mapPaymentStatus(params.payment.status);
  const dedupeKey = params.dedupeSuffix
    ? `mp:${providerPaymentId}:${params.dedupeSuffix}`
    : `mp:${providerPaymentId}:${params.payment.status}:${params.payment.status_detail ?? ""}`;

  const order = await prisma.order.findFirst({
    where: { id: params.payment.external_reference ?? "__invalid__" },
    include: { items: true },
  });

  if (!order) {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${dedupeKey}))`;
      const existing = await tx.paymentEvent.findUnique({ where: { dedupeKey } });
      if (existing) return;
      await recordEvent(tx, {
        dedupeKey,
        providerPaymentId,
        orderId: null,
        type: params.payment.status,
        signatureValid: params.signatureValid,
        payloadHash: params.payloadHash,
        result: "pedido_nao_encontrado",
      });
    });
    return { ok: false, result: "pedido_nao_encontrado", message: "Pedido não encontrado." };
  }

  const validation = validateProviderPaymentAgainstOrder({
    payment: params.payment,
    order,
    env: {
      production: env.MERCADO_PAGO_ENV === "production",
      collectorId: env.MERCADO_PAGO_COLLECTOR_ID || null,
    },
  });

  if (!validation.ok) {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${dedupeKey}))`;
      const existing = await tx.paymentEvent.findUnique({ where: { dedupeKey } });
      if (existing) return;
      await recordEvent(tx, {
        dedupeKey,
        providerPaymentId,
        orderId: order.id,
        type: params.payment.status,
        signatureValid: params.signatureValid,
        payloadHash: params.payloadHash,
        result: validation.reason,
      });
    });
    console.error(`Pagamento ${providerPaymentId} recusado: ${validation.reason}`);
    return { ok: false, result: validation.reason, message: "Pagamento não confere com o pedido." };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${dedupeKey}))`;
        const existing = await tx.paymentEvent.findUnique({ where: { dedupeKey } });
        if (existing) return { ok: true as const, result: "duplicate" as const };

        const currentOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });
        if (!currentOrder) throw new Error("Pedido desapareceu durante o processamento.");

        const payment = await tx.payment.upsert({
          where: { providerPaymentId },
          create: {
            orderId: currentOrder.id,
            providerPaymentId,
            status: mappedStatus,
            statusDetail: params.payment.status_detail ?? null,
            amountCents: Math.round(params.payment.transaction_amount * 100),
            currency: params.payment.currency_id,
            method: params.payment.payment_method_id ?? "pix",
            expiresAt: params.payment.date_of_expiration ? new Date(params.payment.date_of_expiration) : null,
            approvedAt: mappedStatus === "APPROVED" ? new Date() : null,
          },
          update: {
            status: mappedStatus,
            statusDetail: params.payment.status_detail ?? null,
            approvedAt: mappedStatus === "APPROVED" ? new Date() : undefined,
          },
        });

        if (payment.orderId !== currentOrder.id) {
          throw new Error("Pagamento associado a outro pedido.");
        }

        let finalResult: "approved" | "status_updated" | "ignored" = "ignored";

        if (mappedStatus === "APPROVED") {
          if (currentOrder.status !== "PAID") {
            await tx.order.update({
              where: { id: currentOrder.id },
              data: {
                status: "PAID",
                paidAt: currentOrder.paidAt ?? new Date(),
              },
            });
          }
          const created = await ensureEntitlementsForOrder(tx, currentOrder.id);
          finalResult = "approved";
          await writeAuditLog({
            action: "payment.approved",
            entityType: "order",
            entityId: currentOrder.id,
            actorEmail: "sistema",
            metadata: { providerPaymentId, entitlementsCreated: created },
          }, tx);
        } else if (mappedStatus === "REFUNDED" || mappedStatus === "CHARGED_BACK") {
          const nextStatus = orderStatusForPayment(mappedStatus);
          if (nextStatus && currentOrder.status === "PAID") {
            await tx.order.update({ where: { id: currentOrder.id }, data: { status: nextStatus } });
            await tx.downloadEntitlement.updateMany({
              where: { orderId: currentOrder.id },
              data: { status: "REVOKED" },
            });
            finalResult = "status_updated";
          }
        } else {
          const nextStatus = orderStatusForPayment(mappedStatus);
          if (nextStatus && currentOrder.status === "PENDING") {
            await tx.order.update({ where: { id: currentOrder.id }, data: { status: nextStatus } });
            finalResult = "status_updated";
          }
        }

        await recordEvent(tx, {
          dedupeKey,
          providerPaymentId,
          orderId: currentOrder.id,
          type: params.payment.status,
          signatureValid: params.signatureValid,
          payloadHash: params.payloadHash,
          result: finalResult,
        });

        return { ok: true as const, result: finalResult };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 },
    );
    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: true, result: "duplicate" };
    }
    console.error("Erro ao processar pagamento", error instanceof Error ? error.message : "erro");
    return { ok: false, result: "erro_processamento", message: "Falha ao processar pagamento." };
  }
}
