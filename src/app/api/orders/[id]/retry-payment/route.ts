import { assertSameOrigin } from "@/lib/security/csrf";
import { AppError, errorResponse, jsonOk } from "@/lib/http";
import { requireUserApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { createOrReusePixPayment } from "@/lib/payments/service";
import { enforceUserRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUserApi();
    await enforceUserRateLimit(user.id, "retry-payment", 5, 600);
    const { id } = await context.params;

    const order = await prisma.order.findFirst({
      where: { id, userId: user.id },
      include: { items: true },
    });
    if (!order) throw new AppError("Pedido não encontrado.", 404);
    if (order.status !== "PENDING") throw new AppError("Este pedido não permite nova cobrança.", 409);

    const pix = await createOrReusePixPayment(order);
    return jsonOk({
      message: "Nova cobrança gerada.",
      paymentStatus: pix.payment.status,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
