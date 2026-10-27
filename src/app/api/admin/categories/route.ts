import { assertJsonRequest } from "@/lib/security/csrf";
import { requireAdminApi } from "@/lib/auth/guards";
import { AppError, errorResponse, jsonOk, readJson } from "@/lib/http";
import { categorySchema } from "@/lib/admin/schemas";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/format";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    const admin = await requireAdminApi();
    const input = categorySchema.parse(await readJson(request));
    const slug = slugify(input.slug || input.name);
    if (!slug) throw new AppError("Slug inválido.", 422);

    const category = await prisma.category.create({
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
      action: "admin.category_created",
      entityType: "category",
      entityId: category.id,
      metadata: { name: category.name },
    });
    return jsonOk({ categoryId: category.id, message: "Categoria criada." });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse(new AppError("Já existe uma categoria com este slug.", 409));
    }
    return errorResponse(error);
  }
}
