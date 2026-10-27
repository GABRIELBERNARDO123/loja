import { assertJsonRequest } from "@/lib/security/csrf";
import { requireAdminApi } from "@/lib/auth/guards";
import { AppError, errorResponse, jsonOk, readJson } from "@/lib/http";
import { couponSchema } from "@/lib/admin/schemas";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    const admin = await requireAdminApi();
    const input = couponSchema.parse(await readJson(request));

    const coupon = await prisma.coupon.create({
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
      action: "admin.coupon_created",
      entityType: "coupon",
      entityId: coupon.id,
      metadata: { code: coupon.code, type: coupon.type, value: coupon.value },
    });

    return jsonOk({ couponId: coupon.id, message: "Cupom criado." });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse(new AppError("Já existe um cupom com este código.", 409));
    }
    return errorResponse(error);
  }
}
