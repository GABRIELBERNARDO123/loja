import { assertJsonRequest } from "@/lib/security/csrf";
import { requireAdminApi } from "@/lib/auth/guards";
import { AppError, errorResponse, jsonOk, readJson } from "@/lib/http";
import { productSchema } from "@/lib/admin/schemas";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertJsonRequest(request);
    const admin = await requireAdminApi();
    const { id } = await context.params;
    const raw = (await readJson(request, 200_000)) as Record<string, unknown>;

    if (Object.keys(raw).length === 1 && typeof raw.isActive === "boolean") {
      const product = await prisma.product.update({ where: { id }, data: { isActive: raw.isActive } });
      await writeAuditLog({
        actorId: admin.id,
        actorEmail: admin.email,
        action: raw.isActive ? "admin.product_activated" : "admin.product_deactivated",
        entityType: "product",
        entityId: id,
      });
      return jsonOk({ message: raw.isActive ? "Produto ativado." : "Produto desativado.", isActive: product.isActive });
    }

    const input = productSchema.parse(raw);
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new AppError("Produto não encontrado.", 404);

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        shortDescription: input.shortDescription,
        description: input.description,
        priceCents: input.priceCents,
        compareAtCents: input.compareAtCents,
        categoryId: input.categoryId,
        coverImageUrl: input.coverImageUrl,
        previewUrl: input.previewUrl,
        fileFormat: input.fileFormat,
        compatibility: input.compatibility,
        sortOrder: input.sortOrder,
        downloadLimit: input.downloadLimit,
        downloadExpiryDays: input.downloadExpiryDays,
        isActive: input.isActive,
        isFeatured: input.isFeatured,
      },
    });

    await writeAuditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "admin.product_updated",
      entityType: "product",
      entityId: product.id,
      metadata: { name: product.name, priceCents: product.priceCents },
    });

    return jsonOk({ productId: product.id, slug: product.slug, message: "Produto atualizado." });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse(new AppError("Já existe um produto com este slug.", 409));
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return errorResponse(new AppError("Produto não encontrado.", 404));
    }
    return errorResponse(error);
  }
}
