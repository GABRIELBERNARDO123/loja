import { z } from "zod";
import { assertJsonRequest } from "@/lib/security/csrf";
import { requireAdminApi } from "@/lib/auth/guards";
import { AppError, errorResponse, jsonOk, readJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ status: z.enum(["ACTIVE", "REVOKED"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertJsonRequest(request);
    const admin = await requireAdminApi();
    const { id } = await context.params;
    const body = schema.parse(await readJson(request));

    const entitlement = await prisma.downloadEntitlement.findUnique({ where: { id }, include: { order: true } });
    if (!entitlement) throw new AppError("Acesso não encontrado.", 404);
    if (body.status === "ACTIVE" && entitlement.order.status !== "PAID") {
      throw new AppError("Não é possível reativar downloads de pedido não pago.", 409);
    }

    await prisma.downloadEntitlement.update({ where: { id }, data: { status: body.status } });
    await writeAuditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: body.status === "ACTIVE" ? "admin.entitlement_reactivated" : "admin.entitlement_revoked",
      entityType: "download_entitlement",
      entityId: id,
      metadata: { orderId: entitlement.orderId, productFileId: entitlement.productFileId },
    });

    return jsonOk({ message: body.status === "ACTIVE" ? "Acesso reativado." : "Acesso revogado." });
  } catch (error) {
    return errorResponse(error);
  }
}
