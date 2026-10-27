import { z } from "zod";
import { assertJsonRequest } from "@/lib/security/csrf";
import { requireAdminApi } from "@/lib/auth/guards";
import { AppError, errorResponse, jsonOk, readJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertJsonRequest(request);
    const admin = await requireAdminApi();
    const { id } = await context.params;
    if (id === admin.id) throw new AppError("Você não pode alterar o status da sua própria conta.", 409);

    const body = schema.parse(await readJson(request));
    const target = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!target) throw new AppError("Cliente não encontrado.", 404);
    if (target.role.name === "ADMIN") throw new AppError("Contas administrativas não podem ser desativadas por aqui.", 403);

    const user = await prisma.user.update({ where: { id }, data: { isActive: body.isActive } });
    if (!body.isActive) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    await writeAuditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: body.isActive ? "admin.user_activated" : "admin.user_deactivated",
      entityType: "user",
      entityId: id,
      metadata: { email: user.email },
    });

    return jsonOk({ message: body.isActive ? "Cliente ativado." : "Cliente desativado." });
  } catch (error) {
    return errorResponse(error);
  }
}
