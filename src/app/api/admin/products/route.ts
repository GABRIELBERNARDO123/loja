import { assertJsonRequest } from "@/lib/security/csrf";
import { requireAdminApi } from "@/lib/auth/guards";
import { AppError, errorResponse, jsonOk, readJson } from "@/lib/http";
import { productSchema } from "@/lib/admin/schemas";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    const admin = await requireAdminApi();
    const input = productSchema.parse(await readJson(request, 200_000));

    const product = await prisma.product.create({
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
      action: "admin.product_created",
      entityType: "product",
      entityId: product.id,
      metadata: { name: product.name, priceCents: product.priceCents },
    });

    return jsonOk({ productId: product.id, slug: product.slug, message: "Produto criado." });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse(new AppError("Já existe um produto com este slug.", 409));
    }
    return errorResponse(error);
  }
}
