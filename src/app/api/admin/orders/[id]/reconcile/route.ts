import { assertSameOrigin } from "@/lib/security/csrf";
import { requireAdminApi } from "@/lib/auth/guards";
import { AppError, errorResponse, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/db";
import { fetchPayment } from "@/lib/payments/mercadopago";
import { processProviderPayment } from "@/lib/payments/process";
import { sha256 } from "@/lib/security/crypto";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdminApi();
    const { id } = await context.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!order) throw new AppError("Pedido não encontrado.", 404);
    const payment = order.payments[0];
    if (!payment) throw new AppError("Este pedido ainda não possui cobrança no provedor.", 409);

    const providerPayment = await fetchPayment(payment.providerPaymentId);
    const result = await processProviderPayment({
      payment: providerPayment,
      signatureValid: true,
      payloadHash: sha256(JSON.stringify(providerPayment)),
      dedupeSuffix: `reconcile:${providerPayment.status}:${providerPayment.status_detail ?? ""}`,
    });

    await writeAuditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "admin.payment_reconciled",
      entityType: "order",
      entityId: order.id,
      metadata: { providerPaymentId: payment.providerPaymentId, result: result.result },
    });

    if (!result.ok) {
      return errorResponse(new AppError(`Conciliação recusada: ${result.message}`, 409));
    }

    return jsonOk({ message: "Conciliação executada.", result: result.result });
  } catch (error) {
    return errorResponse(error);
  }
}
