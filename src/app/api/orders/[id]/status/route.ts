import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { errorResponse, jsonError, jsonOk } from "@/lib/http";
import { enforceUserRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Não autenticado.", 401);
    await enforceUserRateLimit(user.id, "order-status", 120, 60);
    const { id } = await context.params;

    const order = await prisma.order.findFirst({
      where: { id, userId: user.id },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!order) return jsonError("Pedido não encontrado.", 404);

    return jsonOk({
      status: order.status,
      paidAt: order.paidAt,
      expiresAt: order.expiresAt,
      payment: order.payments[0]
        ? {
            status: order.payments[0].status,
            expiresAt: order.payments[0].expiresAt,
          }
        : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
