import { assertJsonRequest } from "@/lib/security/csrf";
import { requireAdminApi } from "@/lib/auth/guards";
import { AppError, errorResponse, jsonOk, readJson } from "@/lib/http";
import { couponSchema } from "@/lib/admin/schemas";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertJsonRequest(request);
    const admin = await requireAdminApi();
    const { id } = await context.params;
    const raw = (await readJson(request)) as Record<string, unknown>;

    if (Object.keys(raw).length === 1 && typeof raw.isActive === "boolean") {
      const coupon = await prisma.coupon.update({ where: { id }, data: { isActive: raw.isActive } });
      await writeAuditLog({
        actorId: admin.id,
        actorEmail: admin.email,
        action: raw.isActive ? "admin.coupon_activated" : "admin.coupon_deactivated",
        entityType: "coupon",
        entityId: id,
      });
      return jsonOk({ message: "Cupom atualizado.", isActive: coupon.isActive });
    }

    const input = couponSchema.parse(raw);
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: input.code,
        description: input.description || null,
        type: input.type,
        value: input.numericValue,
        minSubtotalCents: input.minSubtotalCents,
        maxDiscountCents: input.maxDiscountCents,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        maxRedemptions: input.maxRedemptions,
        perUserLimit: input.perUserLimit,
        isActive: input.isActive,
      },
    });
    await writeAuditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "admin.coupon_updated",
      entityType: "coupon",
      entityId: id,
      metadata: { code: coupon.code },
    });
    return jsonOk({ message: "Cupom atualizado." });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse(new AppError("Já existe um cupom com este código.", 409));
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return errorResponse(new AppError("Cupom não encontrado.", 404));
    }
    return errorResponse(error);
  }
}
