import { z } from "zod";
import { assertJsonRequest } from "@/lib/security/csrf";
import { AppError, errorResponse, jsonOk, readJson } from "@/lib/http";
import { requireUserApi } from "@/lib/auth/guards";
import { createOrderFromCart } from "@/lib/orders";
import { createOrReusePixPayment, paymentsConfigured } from "@/lib/payments/service";
import { enforceUserRateLimit } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/lib/audit";
import { normalizeCouponCode } from "@/lib/coupons";

export const runtime = "nodejs";

const schema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(160),
  couponCode: z.string().trim().max(40).optional().default(""),
  idempotencyKey: z.string().min(12).max(100),
});

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    const user = await requireUserApi();
    await enforceUserRateLimit(user.id, "checkout", 10, 600);

    if (!paymentsConfigured()) {
      throw new AppError("Pagamento Pix ainda não configurado nesta loja. Tente novamente mais tarde.", 503);
    }

    const body = schema.parse(await readJson(request));

    const { order, reused } = await createOrderFromCart({
      userId: user.id,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      couponCode: body.couponCode ? normalizeCouponCode(body.couponCode) : undefined,
      checkoutKey: body.idempotencyKey,
    });

    const pix = await createOrReusePixPayment(order);

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: reused ? "checkout.reused" : "checkout.created",
      entityType: "order",
      entityId: order.id,
      metadata: { totalCents: order.totalCents, paymentId: pix.payment.providerPaymentId },
    });

    return jsonOk({
      orderId: order.id,
      code: order.code,
      totalCents: order.totalCents,
      paymentStatus: pix.payment.status,
      reused,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
