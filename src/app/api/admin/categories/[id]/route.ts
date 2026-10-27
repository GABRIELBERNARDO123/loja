import { assertJsonRequest, assertSameOrigin } from "@/lib/security/csrf";
import { requireAdminApi } from "@/lib/auth/guards";
import { AppError, errorResponse, jsonOk, readJson } from "@/lib/http";
import { categorySchema } from "@/lib/admin/schemas";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/format";
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
      const category = await prisma.category.update({ where: { id }, data: { isActive: raw.isActive } });
      await writeAuditLog({
        actorId: admin.id,
        actorEmail: admin.email,
        action: raw.isActive ? "admin.category_activated" : "admin.category_deactivated",
        entityType: "category",
        entityId: id,
      });
      return jsonOk({ message: "Categoria atualizada.", isActive: category.isActive });
    }

    const input = categorySchema.parse(raw);
    const slug = slugify(input.slug || input.name);
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: input.name,
        slug,
        description: input.description || null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
    });
    await writeAuditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "admin.category_updated",
      entityType: "category",
      entityId: id,
      metadata: { name: category.name },
    });
    return jsonOk({ message: "Categoria atualizada." });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse(new AppError("Já existe uma categoria com este slug.", 409));
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return errorResponse(new AppError("Categoria não encontrada.", 404));
    }
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdminApi();
    const { id } = await context.params;
    const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!category) throw new AppError("Categoria não encontrada.", 404);
    if (category._count.products > 0) {
      throw new AppError("Remova ou mova os produtos desta categoria antes de excluí-la.", 409);
    }
    await prisma.category.delete({ where: { id } });
    await writeAuditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "admin.category_deleted",
      entityType: "category",
      entityId: id,
      metadata: { name: category.name },
    });
    return jsonOk({ message: "Categoria removida." });
  } catch (error) {
    return errorResponse(error);
  }
}
