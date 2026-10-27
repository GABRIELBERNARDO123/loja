import { z } from "zod";
import { assertJsonRequest } from "@/lib/security/csrf";
import { requireAdminApi } from "@/lib/auth/guards";
import { AppError, errorResponse, jsonOk, readJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { ensureEntitlementsForOrder } from "@/lib/payments/process";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ action: z.enum(["sync", "reactivate"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertJsonRequest(request);
    const admin = await requireAdminApi();
    const { id } = await context.params;
    const body = schema.parse(await readJson(request));

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new AppError("Pedido não encontrado.", 404);
    if (order.status !== "PAID") {
      throw new AppError("Somente pedidos pagos podem ter downloads liberados.", 409);
    }

    const result = await prisma.$transaction(async (tx) => {
      let created = 0;
      let reactivated = 0;
      if (body.action === "sync") {
        created = await ensureEntitlementsForOrder(tx, order.id);
      } else {
        const updated = await tx.downloadEntitlement.updateMany({
          where: { orderId: order.id, status: "REVOKED" },
          data: { status: "ACTIVE" },
        });
        reactivated = updated.count;
        created = await ensureEntitlementsForOrder(tx, order.id);
      }
      return { created, reactivated };
    });

    await writeAuditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: body.action === "sync" ? "admin.entitlements_synced" : "admin.entitlements_reactivated",
      entityType: "order",
      entityId: order.id,
      metadata: result,
    });

    return jsonOk({
      message:
        body.action === "sync"
          ? "Downloads sincronizados com os arquivos atuais."
          : "Downloads reativados com sucesso.",
      ...result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
